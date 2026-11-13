import { CurrencyCode, Expense, FxRates } from '../types/splitnpay';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'JPY'];

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    locale: 'en-IN',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'en-IE',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimals: 0,
    locale: 'ja-JP',
  },
};

/** Baseline rates expressed as units per 1 USD */
export const DEFAULT_FX_RATES: FxRates = {
  USD: 1,
  INR: 84.5,
  EUR: 0.925,
  JPY: 153.5,
};

export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCY_META[code]?.symbol ?? '₹';
}

export function getCurrencyDecimals(code: CurrencyCode): number {
  return CURRENCY_META[code]?.decimals ?? 2;
}

export function roundCurrency(amount: number, currency: CurrencyCode): number {
  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function getExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rates: FxRates = DEFAULT_FX_RATES
): number {
  if (from === to) return 1;
  const fromPerUsd = rates[from] || DEFAULT_FX_RATES[from];
  const toPerUsd = rates[to] || DEFAULT_FX_RATES[to];
  if (!fromPerUsd || fromPerUsd <= 0) return 1;
  return toPerUsd / fromPerUsd;
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: FxRates = DEFAULT_FX_RATES,
  customRate?: { rate: number; targetCurrency: CurrencyCode }
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return roundCurrency(amount, to);
  if (customRate && customRate.targetCurrency === to && customRate.rate > 0) {
    return roundCurrency(amount * customRate.rate, to);
  }
  const rate = getExchangeRate(from, to, rates);
  return roundCurrency(amount * rate, to);
}

export function getExpenseHomeAmount(
  expense: Pick<Expense, 'amount' | 'currency' | 'customRate'>,
  homeCurrency: CurrencyCode,
  rates: FxRates
): number {
  return convertAmount(expense.amount, expense.currency, homeCurrency, rates, expense.customRate);
}

export function getEffectiveExpenseRate(
  expense: Pick<Expense, 'currency' | 'customRate'>,
  homeCurrency: CurrencyCode,
  rates: FxRates
): number {
  if (expense.currency === homeCurrency) return 1;
  if (expense.customRate && expense.customRate.targetCurrency === homeCurrency && expense.customRate.rate > 0) {
    return expense.customRate.rate;
  }
  return getExchangeRate(expense.currency, homeCurrency, rates);
}

export function formatAmountNumber(amount: number, currency: CurrencyCode): string {
  const meta = CURRENCY_META[currency];
  const safe = Number.isFinite(amount) ? Math.abs(amount) : 0;
  return new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(safe);
}

export function formatMoneyParts(
  amount: number,
  currency: CurrencyCode,
  options?: { signed?: boolean }
): { sign: string; symbol: string; number: string; code: CurrencyCode } {
  const decimals = getCurrencyDecimals(currency);
  const threshold = decimals === 0 ? 0.5 : 0.005;
  const isZero = Math.abs(amount) < threshold;
  const sign = isZero ? '' : amount < 0 ? '-' : options?.signed ? '+' : '';
  return {
    sign,
    symbol: getCurrencySymbol(currency),
    number: formatAmountNumber(isZero ? 0 : amount, currency),
    code: currency,
  };
}

export function formatMoneyString(
  amount: number,
  currency: CurrencyCode,
  options?: { signed?: boolean; includeCode?: boolean }
): string {
  const { sign, symbol, number, code } = formatMoneyParts(amount, currency, options);
  return `${sign}${symbol}${number}${options?.includeCode ? ` ${code}` : ''}`;
}

export function isNearZero(amount: number, currency: CurrencyCode): boolean {
  const decimals = getCurrencyDecimals(currency);
  const threshold = decimals === 0 ? 0.5 : 0.01;
  return Math.abs(amount) < threshold;
}
