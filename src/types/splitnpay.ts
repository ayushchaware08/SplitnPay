export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'JPY';

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Stay & Lodging'
  | 'Transport'
  | 'Activities'
  | 'Shopping'
  | 'Other';

export type SplitMode = 'equal' | 'exact' | 'percent';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface FxRates {
  INR: number;
  USD: number;
  EUR: number;
  JPY: number;
}

export interface ExpenseSplit {
  memberId: string;
  /** Weight or value depending on splitMode: omitted/ignored for equal, exact bill currency amount for exact, percentage 0-100 for percent */
  value: number;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  totalPrice: number;
  claimantIds: string[];
}

export interface ReceiptBreakdown {
  items: ReceiptItem[];
  tax: number;
  tip: number;
  discount: number;
  rawText?: string;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  amount: number; // In original `currency`
  currency: CurrencyCode;
  paidById: string;
  splitMode: SplitMode;
  participantIds: string[];
  splits: ExpenseSplit[];
  /** Optional custom override rate from `currency` -> `customRateTargetCurrency` */
  customRate?: {
    rate: number;
    targetCurrency: CurrencyCode;
  };
  /** Optional itemized receipt breakdown from Smart Receipt Capture */
  receiptBreakdown?: ReceiptBreakdown;
  notes?: string;
  createdAt: number;
}

export interface Settlement {
  id: string;
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  note?: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  name: string;
  destination?: string;
  homeCurrency: CurrencyCode;
  members: Member[];
  fxRates: FxRates;
  createdAt: number;
}

export interface MemberBalance {
  memberId: string;
  totalPaidHome: number;
  totalShareHome: number;
  settledPaidHome: number;
  settledReceivedHome: number;
  /** Positive = owed to member; Negative = member owes */
  netHome: number;
}

export interface TransferSuggestion {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amountHome: number;
}

export interface SplitnPayStoreState {
  version: number;
  trips: Trip[];
  expenses: Expense[];
  settlements: Settlement[];
  activeTripId: string;
  viewerMemberIdByTrip: Record<string, string>;
}
