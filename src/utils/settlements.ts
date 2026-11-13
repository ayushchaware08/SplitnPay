import {
  CurrencyCode,
  Expense,
  MemberBalance,
  Settlement,
  TransferSuggestion,
  Trip,
} from '../types/splitnpay';
import {
  convertAmount,
  getCurrencyDecimals,
  getExpenseHomeAmount,
  roundCurrency,
} from './currency';

/**
 * Computes each participant's share of an expense in the trip's home currency.
 * Remainder cents/yen from rounding are distributed deterministically to the first participants.
 */
export function computeExpenseSharesHome(
  expense: Expense,
  homeCurrency: CurrencyCode,
  trip: Trip
): Record<string, number> {
  const totalHome = getExpenseHomeAmount(expense, homeCurrency, trip.fxRates);
  const decimals = getCurrencyDecimals(homeCurrency);
  const unit = Math.pow(10, decimals);
  const totalUnits = Math.round(totalHome * unit);

  const participants = expense.participantIds.filter((id) =>
    trip.members.some((m) => m.id === id)
  );
  if (participants.length === 0) return {};

  const resultUnits: Record<string, number> = {};
  for (const id of participants) {
    resultUnits[id] = 0;
  }

  if (expense.splitMode === 'equal') {
    const base = Math.floor(totalUnits / participants.length);
    let remainder = totalUnits - base * participants.length;
    for (const id of participants) {
      resultUnits[id] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
  } else if (expense.splitMode === 'percent') {
    const splitMap = new Map(expense.splits.map((s) => [s.memberId, s.value]));
    let assigned = 0;
    const rawPercents = participants.map((id) => Math.max(0, splitMap.get(id) ?? 0));
    const sumPercent = rawPercents.reduce((a, b) => a + b, 0) || 100;

    participants.forEach((id, idx) => {
      const share = Math.floor((totalUnits * rawPercents[idx]) / sumPercent);
      resultUnits[id] = share;
      assigned += share;
    });
    let remainder = totalUnits - assigned;
    let i = 0;
    while (remainder > 0 && participants.length > 0) {
      resultUnits[participants[i % participants.length]] += 1;
      remainder -= 1;
      i += 1;
    }
  } else {
    // exact amounts in expense.currency
    const splitMap = new Map(expense.splits.map((s) => [s.memberId, Math.max(0, s.value)]));
    const totalExactBill = participants.reduce((sum, id) => sum + (splitMap.get(id) ?? 0), 0);
    const divisor = totalExactBill > 0 ? totalExactBill : 1;

    let assigned = 0;
    participants.forEach((id) => {
      const exactVal = splitMap.get(id) ?? 0;
      const share =
        totalExactBill > 0
          ? Math.floor((totalUnits * exactVal) / divisor)
          : Math.floor(totalUnits / participants.length);
      resultUnits[id] = share;
      assigned += share;
    });
    let remainder = totalUnits - assigned;
    let i = 0;
    while (remainder > 0 && participants.length > 0) {
      resultUnits[participants[i % participants.length]] += 1;
      remainder -= 1;
      i += 1;
    }
  }

  const sharesHome: Record<string, number> = {};
  for (const [id, units] of Object.entries(resultUnits)) {
    sharesHome[id] = units / unit;
  }
  return sharesHome;
}

export function calculateMemberBalances(
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[]
): MemberBalance[] {
  const map = new Map<string, MemberBalance>();

  for (const m of trip.members) {
    map.set(m.id, {
      memberId: m.id,
      totalPaidHome: 0,
      totalShareHome: 0,
      settledPaidHome: 0,
      settledReceivedHome: 0,
      netHome: 0,
    });
  }

  for (const exp of expenses) {
    if (exp.tripId !== trip.id) continue;
    const totalHome = getExpenseHomeAmount(exp, trip.homeCurrency, trip.fxRates);
    const payer = map.get(exp.paidById);
    if (payer) {
      payer.totalPaidHome = roundCurrency(payer.totalPaidHome + totalHome, trip.homeCurrency);
    }

    const shares = computeExpenseSharesHome(exp, trip.homeCurrency, trip);
    for (const [memberId, shareHome] of Object.entries(shares)) {
      const entry = map.get(memberId);
      if (entry) {
        entry.totalShareHome = roundCurrency(entry.totalShareHome + shareHome, trip.homeCurrency);
      }
    }
  }

  for (const st of settlements) {
    if (st.tripId !== trip.id) continue;
    const amountHome = convertAmount(st.amount, st.currency, trip.homeCurrency, trip.fxRates);
    const from = map.get(st.fromMemberId);
    const to = map.get(st.toMemberId);
    if (from) {
      from.settledPaidHome = roundCurrency(from.settledPaidHome + amountHome, trip.homeCurrency);
    }
    if (to) {
      to.settledReceivedHome = roundCurrency(to.settledReceivedHome + amountHome, trip.homeCurrency);
    }
  }

  const balances: MemberBalance[] = [];
  for (const entry of map.values()) {
    const net =
      entry.totalPaidHome -
      entry.totalShareHome +
      entry.settledPaidHome -
      entry.settledReceivedHome;
    entry.netHome = roundCurrency(net, trip.homeCurrency);
    balances.push(entry);
  }

  return balances;
}

/**
 * Greedy minimum-transfer debt simplification algorithm.
 */
export function simplifyDebts(
  balances: MemberBalance[],
  homeCurrency: CurrencyCode
): TransferSuggestion[] {
  const decimals = getCurrencyDecimals(homeCurrency);
  const factor = Math.pow(10, decimals);
  const epsilonUnits = 1; // ignore 1 minor unit rounding dust only if 0; actually keep >= 1 unit

  const debtors: { memberId: string; units: number }[] = [];
  const creditors: { memberId: string; units: number }[] = [];

  for (const b of balances) {
    const units = Math.round(b.netHome * factor);
    if (units <= -epsilonUnits) {
      debtors.push({ memberId: b.memberId, units: Math.abs(units) });
    } else if (units >= epsilonUnits) {
      creditors.push({ memberId: b.memberId, units });
    }
  }

  debtors.sort((a, b) => b.units - a.units);
  creditors.sort((a, b) => b.units - a.units);

  const transfers: TransferSuggestion[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const payUnits = Math.min(debtor.units, creditor.units);

    if (payUnits > 0) {
      transfers.push({
        id: `${debtor.memberId}__${creditor.memberId}`,
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountHome: payUnits / factor,
      });
    }

    debtor.units -= payUnits;
    creditor.units -= payUnits;

    if (debtor.units === 0) i += 1;
    if (creditor.units === 0) j += 1;
  }

  return transfers;
}
