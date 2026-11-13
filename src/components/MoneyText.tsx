import React from 'react';
import { CurrencyCode } from '../types/splitnpay';
import { formatMoneyParts } from '../utils/currency';

interface MoneyTextProps {
  amount: number;
  currency: CurrencyCode;
  signed?: boolean;
  showCode?: boolean;
  className?: string;
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  currency,
  signed = false,
  showCode = false,
  className = '',
}) => {
  const { sign, symbol, number, code } = formatMoneyParts(amount, currency, { signed });

  return (
    <span className={`tabular-nums inline-flex items-baseline ${className}`}>
      {sign && <span>{sign}</span>}
      <span className="text-[0.85em] font-semibold opacity-90">{symbol}</span>
      <span>{number}</span>
      {showCode && (
        <span className="ml-1 text-[0.68em] font-semibold uppercase tracking-wide opacity-65">
          {code}
        </span>
      )}
    </span>
  );
};
