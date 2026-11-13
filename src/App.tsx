import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { BalanceAndSettlePanel } from './components/BalanceAndSettlePanel';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseModal } from './components/ExpenseModal';
import { Header } from './components/Header';
import { SmartReceiptModal } from './components/SmartReceiptModal';
import { TripModal } from './components/TripModal';
import { TripSummaryStrip } from './components/TripSummaryStrip';
import { useSplitnPayStore } from './hooks/useSplitnPayStore';
import { Expense, TransferSuggestion } from './types/splitnpay';
import { getExpenseHomeAmount, roundCurrency } from './utils/currency';
import { calculateMemberBalances, simplifyDebts } from './utils/settlements';

interface ToastNotice {
  id: number;
  message: string;
  undoSettlementId?: string;
}

export default function App() {
  const {
    state,
    activeTrip,
    activeViewerId,
    setActiveTrip,
    setViewerMember,
    updateTripHomeCurrency,
    createTrip,
    updateTrip,
    deleteTrip,
    addExpense,
    updateExpense,
    deleteExpense,
    markTransferSettled,
    markMemberBalanceSettled,
    reopenSettlement,
    resetDemoData,
  } = useSplitnPayStore();

  const [mobileTab, setMobileTab] = useState<'expenses' | 'balances'>('expenses');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [smartReceiptOpen, setSmartReceiptOpen] = useState(false);
  const [editingReceiptExpense, setEditingReceiptExpense] = useState<Expense | null>(null);
  const [tripModalState, setTripModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
  }>({ open: false, mode: 'edit' });
  const [toast, setToast] = useState<ToastNotice | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const tripExpenses = useMemo(
    () => state.expenses.filter((e) => e.tripId === activeTrip.id),
    [state.expenses, activeTrip.id]
  );

  const tripSettlements = useMemo(
    () => state.settlements.filter((s) => s.tripId === activeTrip.id),
    [state.settlements, activeTrip.id]
  );

  const distinctCurrencyCount = useMemo(() => {
    const set = new Set(tripExpenses.map((e) => e.currency));
    return set.size;
  }, [tripExpenses]);

  const totalTripSpendHome = useMemo(() => {
    const sum = tripExpenses.reduce(
      (acc, exp) =>
        acc + getExpenseHomeAmount(exp, activeTrip.homeCurrency, activeTrip.fxRates),
      0
    );
    return roundCurrency(sum, activeTrip.homeCurrency);
  }, [tripExpenses, activeTrip.homeCurrency, activeTrip.fxRates]);

  const balances = useMemo(
    () => calculateMemberBalances(activeTrip, tripExpenses, tripSettlements),
    [activeTrip, tripExpenses, tripSettlements]
  );

  const suggestions = useMemo(
    () => simplifyDebts(balances, activeTrip.homeCurrency),
    [balances, activeTrip.homeCurrency]
  );

  const pendingTransferVolume = useMemo(() => {
    const sum = suggestions.reduce((acc, t) => acc + t.amountHome, 0);
    return roundCurrency(sum, activeTrip.homeCurrency);
  }, [suggestions, activeTrip.homeCurrency]);

  const viewerBalance = useMemo(
    () => balances.find((b) => b.memberId === activeViewerId),
    [balances, activeViewerId]
  );

  const memberMap = useMemo(
    () => new Map(activeTrip.members.map((m) => [m.id, m])),
    [activeTrip.members]
  );

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const handleOpenSmartReceipt = () => {
    setEditingReceiptExpense(null);
    setSmartReceiptOpen(true);
  };

  const handleOpenEditExpense = (expense: Expense) => {
    if (expense.receiptBreakdown && expense.receiptBreakdown.items.length > 0) {
      setEditingReceiptExpense(expense);
      setSmartReceiptOpen(true);
      return;
    }
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = (
    data: Omit<Expense, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      updateExpense(editingId, data);
    } else {
      addExpense(data);
    }
  };

  const handleMarkTransferSettled = (transfer: TransferSuggestion) => {
    const settlementId = markTransferSettled(
      activeTrip.id,
      transfer.fromMemberId,
      transfer.toMemberId,
      transfer.amountHome,
      activeTrip.homeCurrency,
      'One-tap settled'
    );
    const fromName = memberMap.get(transfer.fromMemberId)?.name ?? 'Member';
    const toName = memberMap.get(transfer.toMemberId)?.name ?? 'Member';
    setToast({
      id: Date.now(),
      message: `Settled ${fromName} → ${toName}`,
      undoSettlementId: settlementId ?? undefined,
    });
  };

  const handleMarkMemberSettled = (memberId: string) => {
    markMemberBalanceSettled(
      activeTrip.id,
      memberId,
      suggestions,
      activeTrip.homeCurrency
    );
    const name = memberMap.get(memberId)?.name ?? 'Member';
    setToast({
      id: Date.now(),
      message: `${name}'s balance marked settled`,
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Title',
      'Category',
      'Paid By',
      'Original Amount',
      'Bill Currency',
      `Converted Amount (${activeTrip.homeCurrency})`,
      'Split Mode',
    ];

    const rows = tripExpenses.map((e) => {
      const payer = memberMap.get(e.paidById)?.name ?? 'Unknown';
      const homeAmt = getExpenseHomeAmount(e, activeTrip.homeCurrency, activeTrip.fxRates);
      return [
        e.date,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${payer}"`,
        String(e.amount),
        e.currency,
        String(homeAmt),
        e.splitMode,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTrip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ledger.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="top"
      className="relative min-h-screen text-[#0F172A] pb-24 lg:pb-14 overflow-x-hidden bg-gradient-to-br from-[#DDF7EE] via-[#EBF2FF] to-[#FCE7F3]"
    >
      {/* Ambient Vibrant Gradient Mesh Layer for Glassmorphism Refraction */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full bg-emerald-300/45 blur-[110px]" />
        <div className="absolute top-[12%] -right-24 w-[440px] h-[440px] rounded-full bg-sky-300/45 blur-[110px]" />
        <div className="absolute bottom-[-8%] left-[22%] w-[520px] h-[420px] rounded-full bg-violet-300/40 blur-[120px]" />
        <div className="absolute bottom-[14%] right-[12%] w-[360px] h-[360px] rounded-full bg-rose-300/35 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Header
          trips={state.trips}
          activeTrip={activeTrip}
          onSelectTrip={setActiveTrip}
          onOpenNewTrip={() => setTripModalState({ open: true, mode: 'create' })}
          onOpenTripSettings={() => setTripModalState({ open: true, mode: 'edit' })}
          onOpenAddExpense={handleOpenAddExpense}
          onExportCsv={handleExportCsv}
        />

        <main className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-8 space-y-7">
          <TripSummaryStrip
            trips={state.trips}
            activeTrip={activeTrip}
            activeViewerId={activeViewerId}
            totalTripSpendHome={totalTripSpendHome}
            expenseCount={tripExpenses.length}
            distinctCurrencyCount={distinctCurrencyCount}
            viewerBalance={viewerBalance}
            pendingTransferCount={suggestions.length}
            pendingTransferVolume={pendingTransferVolume}
            onSelectTrip={setActiveTrip}
            onSelectViewer={(memberId) => setViewerMember(activeTrip.id, memberId)}
            onChangeHomeCurrency={(code) => updateTripHomeCurrency(activeTrip.id, code)}
            onOpenTripSettings={() => setTripModalState({ open: true, mode: 'edit' })}
            onOpenNewTrip={() => setTripModalState({ open: true, mode: 'create' })}
          />

          {/* Mobile/Tablet View Switcher Pill Tabs */}
          <div className="lg:hidden">
            <div className="grid grid-cols-2 p-1 glass-subtle rounded-full">
              <button
                type="button"
                onClick={() => setMobileTab('expenses')}
                className={`py-2 min-h-[40px] rounded-full text-sm font-bold transition-all ${
                  mobileTab === 'expenses'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-slate-700'
                }`}
              >
                Bills ({tripExpenses.length})
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('balances')}
                className={`py-2 min-h-[40px] rounded-full text-sm font-bold transition-all ${
                  mobileTab === 'balances'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-slate-700'
                }`}
              >
                Balances &amp; Settle ({suggestions.length})
              </button>
            </div>
          </div>

          {/* 12-Column Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div
              className={`lg:col-span-7 ${
                mobileTab === 'expenses' ? 'block' : 'hidden lg:block'
              }`}
            >
              <ExpenseList
                trip={activeTrip}
                expenses={tripExpenses}
                activeViewerId={activeViewerId}
                onAddExpense={handleOpenAddExpense}
                onOpenSmartReceipt={handleOpenSmartReceipt}
                onEditExpense={handleOpenEditExpense}
                onDeleteExpense={deleteExpense}
              />
            </div>

            <div
              className={`lg:col-span-5 ${
                mobileTab === 'balances' ? 'block' : 'hidden lg:block'
              }`}
            >
              <BalanceAndSettlePanel
                trip={activeTrip}
                activeViewerId={activeViewerId}
                balances={balances}
                suggestions={suggestions}
                settlements={tripSettlements}
                onMarkTransferSettled={handleMarkTransferSettled}
                onMarkMemberSettled={handleMarkMemberSettled}
                onReopenSettlement={reopenSettlement}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Floating Action Buttons (thumb-zone) */}
      <div className="lg:hidden fixed bottom-5 right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenSmartReceipt}
          className="inline-flex items-center gap-1.5 px-4 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-level-3 transition-all active:scale-[0.97]"
        >
          <Sparkles className="w-4 h-4" />
          <span>Receipt</span>
        </button>
        <button
          type="button"
          onClick={handleOpenAddExpense}
          className="inline-flex items-center gap-1.5 px-5 h-12 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.97] text-white text-sm font-semibold shadow-level-3 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Bill</span>
        </button>
      </div>

      {/* Settlement Confirmation Toast */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-full bg-[#0F172A]/90 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm font-semibold shadow-level-3 flex items-center gap-2.5 whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
          {toast.undoSettlementId && (
            <button
              type="button"
              onClick={() => {
                reopenSettlement(toast.undoSettlementId!);
                setToast(null);
              }}
              className="inline-flex items-center gap-1 text-emerald-300 hover:underline ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        trip={activeTrip}
        activeViewerId={activeViewerId}
        editingExpense={editingExpense}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        onSwitchToSmartReceipt={() => {
          setExpenseModalOpen(false);
          handleOpenSmartReceipt();
        }}
      />

      <SmartReceiptModal
        isOpen={smartReceiptOpen}
        trip={activeTrip}
        activeViewerId={activeViewerId}
        editingExpense={editingReceiptExpense}
        onClose={() => setSmartReceiptOpen(false)}
        onSave={handleSaveExpense}
      />

      <TripModal
        isOpen={tripModalState.open}
        mode={tripModalState.mode}
        trip={activeTrip}
        canDeleteTrip={state.trips.length > 1}
        onClose={() => setTripModalState((s) => ({ ...s, open: false }))}
        onCreateTrip={createTrip}
        onUpdateTrip={updateTrip}
        onDeleteTrip={deleteTrip}
        onResetDemoData={resetDemoData}
      />
    </div>
  );
}
