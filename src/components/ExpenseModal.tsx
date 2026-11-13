import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, ArrowRightLeft, Sparkles } from 'lucide-react';
import {
  CurrencyCode,
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  SplitMode,
  Trip,
} from '../types/splitnpay';
import {
  CURRENCY_META,
  SUPPORTED_CURRENCIES,
  convertAmount,
  getCurrencySymbol,
  getExchangeRate,
} from '../utils/currency';
import { MemberAvatar } from './MemberAvatar';
import { MoneyText } from './MoneyText';

interface ExpenseModalProps {
  isOpen: boolean;
  trip: Trip;
  activeViewerId: string;
  editingExpense: Expense | null;
  onClose: () => void;
  onSave: (data: Omit<Expense, 'id' | 'createdAt'>, editingId?: string) => void;
  onSwitchToSmartReceipt?: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Food & Dining',
  'Stay & Lodging',
  'Transport',
  'Activities',
  'Shopping',
  'Other',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  trip,
  activeViewerId,
  editingExpense,
  onClose,
  onSave,
  onSwitchToSmartReceipt,
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(trip.homeCurrency);
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paidById, setPaidById] = useState(activeViewerId || trip.members[0]?.id || '');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [participantIds, setParticipantIds] = useState<string[]>(
    trip.members.map((m) => m.id)
  );
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRateStr, setCustomRateStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');

    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmountStr(String(editingExpense.amount));
      setCurrency(editingExpense.currency);
      setCategory(editingExpense.category);
      setDate(editingExpense.date);
      setPaidById(editingExpense.paidById);
      setSplitMode(editingExpense.splitMode);
      setParticipantIds(
        editingExpense.participantIds.length > 0
          ? editingExpense.participantIds
          : trip.members.map((m) => m.id)
      );

      const inputMap: Record<string, string> = {};
      for (const s of editingExpense.splits) {
        inputMap[s.memberId] = String(s.value);
      }
      setSplitInputs(inputMap);

      if (
        editingExpense.customRate &&
        editingExpense.customRate.targetCurrency === trip.homeCurrency
      ) {
        setUseCustomRate(true);
        setCustomRateStr(String(editingExpense.customRate.rate));
      } else {
        setUseCustomRate(false);
        const defaultRate = getExchangeRate(
          editingExpense.currency,
          trip.homeCurrency,
          trip.fxRates
        );
        setCustomRateStr(defaultRate.toFixed(defaultRate >= 10 ? 2 : 4));
      }
    } else {
      setTitle('');
      setAmountStr('');
      setCurrency(trip.homeCurrency);
      setCategory('Food & Dining');
      setDate(new Date().toISOString().slice(0, 10));
      setPaidById(activeViewerId || trip.members[0]?.id || '');
      setSplitMode('equal');
      setParticipantIds(trip.members.map((m) => m.id));
      setSplitInputs({});
      setUseCustomRate(false);
      setCustomRateStr('1');
    }
  }, [isOpen, editingExpense, trip, activeViewerId]);

  const numericAmount = parseFloat(amountStr) || 0;
  const defaultRate = useMemo(
    () => getExchangeRate(currency, trip.homeCurrency, trip.fxRates),
    [currency, trip.homeCurrency, trip.fxRates]
  );

  const activeCustomRate =
    useCustomRate && currency !== trip.homeCurrency && parseFloat(customRateStr) > 0
      ? { rate: parseFloat(customRateStr), targetCurrency: trip.homeCurrency }
      : undefined;

  const convertedHomeAmount = useMemo(
    () =>
      convertAmount(
        numericAmount,
        currency,
        trip.homeCurrency,
        trip.fxRates,
        activeCustomRate
      ),
    [numericAmount, currency, trip.homeCurrency, trip.fxRates, activeCustomRate]
  );

  const handleCurrencyChange = (nextCurrency: CurrencyCode) => {
    setCurrency(nextCurrency);
    setUseCustomRate(false);
    const rate = getExchangeRate(nextCurrency, trip.homeCurrency, trip.fxRates);
    setCustomRateStr(rate.toFixed(rate >= 10 ? 2 : 4));
  };

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length === 1) return prev; // Keep at least 1 participant
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const perPersonEqualHome =
    participantIds.length > 0 ? convertedHomeAmount / participantIds.length : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a bill description.');
      return;
    }
    if (numericAmount <= 0) {
      setErrorMsg('Please enter a valid bill amount greater than 0.');
      return;
    }
    if (participantIds.length === 0) {
      setErrorMsg('Select at least one person to split this bill.');
      return;
    }

    let splits: ExpenseSplit[] = [];
    if (splitMode === 'exact') {
      splits = participantIds.map((id) => ({
        memberId: id,
        value: Math.max(0, parseFloat(splitInputs[id] || '0') || 0),
      }));
      const total = splits.reduce((sum, s) => sum + s.value, 0);
      if (Math.abs(total - numericAmount) > 0.5) {
        setErrorMsg(
          `Exact amounts must sum to ${getCurrencySymbol(currency)}${numericAmount.toFixed(
            CURRENCY_META[currency].decimals
          )} (currently ${getCurrencySymbol(currency)}${total.toFixed(
            CURRENCY_META[currency].decimals
          )}).`
        );
        return;
      }
    } else if (splitMode === 'percent') {
      splits = participantIds.map((id) => ({
        memberId: id,
        value: Math.max(0, parseFloat(splitInputs[id] || '0') || 0),
      }));
      const totalPct = splits.reduce((sum, s) => sum + s.value, 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        setErrorMsg(`Percentages must sum to 100% (currently ${totalPct.toFixed(1)}%).`);
        return;
      }
    }

    onSave(
      {
        tripId: trip.id,
        title: title.trim(),
        category,
        date,
        amount: numericAmount,
        currency,
        paidById,
        splitMode,
        participantIds,
        splits,
        customRate: activeCustomRate,
      },
      editingExpense?.id
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet / Dialog */}
      <div className="relative z-10 w-full sm:max-w-lg glass-modal rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="w-9 h-1 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-slate-200/60 flex items-center justify-between shrink-0">
          <div>
            <h2
              id="expense-modal-title"
              className="text-lg font-bold tracking-tight text-[#0F172A]"
            >
              {editingExpense ? 'Edit Bill' : 'Log New Bill'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Trip home currency: {trip.homeCurrency} ({CURRENCY_META[trip.homeCurrency].symbol})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[40px] min-w-[40px] rounded-full text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 inline-flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {!editingExpense && onSwitchToSmartReceipt && (
            <button
              type="button"
              onClick={onSwitchToSmartReceipt}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-500/12 via-violet-500/10 to-fuchsia-500/10 hover:from-indigo-500/18 hover:to-violet-500/18 border border-indigo-300/60 text-left transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-indigo-950">
                    Have a messy receipt or chat note?
                  </p>
                  <p className="text-[11px] font-medium text-indigo-800/80 truncate">
                    Paste it to extract items, tax &amp; tip automatically
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-700 whitespace-nowrap shrink-0">
                Smart Receipt →
              </span>
            </button>
          )}

          {/* Bill Currency Selector + Oversized Amount Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-600">
                Bill Currency &amp; Amount
              </label>
              <div
                className="inline-flex items-center gap-1 p-1 bg-white/60 border border-white/80 rounded-full shadow-xs"
                role="group"
                aria-label="Select bill currency"
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleCurrencyChange(code)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                      currency === code
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    {CURRENCY_META[code].symbol} {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/75 border border-white/85 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-xs">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] select-none">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step={currency === 'JPY' ? '1' : '0.01'}
                min="0"
                placeholder={currency === 'JPY' ? '0' : '0.00'}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#0F172A] placeholder:text-slate-300 focus:outline-none tabular-nums"
              />
              <span className="text-xs font-bold text-slate-400 shrink-0">{currency}</span>
            </div>

            {/* Live Automatic Home Currency Conversion Bar */}
            {currency !== trip.homeCurrency && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/35 px-3.5 py-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#064E3B]">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#059669]" />
                    Converted to {trip.homeCurrency}:
                    <strong className="font-bold text-[#059669] tabular-nums">
                      <MoneyText
                        amount={convertedHomeAmount}
                        currency={trip.homeCurrency}
                      />
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!useCustomRate) {
                        setCustomRateStr(defaultRate.toFixed(defaultRate >= 10 ? 2 : 4));
                      }
                      setUseCustomRate((v) => !v);
                    }}
                    className="text-[11px] font-semibold text-[#006948] hover:underline whitespace-nowrap"
                  >
                    {useCustomRate ? 'Use trip rate' : 'Custom rate'}
                  </button>
                </div>

                {useCustomRate ? (
                  <div className="flex items-center gap-2 text-xs text-slate-700 pt-1 border-t border-emerald-200/60">
                    <span>1 {currency} =</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={customRateStr}
                      onChange={(e) => setCustomRateStr(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg bg-white border border-emerald-300 text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#006948]"
                    />
                    <span>{trip.homeCurrency}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-800/80 tabular-nums">
                    Rate: 1 {currency} = {defaultRate.toFixed(defaultRate >= 10 ? 2 : 4)}{' '}
                    {trip.homeCurrency}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="bill-title"
              className="block text-xs font-semibold text-slate-600 mb-1.5"
            >
              Description
            </label>
            <input
              id="bill-title"
              type="text"
              placeholder="e.g., Shibuya Ramen Dinner, Taxi to Airport"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white/75 border border-slate-200/80 text-sm text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="bill-category"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Category
              </label>
              <select
                id="bill-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full h-11 px-3 rounded-xl bg-white/75 border border-slate-200/80 text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bill-date"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Date
              </label>
              <input
                id="bill-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-white/75 border border-slate-200/80 text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Paid by
            </label>
            <div className="flex flex-wrap gap-2">
              {trip.members.map((m) => {
                const selected = paidById === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidById(m.id)}
                    className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 min-h-[38px] rounded-full border text-xs font-semibold transition-all ${
                      selected
                        ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-transparent shadow-sm'
                        : 'bg-white/75 text-slate-700 border-white/85 hover:bg-white'
                    }`}
                  >
                    <MemberAvatar name={m.name} color={m.color} size="xs" />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Mode & Participants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">Split between</span>
              <div className="inline-flex items-center gap-1 p-1 bg-white/60 border border-white/80 rounded-full shadow-xs">
                {(
                  [
                    { id: 'equal', label: 'Equal' },
                    { id: 'exact', label: `Exact (${currency})` },
                    { id: 'percent', label: 'Percent %' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSplitMode(mode.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                      splitMode === mode.id
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/85 bg-white/65 divide-y divide-slate-200/50 overflow-hidden shadow-xs">
              {trip.members.map((m) => {
                const included = participantIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-transparent"
                  >
                    <button
                      type="button"
                      onClick={() => toggleParticipant(m.id)}
                      className="flex items-center gap-2.5 min-h-[36px] text-left flex-1 min-w-0"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          included
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent text-white shadow-xs'
                            : 'border-slate-300 bg-white/80'
                        }`}
                      >
                        {included && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </span>
                      <MemberAvatar name={m.name} color={m.color} size="xs" />
                      <span className="text-sm font-medium text-[#0F172A] truncate">
                        {m.name}
                      </span>
                    </button>

                    {included && splitMode === 'equal' && (
                      <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                        <MoneyText
                          amount={perPersonEqualHome}
                          currency={trip.homeCurrency}
                        />
                      </span>
                    )}

                    {included && splitMode !== 'equal' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {splitMode === 'exact' && (
                          <span className="text-xs text-slate-400">
                            {getCurrencySymbol(currency)}
                          </span>
                        )}
                        <input
                          type="number"
                          step={splitMode === 'percent' ? '0.1' : '0.01'}
                          min="0"
                          placeholder="0"
                          value={splitInputs[m.id] ?? ''}
                          onChange={(e) =>
                            setSplitInputs((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          className="w-20 h-8 px-2 rounded-lg border border-slate-200 text-right text-xs font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:border-[#006948]"
                        />
                        {splitMode === 'percent' && (
                          <span className="text-xs text-slate-400">%</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-[#E11D48] bg-[#FFF1F2] px-3.5 py-2.5 rounded-xl">
              {errorMsg}
            </p>
          )}

          {/* Submit Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-full bg-white/70 border border-slate-200/80 text-sm font-semibold text-slate-700 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 min-h-[44px] rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/25 transition-all active:scale-[0.98]"
            >
              {editingExpense ? 'Save Changes' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
