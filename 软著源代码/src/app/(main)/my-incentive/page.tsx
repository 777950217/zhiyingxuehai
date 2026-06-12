'use client';

import { Award } from 'lucide-react';

export default function MyIncentivePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-[#2B7DE9]" />
          个人激励积�?
        </h1>
        <p className="text-gray-500 mt-1">查看你获得的激励积分和兑换记录</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">激励积分数据加载中</h3>
        <p className="text-gray-500 text-sm">做好服务、拿到好评、主动学习都可以获得积分</p>
      </div>
    </div>
  );
}
