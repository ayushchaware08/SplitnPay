import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ReceiptText,
  Sparkles,
  Plus,
  Trash2,
  Users,
  ArrowRightLeft,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import {
  CurrencyCode,
  Expense,
  ExpenseCategory,
  ReceiptItem,
  Trip,
} from '../types/splitnpay';
import {
  CURRENCY_META,
  SUPPORTED_CURRENCIES,
  convertAmount,
  getCurrencySymbol,
} from '../utils/currency';
import { calculateReceiptShares } from '../utils/receiptSplit';
import { MemberAvatar } from './MemberAvatar';
import { MoneyText } from './MoneyText';

interface SmartReceiptModalProps {
  isOpen: boolean;
  trip: Trip;
  activeViewerId: string;
  editingExpense: Expense | null;
  onClose: () => void;
  onSave: (data: Omit<Expense, 'id' | 'createdAt'>, editingId?: string) => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Food & Dining',
  'Stay & Lodging',
  'Transport',
  'Activities',
  'Shopping',
  'Other',
];

const SAMPLE_RECEIPTS = [
  {
    label: 'Tokyo Izakaya Receipt',
    text: `Omoide Yokocho Izakaya - Shinjuku
2026-11-11
2x Wagyu Kushiyaki        ¥2,800
1x Sashimi Deluxe Platter ¥3,600
3x Asahi Draft Beer       ¥1,950
1x Matcha Yuzu Dessert    ¥850
Subtotal                  ¥9,200
Consumption Tax (10%)     ¥920
Table Service Charge      ¥600
Total                     ¥10,720`,
  },
  {
    label: 'Messy Chat Notes',
    text: `Dinner at Trattoria Roma tonight ($):
Aarav got the truffle pasta $28, Maya and Elena shared the burrata pizza $24 and tiramisu $14, Rohan had the grilled sea bass $34. Everyone split two carafes of house wine $42. Tax was $12.78 and I left $22 tip.`,
  },
  {
    label: 'Goa Cafe Tab',
    text: `Artjuna Cafe Anjuna
2 Iced Matcha Latte Rs 680
1 Avocado Sourdough Toast Rs 520
2 Fish Tacos Rs 960
1 Shakshuka Skillet Rs 490
GST 5% = 132.50
Service Charge = 265`,
  },
];

export const SmartReceiptModal: React.FC<SmartReceiptModalProps> = ({
  isOpen,
  trip,
  activeViewerId,
  editingExpense,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState<'paste' | 'review'>('paste');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Editable receipt fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<CurrencyCode>(trip.homeCurrency);
  const [paidById, setPaidById] = useState(activeViewerId || trip.members[0]?.id || '');
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [taxStr, setTaxStr] = useState('0');
  const [tipStr, setTipStr] = useState('0');
  const [discountStr, setDiscountStr] = useState('0');
  const [aiNotes, setAiNotes] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setParseError('');
    setSaveError('');
    setIsParsing(false);

    if (editingExpense?.receiptBreakdown) {
      const rb = editingExpense.receiptBreakdown;
      setStep('review');
      setRawText(rb.rawText ?? '');
      setTitle(editingExpense.title);
      setCategory(editingExpense.category);
      setDate(editingExpense.date);
      setCurrency(editingExpense.currency);
      setPaidById(editingExpense.paidById);
      setItems(
        rb.items.map((it) => ({
          ...it,
          claimantIds: [...it.claimantIds],
        }))
      );
      setTaxStr(String(rb.tax));
      setTipStr(String(rb.tip));
      setDiscountStr(String(rb.discount));
      setAiNotes(editingExpense.notes ?? '');
    } else {
      setStep('paste');
      setRawText('');
      setTitle('');
      setCategory('Food & Dining');
      setDate(new Date().toISOString().slice(0, 10));
      setCurrency(trip.homeCurrency);
      setPaidById(activeViewerId || trip.members[0]?.id || '');
      setItems([]);
      setTaxStr('0');
      setTipStr('0');
      setDiscountStr('0');
      setAiNotes('');
    }
  }, [isOpen, editingExpense, trip, activeViewerId]);

  const taxNum = Math.max(0, parseFloat(taxStr) || 0);
  const tipNum = Math.max(0, parseFloat(tipStr) || 0);
  const discountNum = Math.max(0, parseFloat(discountStr) || 0);

  const calculation = useMemo(
    () =>
      calculateReceiptShares(
        items,
        taxNum,
        tipNum,
        discountNum,
        trip.members,
        currency
      ),
    [items, taxNum, tipNum, discountNum, trip.members, currency]
  );

  const grandTotalHome = useMemo(
    () => convertAmount(calculation.grandTotal, currency, trip.homeCurrency, trip.fxRates),
    [calculation.grandTotal, currency, trip.homeCurrency, trip.fxRates]
  );

  const matchClaimantsByName = (suggested: string[]): string[] => {
    if (!suggested || suggested.length === 0) return [];
    const matchedIds: string[] = [];
    for (const name of suggested) {
      const lower = name.trim().toLowerCase();
      if (!lower) continue;
      if (lower === 'all' || lower === 'everyone') {
        return trip.members.map((m) => m.id);
      }
      const member = trip.members.find(
        (m) =>
          m.name.toLowerCase() === lower ||
          m.name.toLowerCase().includes(lower) ||
          lower.includes(m.name.toLowerCase())
      );
      if (member && !matchedIds.includes(member.id)) {
        matchedIds.push(member.id);
      }
    }
    return matchedIds;
  };

  const handleExtract = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (rawText.trim().length < 3) {
      setParseError('Paste a restaurant receipt or group chat note first.');
      return;
    }

    setIsParsing(true);
    setParseError('');

    try {
      const response = await fetch('/api/receipts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          defaultCurrency: trip.homeCurrency,
          memberNames: trip.members.map((m) => m.name),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not extract receipt items.');
      }

      const allMemberIds = trip.members.map((m) => m.id);
      const parsedItems: ReceiptItem[] = Array.isArray(data.items)
        ? data.items.map((it: {
            id?: string;
            name?: string;
            quantity?: number;
            totalPrice?: number;
            suggestedClaimants?: string[];
          }, idx: number) => {
            const matched = matchClaimantsByName(it.suggestedClaimants ?? []);
            return {
              id: it.id || `rcp-${Date.now()}-${idx}`,
              name: it.name || `Item ${idx + 1}`,
              quantity: Math.max(1, Number(it.quantity) || 1),
              totalPrice: Math.max(0, Number(it.totalPrice) || 0),
              // If Gemini didn't detect specific claimants, leave pre-selected for all or empty?
              // Pre-selecting all members makes quick unchecking fast, OR if chat matched some, use matched!
              claimantIds: matched.length > 0 ? matched : [...allMemberIds],
            };
          })
        : [];

      if (parsedItems.length === 0) {
        parsedItems.push({
          id: `rcp-${Date.now()}-0`,
          name: data.title || 'Shared Bill Item',
          quantity: 1,
          totalPrice: 0,
          claimantIds: [...allMemberIds],
        });
      }

      setTitle(data.title || 'Parsed Receipt');
      setCategory(data.category || 'Food & Dining');
      setDate(data.date || new Date().toISOString().slice(0, 10));
      setCurrency(data.currency || trip.homeCurrency);
      setItems(parsedItems);
      setTaxStr(String(Number(data.tax) || 0));
      setTipStr(String(Number(data.tip) || 0));
      setDiscountStr(String(Number(data.discount) || 0));
      setAiNotes(data.notes || '');
      setStep('review');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to parse receipt. Please retry.';
      setParseError(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const toggleItemClaimant = (itemId: string, memberId: string) => {
    setSaveError('');
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const exists = it.claimantIds.includes(memberId);
        return {
          ...it,
          claimantIds: exists
            ? it.claimantIds.filter((id) => id !== memberId)
            : [...it.claimantIds, memberId],
        };
      })
    );
  };

  const setItemAllClaimants = (itemId: string, assignAll: boolean) => {
    setSaveError('');
    const allIds = trip.members.map((m) => m.id);
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, claimantIds: assignAll ? allIds : [] } : it
      )
    );
  };

  const assignUnclaimedToAll = () => {
    const allIds = trip.members.map((m) => m.id);
    setItems((prev) =>
      prev.map((it) =>
        it.claimantIds.length === 0 ? { ...it, claimantIds: allIds } : it
      )
    );
  };

  const handleUpdateItem = (
    itemId: string,
    patch: Partial<Pick<ReceiptItem, 'name' | 'quantity' | 'totalPrice'>>
  ) => {
    setSaveError('');
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it))
    );
  };

  const handleAddBlankItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `rcp-${Date.now()}-${prev.length}`,
        name: '',
        quantity: 1,
        totalPrice: 0,
        claimantIds: trip.members.map((m) => m.id),
      },
    ]);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleSaveReceiptExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');

    if (!title.trim()) {
      setSaveError('Please enter a bill title.');
      return;
    }
    if (items.length === 0 || calculation.itemsSubtotal <= 0) {
      setSaveError('Add at least one item with a price greater than 0.');
      return;
    }
    if (calculation.unclaimedCount > 0) {
      setSaveError(
        `${calculation.unclaimedCount} item(s) have no friends selected. Select who shared them or assign unclaimed items to everyone.`
      );
      return;
    }
    if (calculation.participantIds.length === 0 || calculation.grandTotal <= 0) {
      setSaveError('At least one friend must have a share greater than 0.');
      return;
    }

    onSave(
      {
        tripId: trip.id,
        title: title.trim(),
        category,
        date,
        amount: calculation.grandTotal,
        currency,
        paidById,
        splitMode: 'exact',
        participantIds: calculation.participantIds,
        splits: calculation.exactSplits,
        receiptBreakdown: {
          items: items.map((it) => ({
            ...it,
            name: it.name.trim() || 'Item',
          })),
          tax: taxNum,
          tip: tipNum,
          discount: discountNum,
          rawText: rawText.trim() || undefined,
        },
        notes: aiNotes || undefined,
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
      aria-labelledby="smart-receipt-title"
    >
      <div
        className="fixed inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full sm:max-w-2xl glass-modal rounded-t-3xl sm:rounded-3xl max-h-[93vh] flex flex-col overflow-hidden">
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="w-9 h-1 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-slate-200/60 flex items-center justify-between gap-3 shrink-0 bg-white/55 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            {step === 'review' && !editingExpense && (
              <button
                type="button"
                onClick={() => setStep('paste')}
                aria-label="Back to paste receipt"
                className="min-h-[36px] min-w-[36px] rounded-full bg-white/80 hover:bg-white border border-white/90 text-slate-700 inline-flex items-center justify-center transition-colors shrink-0 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="smart-receipt-title"
                className="text-lg font-bold tracking-tight text-[#0F172A] truncate"
              >
                {editingExpense
                  ? 'Review Itemized Receipt'
                  : 'Smart Receipt Capture'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                {step === 'paste'
                  ? 'Paste a messy receipt or chat note to extract items, tax & tip'
                  : 'Tap friends per item — tax & tip scale proportionally'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close smart receipt modal"
            className="min-h-[40px] min-w-[40px] rounded-full text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 inline-flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: PASTE & EXTRACT */}
        {step === 'paste' && (
          <form
            onSubmit={handleExtract}
            className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="receipt-raw-input"
                  className="text-xs font-semibold text-slate-700"
                >
                  Receipt text or group chat note
                </label>
                <span className="text-[11px] font-medium text-slate-500">
                  Supports INR, USD, EUR, JPY
                </span>
              </div>

              <textarea
                id="receipt-raw-input"
                rows={7}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  if (parseError) setParseError('');
                }}
                placeholder="Paste a restaurant receipt, bar bill, or chat note like: 'Aarav had ramen ¥1400, Maya and Rohan shared gyoza ¥900, tax 10% and ¥500 tip'..."
                className="w-full p-4 rounded-2xl bg-white/75 border border-white/85 text-sm leading-relaxed text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-y shadow-xs"
              />
            </div>

            {/* Quick Example Fillers */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Try a sample receipt or chat note:
              </p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_RECEIPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setRawText(sample.text);
                      setParseError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-full bg-white/75 border border-white/85 hover:bg-white text-xs font-semibold text-slate-700 transition-all shadow-xs"
                  >
                    <ReceiptText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {parseError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FFF1F2] border border-rose-200 text-xs font-semibold text-[#BA0035]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setItems([
                    {
                      id: `rcp-${Date.now()}-0`,
                      name: 'Shared Item',
                      quantity: 1,
                      totalPrice: 0,
                      claimantIds: trip.members.map((m) => m.id),
                    },
                  ]);
                  setTitle('Itemized Bill');
                  setStep('review');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-[#0F172A] underline underline-offset-4 py-2"
              >
                Enter items manually
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] rounded-full bg-white/70 border border-slate-200/80 text-sm font-semibold text-slate-700 hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isParsing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Items...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract Items</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: REVIEW, ASSIGN ITEMS & SAVE */}
        {step === 'review' && (
          <form
            onSubmit={handleSaveReceiptExpense}
            className="overflow-y-auto px-5 sm:px-6 py-5 space-y-6"
          >
            {/* Section 1: Bill Metadata */}
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Bill Details
                </h3>
                <div
                  className="inline-flex items-center gap-1 p-1 bg-white/60 border border-white/80 rounded-full shadow-xs"
                  role="group"
                  aria-label="Receipt currency"
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrency(code)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
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

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label
                    htmlFor="rcp-title"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Merchant / Title
                  </label>
                  <input
                    id="rcp-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Restaurant or bill name"
                    className="w-full h-10 px-3 rounded-xl bg-white/75 border border-slate-200/80 text-sm font-medium text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label
                    htmlFor="rcp-cat"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="rcp-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full h-10 px-2.5 rounded-xl bg-white/75 border border-slate-200/80 text-xs font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label
                    htmlFor="rcp-date"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="rcp-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-white/75 border border-slate-200/80 text-xs font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Paid by
                </span>
                <div className="flex flex-wrap gap-2">
                  {trip.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaidById(m.id)}
                      className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 min-h-[34px] rounded-full border text-xs font-semibold transition-all ${
                        paidById === m.id
                          ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-transparent shadow-sm'
                          : 'bg-white/75 text-slate-700 border-white/85 hover:bg-white'
                      }`}
                    >
                      <MemberAvatar name={m.name} color={m.color} size="xs" />
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Extracted Items & Friend Claims */}
            <div className="space-y-3 pt-4 border-t border-slate-200/60">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Items &amp; Who Shared ({items.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddBlankItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] rounded-full bg-white/80 hover:bg-white border border-white/90 text-xs font-semibold text-[#0F172A] transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              {aiNotes && (
                <p className="text-xs text-indigo-950 bg-indigo-500/10 border border-indigo-300/40 rounded-xl px-3.5 py-2">
                  Note: {aiNotes}
                </p>
              )}

              <div className="rounded-2xl border border-white/85 divide-y divide-slate-200/50 overflow-hidden bg-white/65 shadow-xs">
                {items.map((item) => {
                  const isUnclaimed = item.claimantIds.length === 0;
                  const perPerson =
                    item.claimantIds.length > 0
                      ? item.totalPrice / item.claimantIds.length
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 space-y-2.5 ${
                        isUnclaimed ? 'bg-amber-400/15' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          aria-label="Item quantity"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-12 h-9 px-1.5 rounded-lg bg-white/80 border border-slate-200/80 text-center text-xs font-semibold tabular-nums text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500"
                          title="Quantity"
                        />
                        <input
                          type="text"
                          aria-label="Item name"
                          value={item.name}
                          placeholder="Item description"
                          onChange={(e) =>
                            handleUpdateItem(item.id, { name: e.target.value })
                          }
                          className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-sm font-medium text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex items-center h-9 px-2.5 rounded-lg bg-white/80 border border-slate-200/80 focus-within:bg-white focus-within:border-emerald-500">
                          <span className="text-xs font-semibold text-slate-500 mr-1">
                            {getCurrencySymbol(currency)}
                          </span>
                          <input
                            type="number"
                            step={currency === 'JPY' ? '1' : '0.01'}
                            min="0"
                            aria-label="Item price"
                            value={item.totalPrice}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                totalPrice: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-20 bg-transparent text-right text-sm font-bold tabular-nums text-[#0F172A] focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          aria-label={`Remove ${item.name || 'item'}`}
                          className="min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-rose-500/10 inline-flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Friend selector pills for this item */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {trip.members.map((m) => {
                            const claimed = item.claimantIds.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleItemClaimant(item.id, m.id)}
                                className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 min-h-[30px] rounded-full text-xs font-semibold border transition-all ${
                                  claimed
                                    ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-950 shadow-xs'
                                    : 'bg-white/75 border-white/85 text-slate-500 hover:bg-white'
                                }`}
                              >
                                <MemberAvatar name={m.name} color={m.color} size="xs" />
                                <span>{m.name}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          {isUnclaimed ? (
                            <span className="font-semibold text-amber-700">
                              Select friends
                            </span>
                          ) : (
                            <span className="font-medium text-slate-500 tabular-nums">
                              <MoneyText amount={perPerson} currency={currency} /> / person
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setItemAllClaimants(
                                item.id,
                                item.claimantIds.length < trip.members.length
                              )
                            }
                            className="font-semibold text-[#006948] hover:underline"
                          >
                            {item.claimantIds.length < trip.members.length ? 'All' : 'Clear'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {calculation.unclaimedCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <span className="font-medium">
                    {calculation.unclaimedCount} item(s) totaling{' '}
                    <strong className="tabular-nums">
                      <MoneyText amount={calculation.unclaimedSubtotal} currency={currency} />
                    </strong>{' '}
                    still unassigned.
                  </span>
                  <button
                    type="button"
                    onClick={assignUnclaimedToAll}
                    className="inline-flex items-center gap-1 font-bold text-amber-900 underline underline-offset-2 hover:text-amber-700"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Split unclaimed equally
                  </button>
                </div>
              )}
            </div>

            {/* Section 3: Tax, Tip & Discount */}
            <div className="space-y-3 pt-4 border-t border-slate-200/60">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Tax, Tip &amp; Discount ({currency})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Split proportionally by each person&apos;s item subtotal
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="rcp-tax"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Tax &amp; Service
                  </label>
                  <div className="flex items-center h-10 px-3 rounded-xl bg-white/75 border border-slate-200/80 focus-within:bg-white focus-within:border-emerald-500">
                    <span className="text-xs text-slate-400 mr-1">
                      {getCurrencySymbol(currency)}
                    </span>
                    <input
                      id="rcp-tax"
                      type="number"
                      step={currency === 'JPY' ? '1' : '0.01'}
                      min="0"
                      value={taxStr}
                      onChange={(e) => setTaxStr(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold tabular-nums text-[#0F172A] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rcp-tip"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Tip / Gratuity
                  </label>
                  <div className="flex items-center h-10 px-3 rounded-xl bg-white/75 border border-slate-200/80 focus-within:bg-white focus-within:border-emerald-500">
                    <span className="text-xs text-slate-400 mr-1">
                      {getCurrencySymbol(currency)}
                    </span>
                    <input
                      id="rcp-tip"
                      type="number"
                      step={currency === 'JPY' ? '1' : '0.01'}
                      min="0"
                      value={tipStr}
                      onChange={(e) => setTipStr(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold tabular-nums text-[#0F172A] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rcp-discount"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Discount (-)
                  </label>
                  <div className="flex items-center h-10 px-3 rounded-xl bg-white/75 border border-slate-200/80 focus-within:bg-white focus-within:border-emerald-500">
                    <span className="text-xs text-slate-400 mr-1">
                      {getCurrencySymbol(currency)}
                    </span>
                    <input
                      id="rcp-discount"
                      type="number"
                      step={currency === 'JPY' ? '1' : '0.01'}
                      min="0"
                      value={discountStr}
                      onChange={(e) => setDiscountStr(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold tabular-nums text-[#0F172A] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Calculated Per-Person Breakdown */}
            <div className="space-y-3 pt-4 border-t border-slate-200/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  4. Per-Person Split Summary
                </h3>
                <div className="text-xs font-bold text-[#0F172A] tabular-nums flex items-center gap-2">
                  <span>
                    Total: <MoneyText amount={calculation.grandTotal} currency={currency} showCode />
                  </span>
                  {currency !== trip.homeCurrency && (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <ArrowRightLeft className="w-3 h-3" />
                      <MoneyText amount={grandTotalHome} currency={trip.homeCurrency} showCode />
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/85 divide-y divide-slate-200/50 overflow-hidden shadow-xs">
                {calculation.memberShares.map((share) => {
                  const member = trip.members.find((m) => m.id === share.memberId);
                  if (!member) return null;
                  const shareHome = convertAmount(
                    share.totalShare,
                    currency,
                    trip.homeCurrency,
                    trip.fxRates
                  );
                  const extras = share.taxShare + share.tipShare - share.discountShare;

                  return (
                    <div
                      key={member.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MemberAvatar name={member.name} color={member.color} size="xs" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0F172A] truncate">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {share.totalShare > 0 ? (
                              <>
                                Items <MoneyText amount={share.itemsSubtotal} currency={currency} />
                                {Math.abs(extras) > 0 && (
                                  <>
                                    {' '}
                                    {extras >= 0 ? '+' : '-'}{' '}
                                    <MoneyText amount={Math.abs(extras)} currency={currency} /> tax/tip
                                  </>
                                )}
                              </>
                            ) : (
                              'Not included'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#0F172A] tabular-nums">
                          <MoneyText amount={share.totalShare} currency={currency} />
                        </p>
                        {currency !== trip.homeCurrency && share.totalShare > 0 && (
                          <p className="text-[11px] font-medium text-[#006948] tabular-nums">
                            ≈ <MoneyText amount={shareHome} currency={trip.homeCurrency} />
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FFF1F2] border border-rose-200 text-xs font-semibold text-[#BA0035]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200/60">
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
                {editingExpense ? 'Update Itemized Bill' : 'Save Itemized Bill'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
