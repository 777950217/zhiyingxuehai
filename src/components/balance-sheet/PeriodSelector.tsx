'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PeriodSelectorProps {
  selectedPeriod: string;
  periodType: 'month' | 'quarter' | 'year';
  compareType: 'month' | 'year' | 'none';
  onPeriodChange: (period: string) => void;
  onPeriodTypeChange: (type: 'month' | 'quarter' | 'year') => void;
  onCompareTypeChange: (type: 'month' | 'year' | 'none') => void;
}

export function PeriodSelector({
  selectedPeriod,
  periodType,
  compareType,
  onPeriodChange,
  onPeriodTypeChange,
  onCompareTypeChange,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  
  const quickOptions = [
    { label: '本月', value: getCurrentMonth() },
    { label: '上月', value: getLastMonth() },
    { label: '本季度', value: getCurrentQuarter() },
    { label: '上季度', value: getLastQuarter() },
    { label: '本年', value: getCurrentYear() },
    { label: '上年', value: getLastYear() },
  ];

  function getCurrentMonth(): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  function getLastMonth(): string {
    const date = new Date(now);
    date.setMonth(date.getMonth() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  function getCurrentQuarter(): string {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const month = (quarter - 1) * 3 + 1;
    return `${now.getFullYear()}-${String(month).padStart(2, '0')}-01`;
  }

  function getLastQuarter(): string {
    const date = new Date(now);
    date.setMonth(date.getMonth() - 3);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const month = (quarter - 1) * 3 + 1;
    return `${date.getFullYear()}-${String(month).padStart(2, '0')}-01`;
  }

  function getCurrentYear(): string {
    return `${now.getFullYear()}-01-01`;
  }

  function getLastYear(): string {
    return `${now.getFullYear() - 1}-01-01`;
  }

  const formatPeriod = (period: string): string => {
    const date = new Date(period);
    if (periodType === 'year') {
      return `${date.getFullYear()}年`;
    } else if (periodType === 'quarter') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}年第${quarter}季度`;
    } else {
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatPeriod(selectedPeriod)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="start">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">快捷选择</p>
              <div className="grid grid-cols-2 gap-2">
                {quickOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onPeriodChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedPeriod === option.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">时间维度</p>
              <div className="flex gap-2">
                {(['month', 'quarter', 'year'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onPeriodTypeChange(type)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      periodType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'month' ? '月度' : type === 'quarter' ? '季度' : '年度'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
        {(['none', 'month', 'year'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onCompareTypeChange(type)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              compareType === type
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {type === 'none' ? '无对比' : type === 'month' ? '环比' : '同比'}
          </button>
        ))}
      </div>
    </div>
  );
}