import React from 'react';
import { Plus } from 'lucide-react';
import { Trip } from '../types/splitnpay';

interface HeaderProps {
  trips: Trip[];
  activeTrip: Trip;
  onSelectTrip: (tripId: string) => void;
  onOpenNewTrip: () => void;
  onOpenTripSettings: () => void;
  onOpenAddExpense: () => void;
  onExportCsv: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTrip,
  onOpenTripSettings,
  onOpenAddExpense,
  onExportCsv,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/70 backdrop-blur-xl border-b border-white/75 shadow-sm">
      <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg"
        >
          <span className="inline-flex w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white items-center justify-center text-sm font-extrabold shadow-md shadow-emerald-500/25">
            S
          </span>
          <span>SplitnPay</span>
        </a>

        {/* Zone 2: Concise single-line navigation links & trip selector */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <label htmlFor="header-trip-select" className="sr-only">
              Active Trip
            </label>
            <select
              id="header-trip-select"
              value={activeTrip.id}
              onChange={(e) => onSelectTrip(e.target.value)}
              className="bg-white/60 border border-white/80 rounded-full px-3 py-1 text-sm font-bold text-[#0F172A] hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.homeCurrency})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenTripSettings}
            className="hover:text-emerald-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Trip &amp; FX Rates
          </button>

          <button
            type="button"
            onClick={onOpenNewTrip}
            className="hover:text-emerald-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            New Trip
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="hover:text-emerald-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Export CSV
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 shadow-md shadow-emerald-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>
    </header>
  );
};
