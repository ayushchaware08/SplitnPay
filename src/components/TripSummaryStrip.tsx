import React from 'react';
import {
  Settings2,
  ArrowRightLeft,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { CurrencyCode, MemberBalance, Trip } from '../types/splitnpay';
import { CURRENCY_META, SUPPORTED_CURRENCIES, isNearZero } from '../utils/currency';
import { MemberAvatar } from './MemberAvatar';
import { MoneyText } from './MoneyText';

interface TripSummaryStripProps {
  trips: Trip[];
  activeTrip: Trip;
  activeViewerId: string;
  totalTripSpendHome: number;
  expenseCount: number;
  distinctCurrencyCount: number;
  viewerBalance?: MemberBalance;
  pendingTransferCount: number;
  pendingTransferVolume: number;
  onSelectTrip: (tripId: string) => void;
  onSelectViewer: (memberId: string) => void;
  onChangeHomeCurrency: (currency: CurrencyCode) => void;
  onOpenTripSettings: () => void;
  onOpenNewTrip: () => void;
}

export const TripSummaryStrip: React.FC<TripSummaryStripProps> = ({
  trips,
  activeTrip,
  activeViewerId,
  totalTripSpendHome,
  expenseCount,
  distinctCurrencyCount,
  viewerBalance,
  pendingTransferCount,
  pendingTransferVolume,
  onSelectTrip,
  onSelectViewer,
  onChangeHomeCurrency,
  onOpenTripSettings,
  onOpenNewTrip,
}) => {
  const viewerMember =
    activeTrip.members.find((m) => m.id === activeViewerId) ?? activeTrip.members[0];
  const net = viewerBalance?.netHome ?? 0;
  const isSettled = isNearZero(net, activeTrip.homeCurrency);
  const isPositive = !isSettled && net > 0;

  const visibleAvatars = activeTrip.members.slice(0, 4);
  const overflowCount = Math.max(0, activeTrip.members.length - visibleAvatars.length);

  return (
    <section aria-label="Trip overview" className="space-y-6">
      {/* Mobile trip switcher row */}
      <div className="flex md:hidden items-center justify-between gap-2">
        <select
          aria-label="Select trip"
          value={activeTrip.id}
          onChange={(e) => onSelectTrip(e.target.value)}
          className="flex-1 min-h-[44px] px-3.5 rounded-xl glass-surface-strong text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.homeCurrency})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onOpenNewTrip}
          className="min-h-[44px] px-3 rounded-xl glass-surface-strong text-slate-800 hover:text-[#0F172A] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          <span>New</span>
        </button>
        <button
          type="button"
          onClick={onOpenTripSettings}
          aria-label="Trip settings and exchange rates"
          className="min-h-[44px] min-w-[44px] rounded-xl glass-surface-strong text-slate-800 hover:text-[#0F172A] inline-flex items-center justify-center shrink-0"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Trip Title + Home Currency Switcher + Member Stack */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-700">
            {activeTrip.destination && (
              <>
                <span className="text-emerald-700 font-bold">{activeTrip.destination}</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
              </>
            )}
            <span>{activeTrip.members.length} travelers</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span>
              {expenseCount} {expenseCount === 1 ? 'bill' : 'bills'} logged
            </span>
          </div>
          <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-[-0.025em] text-[#0F172A] leading-tight">
            {activeTrip.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Avatar Stack + Viewing As selector */}
          <div className="flex items-center gap-2.5 glass-surface rounded-full pl-2 pr-3.5 py-1.5">
            <div className="flex items-center -space-x-2">
              {visibleAvatars.map((member) => (
                <MemberAvatar
                  key={member.id}
                  name={member.name}
                  color={member.color}
                  size="xs"
                  className="ring-2 ring-white"
                />
              ))}
              {overflowCount > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/80 text-[10px] font-bold text-slate-800 ring-2 ring-white">
                  +{overflowCount}
                </span>
              )}
            </div>
            <label htmlFor="viewer-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Viewing as
            </label>
            <select
              id="viewer-select"
              value={viewerMember?.id ?? ''}
              onChange={(e) => onSelectViewer(e.target.value)}
              className="text-xs font-bold text-[#0F172A] bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              {activeTrip.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trip Home Currency Segmented Control */}
          <div
            className="inline-flex items-center gap-1 p-1 glass-subtle rounded-full"
            role="group"
            aria-label="Trip home currency"
          >
            <span className="pl-2.5 pr-1 text-[11px] font-bold text-slate-700 inline-flex items-center gap-1 whitespace-nowrap">
              <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">Home:</span>
            </span>
            {SUPPORTED_CURRENCIES.map((code) => {
              const active = activeTrip.homeCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeHomeCurrency(code)}
                  className={`px-2.5 py-1 min-h-[32px] rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/25'
                      : 'text-slate-700 hover:text-[#0F172A] hover:bg-white/60'
                  }`}
                  title={`Convert all trip balances to ${CURRENCY_META[code].name}`}
                >
                  {CURRENCY_META[code].symbol} {code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 Summary Metric Tiles with Vibrant Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tile 1: Total Trip Spend */}
        <div className="rounded-2xl p-5 backdrop-blur-xl bg-gradient-to-br from-white/80 via-sky-50/70 to-indigo-50/65 border border-white/80 shadow-level-1 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-900/75">
              Total Trip Spend
            </p>
            <span className="text-[11px] font-bold text-indigo-700">
              {activeTrip.homeCurrency}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <MoneyText
              amount={totalTripSpendHome}
              currency={activeTrip.homeCurrency}
              className="text-2xl sm:text-[28px] font-extrabold tracking-[-0.025em] text-[#0F172A]"
            />
            <span className="text-xs font-semibold text-indigo-800/75 whitespace-nowrap">
              {distinctCurrencyCount > 1
                ? `${distinctCurrencyCount} currencies`
                : `All in ${activeTrip.homeCurrency}`}
            </span>
          </div>
        </div>

        {/* Tile 2: Viewer's Net Balance */}
        <div
          className={`rounded-2xl border p-5 backdrop-blur-xl shadow-level-1 flex flex-col justify-between transition-colors ${
            isSettled
              ? 'bg-white/75 border-white/80'
              : isPositive
              ? 'bg-gradient-to-br from-emerald-50/85 via-teal-50/75 to-white/75 border-emerald-200/80'
              : 'bg-gradient-to-br from-rose-50/85 via-pink-50/75 to-white/75 border-rose-200/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {viewerMember ? `${viewerMember.name}'s Balance` : 'Net Balance'}
            </p>
            {isSettled ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : isPositive ? (
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <MoneyText
              amount={net}
              currency={activeTrip.homeCurrency}
              signed={!isSettled}
              className={`text-2xl sm:text-[28px] font-extrabold tracking-[-0.025em] ${
                isSettled
                  ? 'text-slate-700'
                  : isPositive
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            />
            <span
              className={`text-xs font-bold whitespace-nowrap ${
                isSettled
                  ? 'text-slate-600'
                  : isPositive
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {isSettled ? 'Settled' : isPositive ? 'Owed to you' : 'You owe'}
            </span>
          </div>
        </div>

        {/* Tile 3: Remaining to Settle */}
        <div
          className={`rounded-2xl border p-5 backdrop-blur-xl shadow-level-1 flex flex-col justify-between ${
            pendingTransferCount === 0
              ? 'bg-gradient-to-br from-emerald-50/80 via-teal-50/65 to-white/75 border-emerald-200/80'
              : 'bg-gradient-to-br from-amber-50/85 via-orange-50/65 to-white/75 border-amber-200/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Open Settlements
            </p>
            {pendingTransferCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <MoneyText
              amount={pendingTransferVolume}
              currency={activeTrip.homeCurrency}
              className="text-2xl sm:text-[28px] font-extrabold tracking-[-0.025em] text-[#0F172A]"
            />
            <span
              className={`text-xs font-bold whitespace-nowrap ${
                pendingTransferCount === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {pendingTransferCount === 0
                ? 'All squared up'
                : `${pendingTransferCount} ${
                    pendingTransferCount === 1 ? 'transfer' : 'transfers'
                  }`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
