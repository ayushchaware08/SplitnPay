import { useCallback, useEffect, useState } from 'react';
import { createInitialSeedState, MEMBER_PALETTE } from '../data/seedData';
import {
  CurrencyCode,
  Expense,
  FxRates,
  Member,
  Settlement,
  SplitnPayStoreState,
  TransferSuggestion,
  Trip,
} from '../types/splitnpay';
import { DEFAULT_FX_RATES, SUPPORTED_CURRENCIES } from '../utils/currency';

const STORAGE_KEY = 'splitnpay_state_v1';
const LEGACY_KEYS = ['splitnpay_state', 'splitnpay_data', 'splitnpay'];

function isValidCurrency(val: unknown): val is CurrencyCode {
  return typeof val === 'string' && SUPPORTED_CURRENCIES.includes(val as CurrencyCode);
}

function normalizeState(raw: unknown): SplitnPayStoreState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<SplitnPayStoreState>;
  if (!Array.isArray(obj.trips) || obj.trips.length === 0) return null;

  const trips: Trip[] = obj.trips.map((t, idx) => ({
    id: t.id || `trip-${idx}-${Date.now()}`,
    name: t.name || 'Untitled Trip',
    destination: t.destination,
    homeCurrency: isValidCurrency(t.homeCurrency) ? t.homeCurrency : 'INR',
    fxRates: {
      USD: Number(t.fxRates?.USD) > 0 ? Number(t.fxRates.USD) : DEFAULT_FX_RATES.USD,
      INR: Number(t.fxRates?.INR) > 0 ? Number(t.fxRates.INR) : DEFAULT_FX_RATES.INR,
      EUR: Number(t.fxRates?.EUR) > 0 ? Number(t.fxRates.EUR) : DEFAULT_FX_RATES.EUR,
      JPY: Number(t.fxRates?.JPY) > 0 ? Number(t.fxRates.JPY) : DEFAULT_FX_RATES.JPY,
    },
    members: Array.isArray(t.members)
      ? t.members.map((m, mIdx) => ({
          id: m.id || `m-${idx}-${mIdx}`,
          name: m.name || `Member ${mIdx + 1}`,
          color: m.color || MEMBER_PALETTE[mIdx % MEMBER_PALETTE.length],
        }))
      : [],
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
  }));

  const expenses: Expense[] = Array.isArray(obj.expenses)
    ? obj.expenses.map((e, idx) => ({
        id: e.id || `exp-${idx}-${Date.now()}`,
        tripId: e.tripId || trips[0].id,
        title: e.title || 'Expense',
        category: e.category || 'Other',
        date: e.date || new Date().toISOString().slice(0, 10),
        amount: Number(e.amount) || 0,
        currency: isValidCurrency(e.currency) ? e.currency : 'INR',
        paidById: e.paidById || '',
        splitMode: e.splitMode === 'exact' || e.splitMode === 'percent' ? e.splitMode : 'equal',
        participantIds: Array.isArray(e.participantIds) ? e.participantIds : [],
        splits: Array.isArray(e.splits) ? e.splits : [],
        customRate:
          e.customRate &&
          Number(e.customRate.rate) > 0 &&
          isValidCurrency(e.customRate.targetCurrency)
            ? e.customRate
            : undefined,
        receiptBreakdown:
          e.receiptBreakdown && Array.isArray(e.receiptBreakdown.items)
            ? {
                items: e.receiptBreakdown.items.map((it, itIdx) => ({
                  id: it.id || `item-${idx}-${itIdx}`,
                  name: it.name || 'Item',
                  quantity: Math.max(1, Number(it.quantity) || 1),
                  totalPrice: Math.max(0, Number(it.totalPrice) || 0),
                  claimantIds: Array.isArray(it.claimantIds) ? it.claimantIds : [],
                })),
                tax: Math.max(0, Number(e.receiptBreakdown.tax) || 0),
                tip: Math.max(0, Number(e.receiptBreakdown.tip) || 0),
                discount: Math.max(0, Number(e.receiptBreakdown.discount) || 0),
                rawText: typeof e.receiptBreakdown.rawText === 'string' ? e.receiptBreakdown.rawText : undefined,
              }
            : undefined,
        notes: e.notes,
        createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
      }))
    : [];

  const settlements: Settlement[] = Array.isArray(obj.settlements)
    ? obj.settlements.map((s, idx) => ({
        id: s.id || `set-${idx}-${Date.now()}`,
        tripId: s.tripId || trips[0].id,
        fromMemberId: s.fromMemberId || '',
        toMemberId: s.toMemberId || '',
        amount: Number(s.amount) || 0,
        currency: isValidCurrency(s.currency) ? s.currency : 'INR',
        date: s.date || new Date().toISOString().slice(0, 10),
        note: s.note,
        createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
      }))
    : [];

  const activeTripId =
    obj.activeTripId && trips.some((t) => t.id === obj.activeTripId)
      ? obj.activeTripId
      : trips[0].id;

  const viewerMemberIdByTrip: Record<string, string> = { ...(obj.viewerMemberIdByTrip || {}) };
  for (const trip of trips) {
    if (
      !viewerMemberIdByTrip[trip.id] ||
      !trip.members.some((m) => m.id === viewerMemberIdByTrip[trip.id])
    ) {
      if (trip.members[0]) {
        viewerMemberIdByTrip[trip.id] = trip.members[0].id;
      }
    }
  }

  return {
    version: 1,
    trips,
    expenses,
    settlements,
    activeTripId,
    viewerMemberIdByTrip,
  };
}

function loadInitialState(): SplitnPayStoreState {
  if (typeof window === 'undefined') return createInitialSeedState();

  try {
    const primary = window.localStorage.getItem(STORAGE_KEY);
    if (primary) {
      const parsed = normalizeState(JSON.parse(primary));
      if (parsed) return parsed;
    }

    for (const legacyKey of LEGACY_KEYS) {
      const legacy = window.localStorage.getItem(legacyKey);
      if (legacy) {
        const parsed = normalizeState(JSON.parse(legacy));
        if (parsed) return parsed;
      }
    }
  } catch {
    // Fall back safely if localStorage is corrupted or restricted
  }

  return createInitialSeedState();
}

export function useSplitnPayStore() {
  const [state, setState] = useState<SplitnPayStoreState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const activeTrip =
    state.trips.find((t) => t.id === state.activeTripId) ?? state.trips[0];

  const activeViewerId =
    (activeTrip && state.viewerMemberIdByTrip[activeTrip.id]) ||
    activeTrip?.members[0]?.id ||
    '';

  const setActiveTrip = useCallback((tripId: string) => {
    setState((prev) => ({ ...prev, activeTripId: tripId }));
  }, []);

  const setViewerMember = useCallback((tripId: string, memberId: string) => {
    setState((prev) => ({
      ...prev,
      viewerMemberIdByTrip: {
        ...prev.viewerMemberIdByTrip,
        [tripId]: memberId,
      },
    }));
  }, []);

  const updateTripHomeCurrency = useCallback((tripId: string, homeCurrency: CurrencyCode) => {
    setState((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => (t.id === tripId ? { ...t, homeCurrency } : t)),
    }));
  }, []);

  const updateTripFxRates = useCallback((tripId: string, fxRates: FxRates) => {
    setState((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => (t.id === tripId ? { ...t, fxRates } : t)),
    }));
  }, []);

  const createTrip = useCallback(
    (payload: {
      name: string;
      destination?: string;
      homeCurrency: CurrencyCode;
      memberNames: string[];
    }) => {
      const id = `trip-${Date.now()}`;
      const cleanNames = payload.memberNames
        .map((n) => n.trim())
        .filter(Boolean);
      const uniqueNames = cleanNames.length > 0 ? cleanNames : ['You', 'Friend'];
      const members: Member[] = uniqueNames.map((name, idx) => ({
        id: `m-${id}-${idx}`,
        name,
        color: MEMBER_PALETTE[idx % MEMBER_PALETTE.length],
      }));

      const newTrip: Trip = {
        id,
        name: payload.name.trim() || 'New Trip',
        destination: payload.destination?.trim() || undefined,
        homeCurrency: payload.homeCurrency,
        members,
        fxRates: { ...DEFAULT_FX_RATES },
        createdAt: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        trips: [newTrip, ...prev.trips],
        activeTripId: id,
        viewerMemberIdByTrip: {
          ...prev.viewerMemberIdByTrip,
          [id]: members[0].id,
        },
      }));
    },
    []
  );

  const updateTrip = useCallback(
    (
      tripId: string,
      updates: {
        name: string;
        destination?: string;
        homeCurrency: CurrencyCode;
        fxRates: FxRates;
        members: Member[];
      }
    ) => {
      setState((prev) => ({
        ...prev,
        trips: prev.trips.map((t) =>
          t.id === tripId
            ? {
                ...t,
                name: updates.name.trim() || t.name,
                destination: updates.destination?.trim() || undefined,
                homeCurrency: updates.homeCurrency,
                fxRates: updates.fxRates,
                members: updates.members,
              }
            : t
        ),
      }));
    },
    []
  );

  const deleteTrip = useCallback((tripId: string) => {
    setState((prev) => {
      if (prev.trips.length <= 1) return prev;
      const remaining = prev.trips.filter((t) => t.id !== tripId);
      return {
        ...prev,
        trips: remaining,
        expenses: prev.expenses.filter((e) => e.tripId !== tripId),
        settlements: prev.settlements.filter((s) => s.tripId !== tripId),
        activeTripId: prev.activeTripId === tripId ? remaining[0].id : prev.activeTripId,
      };
    });
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
  }, []);

  const updateExpense = useCallback(
    (expenseId: string, updates: Omit<Expense, 'id' | 'createdAt'>) => {
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === expenseId ? { ...e, ...updates } : e
        ),
      }));
    },
    []
  );

  const deleteExpense = useCallback((expenseId: string) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
  }, []);

  const markTransferSettled = useCallback(
    (
      tripId: string,
      fromMemberId: string,
      toMemberId: string,
      amount: number,
      currency: CurrencyCode,
      note = 'Settled balance'
    ): string | null => {
      if (amount <= 0) return null;
      const settlement: Settlement = {
        id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tripId,
        fromMemberId,
        toMemberId,
        amount,
        currency,
        date: new Date().toISOString().slice(0, 10),
        note,
        createdAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        settlements: [settlement, ...prev.settlements],
      }));
      return settlement.id;
    },
    []
  );

  const markMemberBalanceSettled = useCallback(
    (
      tripId: string,
      memberId: string,
      suggestions: TransferSuggestion[],
      homeCurrency: CurrencyCode
    ) => {
      const matching = suggestions.filter(
        (s) => s.fromMemberId === memberId || s.toMemberId === memberId
      );
      if (matching.length === 0) return;

      const today = new Date().toISOString().slice(0, 10);
      const baseTime = Date.now();
      const newSettlements: Settlement[] = matching.map((t, idx) => ({
        id: `set-${baseTime}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        tripId,
        fromMemberId: t.fromMemberId,
        toMemberId: t.toMemberId,
        amount: t.amountHome,
        currency: homeCurrency,
        date: today,
        note: 'One-tap settled',
        createdAt: baseTime + idx,
      }));

      setState((prev) => ({
        ...prev,
        settlements: [...newSettlements, ...prev.settlements],
      }));
    },
    []
  );

  const reopenSettlement = useCallback((settlementId: string) => {
    setState((prev) => ({
      ...prev,
      settlements: prev.settlements.filter((s) => s.id !== settlementId),
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialSeedState();
    setState(fresh);
  }, []);

  return {
    state,
    activeTrip,
    activeViewerId,
    setActiveTrip,
    setViewerMember,
    updateTripHomeCurrency,
    updateTripFxRates,
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
  };
}
