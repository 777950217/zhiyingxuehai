'use client';

import { Target } from 'lucide-react';

export default function MyKpiPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-6 h-6 text-[#2B7DE9]" />
          个人KPI
        </h1>
        <p className="text-gray-500 mt-1">查看你的KPI考核指标和得�?/p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">KPI数据加载�?/h3>
        <p className="text-gray-500 text-sm">你的KPI指标由主管设定，如有疑问请联系主�?/p>
      </div>
    </div>
  );
}
