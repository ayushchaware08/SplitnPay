import React, { useMemo } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  MemberBalance,
  Settlement,
  TransferSuggestion,
  Trip,
} from '../types/splitnpay';
import { convertAmount, isNearZero } from '../utils/currency';
import { MemberAvatar } from './MemberAvatar';
import { MoneyText } from './MoneyText';

interface BalanceAndSettlePanelProps {
  trip: Trip;
  activeViewerId: string;
  balances: MemberBalance[];
  suggestions: TransferSuggestion[];
  settlements: Settlement[];
  onMarkTransferSettled: (suggestion: TransferSuggestion) => void;
  onMarkMemberSettled: (memberId: string) => void;
  onReopenSettlement: (settlementId: string) => void;
}

export const BalanceAndSettlePanel: React.FC<BalanceAndSettlePanelProps> = ({
  trip,
  activeViewerId,
  balances,
  suggestions,
  settlements,
  onMarkTransferSettled,
  onMarkMemberSettled,
  onReopenSettlement,
}) => {
  const memberMap = useMemo(
    () => new Map(trip.members.map((m) => [m.id, m])),
    [trip.members]
  );

  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => {
      if (a.memberId === activeViewerId) return -1;
      if (b.memberId === activeViewerId) return 1;
      return Math.abs(b.netHome) - Math.abs(a.netHome);
    });
  }, [balances, activeViewerId]);

  const sortedSettlements = useMemo(() => {
    return [...settlements].sort((a, b) => b.createdAt - a.createdAt);
  }, [settlements]);

  return (
    <div className="space-y-6">
      {/* Card 1: Simplified Settle-Up Plan + One-Tap Settled Marks */}
      <section className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/70 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#0F172A]">
              Settle-Up Plan
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              One-tap marks settle balances in {trip.homeCurrency}
            </p>
          </div>
          {suggestions.length === 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-800 text-xs font-bold whitespace-nowrap shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All settled
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 border border-amber-400/30 text-xs font-bold tabular-nums whitespace-nowrap shrink-0">
              {suggestions.length} pending
            </span>
          )}
        </div>

        {suggestions.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="w-11 h-11 rounded-full bg-emerald-500/15 text-emerald-700 inline-flex items-center justify-center mb-2.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-[#0F172A]">
              Everyone is squared up
            </p>
            <p className="text-xs text-slate-600 mt-1">
              No pending transfers remain for {trip.name}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/50">
            {suggestions.map((transfer) => {
              const from = memberMap.get(transfer.fromMemberId);
              const to = memberMap.get(transfer.toMemberId);
              if (!from || !to) return null;

              return (
                <li
                  key={transfer.id}
                  className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/55 transition-colors"
                >
                  {/* Visual Directional Graph */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <MemberAvatar name={from.name} color={from.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-[#0F172A] flex-wrap">
                        <span className="truncate">{from.name}</span>
                        <span className="inline-flex items-center text-emerald-600 shrink-0">
                          <span className="w-3 border-t-2 border-dashed border-emerald-400" />
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{to.name}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-emerald-700 tabular-nums">
                        <MoneyText
                          amount={transfer.amountHome}
                          currency={trip.homeCurrency}
                        />
                      </div>
                    </div>
                  </div>

                  {/* One-Tap Settled Button */}
                  <button
                    type="button"
                    onClick={() => onMarkTransferSettled(transfer)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/25 transition-all active:scale-[0.97] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Mark Settled</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Settled Marks History (Reversible) */}
        {sortedSettlements.length > 0 && (
          <div className="border-t border-white/70 bg-white/45">
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Completed Marks ({sortedSettlements.length})
              </span>
            </div>
            <ul className="divide-y divide-slate-200/45">
              {sortedSettlements.map((st) => {
                const from = memberMap.get(st.fromMemberId);
                const to = memberMap.get(st.toMemberId);
                if (!from || !to) return null;
                const amountInHome = convertAmount(
                  st.amount,
                  st.currency,
                  trip.homeCurrency,
                  trip.fxRates
                );

                return (
                  <li
                    key={st.id}
                    className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">
                          <strong className="font-bold text-[#0F172A]">
                            {from.name}
                          </strong>{' '}
                          paid{' '}
                          <strong className="font-bold text-[#0F172A]">
                            {to.name}
                          </strong>
                        </p>
                        <p className="text-[11px] font-semibold text-slate-600 tabular-nums mt-0.5">
                          <MoneyText
                            amount={amountInHome}
                            currency={trip.homeCurrency}
                          />
                          {st.currency !== trip.homeCurrency && (
                            <span className="ml-1 text-slate-500 font-medium">
                              (<MoneyText amount={st.amount} currency={st.currency} showCode />)
                            </span>
                          )}
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="text-emerald-700">Settled</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onReopenSettlement(st.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-full text-xs font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-white/80 transition-colors whitespace-nowrap shrink-0"
                      title="Undo settled mark"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Undo</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Card 2: Member Balances Ledger */}
      <section className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/70">
          <h2 className="text-lg font-extrabold tracking-tight text-[#0F172A]">
            Member Balances
          </h2>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Net position in {trip.homeCurrency} after bills and settlements
          </p>
        </div>

        <ul className="divide-y divide-slate-200/50">
          {sortedBalances.map((b) => {
            const member = memberMap.get(b.memberId);
            if (!member) return null;
            const settled = isNearZero(b.netHome, trip.homeCurrency);
            const positive = !settled && b.netHome > 0;
            const isViewer = member.id === activeViewerId;

            return (
              <li
                key={member.id}
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/45 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MemberAvatar name={member.name} color={member.color} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#0F172A] truncate">
                        {member.name}
                      </span>
                      {isViewer && (
                        <span className="text-[11px] font-bold text-emerald-700">
                          · You
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 tabular-nums mt-0.5">
                      Paid <MoneyText amount={b.totalPaidHome} currency={trip.homeCurrency} />
                      <span className="mx-1.5 text-slate-400">·</span>
                      Share <MoneyText amount={b.totalShareHome} currency={trip.homeCurrency} />
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {settled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/75 border border-white/90 text-slate-700 text-xs font-semibold whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Settled</span>
                    </span>
                  ) : (
                    <>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap tabular-nums border ${
                          positive
                            ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-800'
                            : 'bg-rose-500/15 border-rose-500/25 text-rose-800'
                        }`}
                      >
                        <MoneyText
                          amount={b.netHome}
                          currency={trip.homeCurrency}
                          signed
                        />
                        <span className="font-semibold ml-0.5">
                          {positive ? 'owed' : 'owes'}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => onMarkMemberSettled(member.id)}
                        title={`Mark ${member.name}'s balance as settled`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-full border border-white/90 bg-white/80 hover:bg-gradient-to-r hover:from-emerald-600 hover:to-teal-600 hover:text-white hover:border-emerald-600 text-slate-800 text-xs font-bold transition-all active:scale-[0.97] whitespace-nowrap shadow-xs"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Settle</span>
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};
