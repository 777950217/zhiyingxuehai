'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BalanceSheetItem } from '@/types/finance';

interface BalanceSheetSectionProps {
  title: string;
  items: BalanceSheetItem[];
  total: number;
  previousTotal?: number;
  showComparison?: boolean;
}

export function BalanceSheetSection({
  title,
  items,
  total,
  previousTotal,
  showComparison = true,
}: BalanceSheetSectionProps) {
  const [expanded, setExpanded] = useState(true);

  const formatAmount = (value: number): string => {
    if (value === 0) return '-';
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getChangeClass = (current: number, previous: number | undefined): string => {
    if (previous === undefined || previous === 0) return 'text-gray-400';
    const change = current - previous;
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const renderItems = (items: BalanceSheetItem[], level: number = 0) => {
    return items.map((item, index) => {
      const hasChildren = item.children && item.children.length > 0;
      
      return (
        <div key={index}>
          <div
            className={`flex items-center justify-between py-2 px-3 hover:bg-gray-50 transition-colors cursor-pointer ${
              level === 0 ? 'font-medium' : 'text-sm'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={() => hasChildren && setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              {hasChildren && (
                <span className="w-4 h-4 flex items-center justify-center">
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </span>
              )}
              {!hasChildren && <span className="w-4" />}
              <span className={item.value < 0 ? 'text-red-600' : 'text-gray-700'}>
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {showComparison && item.previousValue !== undefined && (
                <span className={`text-sm ${getChangeClass(item.value, item.previousValue)}`}>
                  {formatAmount(item.previousValue)}
                </span>
              )}
              <span className={`font-medium ${item.value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatAmount(item.value)}
              </span>
            </div>
          </div>
          
          {hasChildren && expanded && (
            <div className="overflow-hidden">
              {renderItems(item.children!, level + 1)}
              <div
                className="flex items-center justify-between py-2 px-3 bg-gray-50 font-semibold"
                style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
              >
                <span className="text-gray-600">{item.name}合计</span>
                <span className="text-gray-900">{formatAmount(item.total || 0)}</span>
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 flex items-center justify-center">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </span>
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        <div className="flex items-center gap-4">
          {showComparison && previousTotal !== undefined && (
            <span className={`text-sm ${getChangeClass(total, previousTotal)}`}>
              {formatAmount(previousTotal)}
            </span>
          )}
          <span className="font-bold text-gray-900">{formatAmount(total)}</span>
        </div>
      </div>
      
      {expanded && (
        <div className="overflow-hidden">
          {renderItems(items)}
        </div>
      )}
    </div>
  );
}