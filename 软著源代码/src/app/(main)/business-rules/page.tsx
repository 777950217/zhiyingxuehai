'use client';

import { BookOpen } from 'lucide-react';

export default function BusinessRulesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#2B7DE9]" />
          业务规范
        </h1>
        <p className="text-gray-500 mt-1">平台规则、服务标准和操作规范</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">业务规范内容加载�?/h3>
        <p className="text-gray-500 text-sm">包含各平台服务规范、退换货流程、赔付标准等</p>
      </div>
    </div>
  );
}
