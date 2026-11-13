import {
  CurrencyCode,
  ExpenseSplit,
  Member,
  ReceiptItem,
} from '../types/splitnpay';
import { getCurrencyDecimals, roundCurrency } from './currency';

export interface MemberReceiptShare {
  memberId: string;
  itemsSubtotal: number;
  taxShare: number;
  tipShare: number;
  discountShare: number;
  totalShare: number;
}

export interface ReceiptCalculationResult {
  itemsSubtotal: number;
  claimedSubtotal: number;
  unclaimedSubtotal: number;
  unclaimedCount: number;
  grandTotal: number;
  memberShares: MemberReceiptShare[];
  participantIds: string[];
  exactSplits: ExpenseSplit[];
}

/**
 * Calculates each member's itemized subtotal plus proportional tax, tip, and discount
 * in the receipt's native currency, distributing rounding remainders deterministically
 * so the sum of member shares equals the grand total of claimed items + extras.
 */
export function calculateReceiptShares(
  items: ReceiptItem[],
  tax: number,
  tip: number,
  discount: number,
  members: Member[],
  currency: CurrencyCode
): ReceiptCalculationResult {
  const memberIds = new Set(members.map((m) => m.id));
  const rawSubtotals = new Map<string, number>();
  for (const m of members) {
    rawSubtotals.set(m.id, 0);
  }

  let itemsSubtotal = 0;
  let claimedSubtotal = 0;
  let unclaimedSubtotal = 0;
  let unclaimedCount = 0;

  for (const item of items) {
    const price = Math.max(0, Number(item.totalPrice) || 0);
    itemsSubtotal += price;
    const validClaimants = item.claimantIds.filter((id) => memberIds.has(id));

    if (validClaimants.length === 0) {
      unclaimedSubtotal += price;
      unclaimedCount += 1;
      continue;
    }

    claimedSubtotal += price;
    const perClaimant = price / validClaimants.length;
    for (const id of validClaimants) {
      rawSubtotals.set(id, (rawSubtotals.get(id) ?? 0) + perClaimant);
    }
  }

  const safeTax = Math.max(0, Number(tax) || 0);
  const safeTip = Math.max(0, Number(tip) || 0);
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const grandTotal = roundCurrency(
    Math.max(0, itemsSubtotal + safeTax + safeTip - safeDiscount),
    currency
  );

  const activeMembers = members.filter((m) => (rawSubtotals.get(m.id) ?? 0) > 0);
  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);

  // Target total for claimed portion (if everything is claimed, equals grandTotal)
  const claimedRatio = itemsSubtotal > 0 ? claimedSubtotal / itemsSubtotal : 0;
  const claimedTargetTotal =
    unclaimedCount === 0
      ? grandTotal
      : roundCurrency(
          Math.max(
            0,
            claimedSubtotal + (safeTax + safeTip - safeDiscount) * claimedRatio
          ),
          currency
        );

  const memberShares: MemberReceiptShare[] = [];

  if (activeMembers.length > 0 && claimedSubtotal > 0) {
    const targetUnits = Math.round(claimedTargetTotal * factor);
    const exactTotals = activeMembers.map((m) => {
      const sub = rawSubtotals.get(m.id) ?? 0;
      const ratio = sub / claimedSubtotal;
      const taxShare = safeTax * claimedRatio * ratio;
      const tipShare = safeTip * claimedRatio * ratio;
      const discountShare = safeDiscount * claimedRatio * ratio;
      const exactTotal = Math.max(0, sub + taxShare + tipShare - discountShare);
      return {
        memberId: m.id,
        sub,
        taxShare,
        tipShare,
        discountShare,
        floorUnits: Math.floor(exactTotal * factor),
        remainderFrac: exactTotal * factor - Math.floor(exactTotal * factor),
      };
    });

    const assignedUnits = exactTotals.reduce((acc, x) => acc + x.floorUnits, 0);
    let diff = targetUnits - assignedUnits;

    // Distribute remaining minor units to members with largest fractional parts
    const byFraction = [...exactTotals].sort(
      (a, b) => b.remainderFrac - a.remainderFrac
    );
    let idx = 0;
    while (diff > 0 && byFraction.length > 0) {
      byFraction[idx % byFraction.length].floorUnits += 1;
      diff -= 1;
      idx += 1;
    }
    while (diff < 0 && byFraction.length > 0) {
      const target = byFraction[idx % byFraction.length];
      if (target.floorUnits > 0) {
        target.floorUnits -= 1;
        diff += 1;
      }
      idx += 1;
      if (idx > byFraction.length * 4) break;
    }

    for (const m of members) {
      const found = exactTotals.find((x) => x.memberId === m.id);
      if (found) {
        memberShares.push({
          memberId: m.id,
          itemsSubtotal: roundCurrency(found.sub, currency),
          taxShare: roundCurrency(found.taxShare, currency),
          tipShare: roundCurrency(found.tipShare, currency),
          discountShare: roundCurrency(found.discountShare, currency),
          totalShare: found.floorUnits / factor,
        });
      } else {
        memberShares.push({
          memberId: m.id,
          itemsSubtotal: 0,
          taxShare: 0,
          tipShare: 0,
          discountShare: 0,
          totalShare: 0,
        });
      }
    }
  } else {
    for (const m of members) {
      memberShares.push({
        memberId: m.id,
        itemsSubtotal: 0,
        taxShare: 0,
        tipShare: 0,
        discountShare: 0,
        totalShare: 0,
      });
    }
  }

  const participatingShares = memberShares.filter((s) => s.totalShare > 0);
  const participantIds = participatingShares.map((s) => s.memberId);
  const exactSplits: ExpenseSplit[] = participatingShares.map((s) => ({
    memberId: s.memberId,
    value: s.totalShare,
  }));

  return {
    itemsSubtotal: roundCurrency(itemsSubtotal, currency),
    claimedSubtotal: roundCurrency(claimedSubtotal, currency),
    unclaimedSubtotal: roundCurrency(unclaimedSubtotal, currency),
    unclaimedCount,
    grandTotal,
    memberShares,
    participantIds,
    exactSplits,
  };
}
