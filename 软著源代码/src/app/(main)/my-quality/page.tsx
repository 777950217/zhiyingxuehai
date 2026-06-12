'use client';

import { ShieldCheck } from 'lucide-react';
import QualityDeclineAlert from '@/components/quality-decline-alert';

export default function MyQualityPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <QualityDeclineAlert />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#2B7DE9]" />
          个人质检评分
        </h1>
        <p className="text-gray-500 mt-1">查看你的质检评分详情和改进建�?/p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">质检评分数据加载�?/h3>
        <p className="text-gray-500 text-sm">你的质检评分由主管定期抽查评�?/p>
      </div>

    </div>
  );
}
