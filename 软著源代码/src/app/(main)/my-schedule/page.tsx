'use client';

import { Calendar } from 'lucide-react';

export default function MySchedulePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#2B7DE9]" />
          排班查看
        </h1>
        <p className="text-gray-500 mt-1">查看本周和下周的排班安排</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">排班信息加载�?/h3>
        <p className="text-gray-500 text-sm">请联系主管确认排班安�?/p>
      </div>

    </div>
  );
}
