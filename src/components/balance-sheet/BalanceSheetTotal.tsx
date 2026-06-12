'use client';

import { BalanceSheetCategory } from '@/types/finance';

interface BalanceSheetTotalProps {
  title: string;
  amount: number;
  previousAmount?: number;
  showComparison?: boolean;
}

export function BalanceSheetTotal({
  title,
  amount,
  previousAmount,
  showComparison = true,
}: BalanceSheetTotalProps) {
  const formatAmount = (value: number): string => {
    if (value === 0) return '-';
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getChangeClass = (current: number, previous: number | undefined): string => {
    if (previous === undefined || previous === 0) return 'text-gray-400';
    const change = current - previous;
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangePercent = (current: number, previous: number | undefined): string => {
    if (previous === undefined || previous === 0) return '';
    const percent = ((current - previous) / previous * 100);
    return `(${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%)`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold text-lg">{title}</span>
        <div className="flex items-center gap-4">
          {showComparison && previousAmount !== undefined && (
            <div className="text-right">
              <p className="text-gray-400 text-sm">上期</p>
              <p className={`font-medium ${getChangeClass(amount, previousAmount)}`}>
                {formatAmount(previousAmount)}
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-gray-400 text-sm">本期</p>
            <p className={`font-bold text-xl text-white ${amount < 0 ? 'text-red-400' : ''}`}>
              {formatAmount(amount)}
              {showComparison && previousAmount !== undefined && previousAmount !== 0 && (
                <span className={`ml-2 text-sm ${getChangeClass(amount, previousAmount)}`}>
                  {getChangePercent(amount, previousAmount)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}