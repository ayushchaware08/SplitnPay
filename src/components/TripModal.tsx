import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, RotateCcw } from 'lucide-react';
import { MEMBER_PALETTE } from '../data/seedData';
import { CurrencyCode, FxRates, Member, Trip } from '../types/splitnpay';
import {
  CURRENCY_META,
  DEFAULT_FX_RATES,
  SUPPORTED_CURRENCIES,
} from '../utils/currency';
import { MemberAvatar } from './MemberAvatar';

interface TripModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  trip: Trip;
  canDeleteTrip: boolean;
  onClose: () => void;
  onCreateTrip: (payload: {
    name: string;
    destination?: string;
    homeCurrency: CurrencyCode;
    memberNames: string[];
  }) => void;
  onUpdateTrip: (
    tripId: string,
    updates: {
      name: string;
      destination?: string;
      homeCurrency: CurrencyCode;
      fxRates: FxRates;
      members: Member[];
    }
  ) => void;
  onDeleteTrip: (tripId: string) => void;
  onResetDemoData: () => void;
}

export const TripModal: React.FC<TripModalProps> = ({
  isOpen,
  mode,
  trip,
  canDeleteTrip,
  onClose,
  onCreateTrip,
  onUpdateTrip,
  onDeleteTrip,
  onResetDemoData,
}) => {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [homeCurrency, setHomeCurrency] = useState<CurrencyCode>('INR');
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [fxRates, setFxRates] = useState<FxRates>({ ...DEFAULT_FX_RATES });

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'create') {
      setName('');
      setDestination('');
      setHomeCurrency('INR');
      setMembers([
        { id: `new-1`, name: 'Aarav', color: MEMBER_PALETTE[0] },
        { id: `new-2`, name: 'Maya', color: MEMBER_PALETTE[1] },
      ]);
      setNewMemberName('');
      setFxRates({ ...DEFAULT_FX_RATES });
    } else {
      setName(trip.name);
      setDestination(trip.destination ?? '');
      setHomeCurrency(trip.homeCurrency);
      setMembers(trip.members);
      setNewMemberName('');
      setFxRates({ ...trip.fxRates });
    }
  }, [isOpen, mode, trip]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    setMembers((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}-${prev.length}`,
        name: trimmed,
        color: MEMBER_PALETTE[prev.length % MEMBER_PALETTE.length],
      },
    ]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 2) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      onCreateTrip({
        name: name.trim() || 'New Trip',
        destination: destination.trim() || undefined,
        homeCurrency,
        memberNames: members.map((m) => m.name),
      });
    } else {
      onUpdateTrip(trip.id, {
        name: name.trim() || trip.name,
        destination: destination.trim() || undefined,
        homeCurrency,
        fxRates,
        members,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-modal-title"
    >
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full sm:max-w-lg glass-modal rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="w-9 h-1 rounded-full bg-slate-300/80" />
        </div>

        <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-slate-200/60 flex items-center justify-between shrink-0">
          <h2
            id="trip-modal-title"
            className="text-lg font-bold tracking-tight text-[#0F172A]"
          >
            {mode === 'create' ? 'Create New Trip' : 'Trip Settings & FX Rates'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[40px] min-w-[40px] rounded-full text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 inline-flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {/* Trip Name & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="trip-name"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Trip Name
              </label>
              <input
                id="trip-name"
                type="text"
                required
                placeholder="e.g., Kyoto Autumn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/75 border border-slate-200/80 text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="trip-dest"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Destination (optional)
              </label>
              <input
                id="trip-dest"
                type="text"
                placeholder="e.g., Japan"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/75 border border-slate-200/80 text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Home Currency Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Trip Home Currency (all bills convert to this)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SUPPORTED_CURRENCIES.map((code) => {
                const selected = homeCurrency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setHomeCurrency(code)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                      selected
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-600 border-transparent text-white shadow-md shadow-emerald-600/25'
                        : 'bg-white/75 border-white/85 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="text-sm font-bold">{CURRENCY_META[code].symbol}</div>
                    <div className="text-[11px] font-semibold mt-0.5">{code}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Travelers */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-600">
              Travelers ({members.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white/80 border border-white/90 text-xs font-semibold text-[#0F172A] shadow-xs"
                >
                  <MemberAvatar name={m.name} color={m.color} size="xs" />
                  <span>{m.name}</span>
                  {members.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      aria-label={`Remove ${m.name}`}
                      className="text-slate-400 hover:text-[#E11D48] ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add traveler name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="flex-1 h-10 px-3.5 rounded-xl bg-white/75 border border-slate-200/80 text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="px-3.5 h-10 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-xs font-semibold hover:opacity-95 inline-flex items-center gap-1 whitespace-nowrap shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* FX Rates Editor (in edit mode) */}
          {mode === 'edit' && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Trip Exchange Rates (per 1 USD)
                </span>
                <button
                  type="button"
                  onClick={() => setFxRates({ ...DEFAULT_FX_RATES })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#006948] hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset defaults
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(['INR', 'EUR', 'JPY'] as const).map((code) => (
                  <div key={code}>
                    <label
                      htmlFor={`fx-${code}`}
                      className="block text-[11px] font-semibold text-slate-500 mb-1"
                    >
                      1 USD → {code}
                    </label>
                    <input
                      id={`fx-${code}`}
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={fxRates[code]}
                      onChange={(e) =>
                        setFxRates((prev) => ({
                          ...prev,
                          [code]: parseFloat(e.target.value) || prev[code],
                        }))
                      }
                      className="w-full h-9 px-2.5 rounded-lg bg-white/75 border border-slate-200/80 text-xs font-semibold tabular-nums text-[#0F172A] focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
            {mode === 'edit' ? (
              <div className="flex items-center gap-2">
                {canDeleteTrip && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTrip(trip.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-full text-xs font-semibold text-[#E11D48] hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Trip
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    onClose();
                  }}
                  className="px-3 py-2 min-h-[40px] rounded-full text-xs font-semibold text-slate-600 hover:text-[#0F172A] hover:bg-white/70 transition-colors"
                >
                  Reset Sample Trips
                </button>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 min-h-[44px] rounded-full bg-white/70 border border-slate-200/80 text-sm font-semibold text-slate-700 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/25 transition-all"
              >
                {mode === 'create' ? 'Create Trip' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
