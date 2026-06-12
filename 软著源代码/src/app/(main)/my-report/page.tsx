'use client';

import { BarChart3 } from 'lucide-react';

export default function MyReportPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#2B7DE9]" />
          个人工作报表
        </h1>
        <p className="text-gray-500 mt-1">查看你的工作量统计和绩效报表</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">工作报表数据加载�?/h3>
        <p className="text-gray-500 text-sm">你的工作数据由系统自动统计生�?/p>
      </div>
    </div>
  );
}
