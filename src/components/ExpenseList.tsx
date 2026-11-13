import React, { useMemo, useState } from 'react';
import {
  Utensils,
  BedDouble,
  TrainFront,
  Ticket,
  ShoppingBag,
  Receipt,
  Search,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CurrencyCode,
  Expense,
  ExpenseCategory,
  Trip,
} from '../types/splitnpay';
import {
  CURRENCY_META,
  SUPPORTED_CURRENCIES,
  getEffectiveExpenseRate,
  getExpenseHomeAmount,
} from '../utils/currency';
import { computeExpenseSharesHome } from '../utils/settlements';
import { MoneyText } from './MoneyText';

interface ExpenseListProps {
  trip: Trip;
  expenses: Expense[];
  activeViewerId: string;
  onAddExpense: () => void;
  onOpenSmartReceipt: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const CATEGORY_STYLES: Record<
  ExpenseCategory,
  { icon: React.ComponentType<{ className?: string }>; bg: string; text: string }
> = {
  'Food & Dining': {
    icon: Utensils,
    bg: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-orange-500/20',
    text: 'text-white',
  },
  'Stay & Lodging': {
    icon: BedDouble,
    bg: 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-500/20',
    text: 'text-white',
  },
  Transport: {
    icon: TrainFront,
    bg: 'bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm shadow-sky-500/20',
    text: 'text-white',
  },
  Activities: {
    icon: Ticket,
    bg: 'bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-sm shadow-purple-500/20',
    text: 'text-white',
  },
  Shopping: {
    icon: ShoppingBag,
    bg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-sm shadow-rose-500/20',
    text: 'text-white',
  },
  Other: {
    icon: Receipt,
    bg: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm shadow-teal-500/20',
    text: 'text-white',
  },
};

function formatShortDate(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  trip,
  expenses,
  activeViewerId,
  onAddExpense,
  onOpenSmartReceipt,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | CurrencyCode>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedReceiptIds, setExpandedReceiptIds] = useState<Record<string, boolean>>({});

  const memberMap = useMemo(
    () => new Map(trip.members.map((m) => [m.id, m])),
    [trip.members]
  );

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...expenses]
      .filter((e) => {
        if (currencyFilter !== 'ALL' && e.currency !== currencyFilter) return false;
        if (!q) return true;
        const payerName = memberMap.get(e.paidById)?.name.toLowerCase() ?? '';
        const itemMatch =
          e.receiptBreakdown?.items.some((it) => it.name.toLowerCase().includes(q)) ?? false;
        return (
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          payerName.includes(q) ||
          e.currency.toLowerCase().includes(q) ||
          itemMatch
        );
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt - a.createdAt;
      });
  }, [expenses, currencyFilter, searchQuery, memberMap]);

  const toggleReceiptDetails = (id: string) => {
    setExpandedReceiptIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="glass-surface rounded-3xl overflow-hidden">
      {/* Toolbar Header */}
      <div className="p-5 sm:p-6 border-b border-white/70 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#0F172A]">
              Expenses &amp; Receipts
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Multi-currency bills convert automatically into {trip.homeCurrency}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSmartReceipt}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Receipt</span>
          </button>
        </div>

        {/* Search & Currency Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bills, items, categories, or payers..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/65 border border-white/80 text-sm text-[#0F172A] placeholder:text-slate-500 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            />
          </div>

          <div
            className="inline-flex items-center gap-1 p-1 bg-white/55 border border-white/80 rounded-full overflow-x-auto max-w-full shrink-0"
            role="group"
            aria-label="Filter expenses by bill currency"
          >
            <button
              type="button"
              onClick={() => setCurrencyFilter('ALL')}
              className={`px-3 py-1 min-h-[30px] rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                currencyFilter === 'ALL'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#0F172A] hover:bg-white/70'
              }`}
            >
              All
            </button>
            {SUPPORTED_CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrencyFilter(code)}
                className={`px-2.5 py-1 min-h-[30px] rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  currencyFilter === code
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-slate-700 hover:text-[#0F172A] hover:bg-white/70'
                }`}
              >
                {CURRENCY_META[code].symbol} {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expense Feed */}
      {filteredExpenses.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 inline-flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">
            {expenses.length === 0 ? 'No bills logged yet' : 'No matching bills found'}
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
            {expenses.length === 0
              ? `Log a bill manually or paste a messy receipt with Smart Receipt to split items in ${trip.homeCurrency}.`
              : 'Try clearing the search query or currency filter.'}
          </p>
          {expenses.length === 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onOpenSmartReceipt}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#005137] border border-emerald-200 text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Paste Smart Receipt</span>
              </button>
              <button
                type="button"
                onClick={onAddExpense}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-[#006948] hover:bg-[#005137] text-white text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Bill</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-200/50">
          {filteredExpenses.map((expense) => {
            const catStyle = CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.Other;
            const Icon = catStyle.icon;
            const payer = memberMap.get(expense.paidById);
            const homeAmount = getExpenseHomeAmount(expense, trip.homeCurrency, trip.fxRates);
            const effectiveRate = getEffectiveExpenseRate(
              expense,
              trip.homeCurrency,
              trip.fxRates
            );
            const isForeign = expense.currency !== trip.homeCurrency;

            const shares = computeExpenseSharesHome(expense, trip.homeCurrency, trip);
            const viewerShare = shares[activeViewerId] ?? 0;
            const viewerPaid = expense.paidById === activeViewerId ? homeAmount : 0;
            const viewerNetForBill = viewerPaid - viewerShare;

            const hasReceipt = Boolean(
              expense.receiptBreakdown && expense.receiptBreakdown.items.length > 0
            );
            const isExpanded = Boolean(expandedReceiptIds[expense.id]);

            return (
              <li
                key={expense.id}
                className="px-4 sm:px-6 py-4 hover:bg-white/55 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  {/* Left: Category Icon + Title + Unboxed Metadata */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${catStyle.bg} ${catStyle.text}`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-[#0F172A] leading-snug truncate">
                        {expense.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600">
                        <span>{expense.category}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span>{formatShortDate(expense.date)}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span>
                          Paid by{' '}
                          <strong className="font-semibold text-[#0F172A]">
                            {payer?.name ?? 'Unknown'}
                          </strong>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span>
                          {expense.participantIds.length}{' '}
                          {expense.participantIds.length === 1 ? 'person' : 'people'}
                        </span>
                      </div>

                      {/* Viewer personal impact + optional Itemized breakdown toggle */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {Math.abs(viewerNetForBill) >= 0.01 && (
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              viewerNetForBill > 0 ? 'text-[#006948]' : 'text-[#BA0035]'
                            }`}
                          >
                            {viewerNetForBill > 0 ? 'You lent ' : 'Your share '}
                            <MoneyText
                              amount={Math.abs(viewerNetForBill)}
                              currency={trip.homeCurrency}
                            />
                          </span>
                        )}

                        {hasReceipt && (
                          <button
                            type="button"
                            onClick={() => toggleReceiptDetails(expense.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#006948] transition-colors"
                          >
                            <span>
                              Itemized ({expense.receiptBreakdown!.items.length} items)
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amounts + Actions */}
                  <div className="flex items-start gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <MoneyText
                        amount={homeAmount}
                        currency={trip.homeCurrency}
                        className="text-[15px] sm:text-base font-extrabold text-[#0F172A]"
                      />
                      {isForeign && (
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                          <MoneyText
                            amount={expense.amount}
                            currency={expense.currency}
                            showCode
                          />{' '}
                          <span className="text-slate-500 font-medium">
                            @{effectiveRate.toFixed(effectiveRate >= 10 ? 2 : 4)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onEditExpense(expense)}
                        aria-label={`Edit ${expense.title}`}
                        className="min-h-[38px] min-w-[38px] rounded-lg text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 inline-flex items-center justify-center transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === expense.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(expense.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1.5 min-h-[34px] rounded-full bg-[#E11D48] text-white text-xs font-semibold hover:bg-[#BA0035] transition-colors whitespace-nowrap"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 min-h-[34px] rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(expense.id)}
                          aria-label={`Delete ${expense.title}`}
                          className="min-h-[38px] min-w-[38px] rounded-lg text-slate-500 hover:text-[#BA0035] hover:bg-rose-50 inline-flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Itemized Receipt Breakdown */}
                {hasReceipt && isExpanded && expense.receiptBreakdown && (
                  <div className="mt-3 ml-13 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-3.5 space-y-2 text-xs shadow-xs">
                    <div className="divide-y divide-slate-200/70">
                      {expense.receiptBreakdown.items.map((item) => {
                        const claimants = item.claimantIds
                          .map((id) => memberMap.get(id)?.name)
                          .filter(Boolean)
                          .join(', ');
                        return (
                          <div
                            key={item.id}
                            className="py-1.5 first:pt-0 last:pb-0 flex items-baseline justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-[#0F172A]">
                                {item.quantity > 1 ? `${item.quantity}× ` : ''}
                                {item.name}
                              </span>
                              <span className="ml-2 text-slate-600">
                                {claimants || 'Unassigned'}
                              </span>
                            </div>
                            <span className="font-semibold text-[#0F172A] tabular-nums shrink-0">
                              <MoneyText
                                amount={item.totalPrice}
                                currency={expense.currency}
                              />
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {(expense.receiptBreakdown.tax > 0 ||
                      expense.receiptBreakdown.tip > 0 ||
                      expense.receiptBreakdown.discount > 0) && (
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-600 tabular-nums">
                        <div className="flex flex-wrap gap-3">
                          {expense.receiptBreakdown.tax > 0 && (
                            <span>
                              Tax:{' '}
                              <MoneyText
                                amount={expense.receiptBreakdown.tax}
                                currency={expense.currency}
                              />
                            </span>
                          )}
                          {expense.receiptBreakdown.tip > 0 && (
                            <span>
                              Tip:{' '}
                              <MoneyText
                                amount={expense.receiptBreakdown.tip}
                                currency={expense.currency}
                              />
                            </span>
                          )}
                          {expense.receiptBreakdown.discount > 0 && (
                            <span>
                              Discount: -
                              <MoneyText
                                amount={expense.receiptBreakdown.discount}
                                currency={expense.currency}
                              />
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500">Proportional split</span>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
