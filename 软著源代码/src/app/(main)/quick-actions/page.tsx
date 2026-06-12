'use client';

import { Zap } from 'lucide-react';
import Link from 'next/link';

const QUICK_ACTIONS = [
  { label: '查询订单', href: '/work-orders', color: 'bg-blue-50 text-blue-700' },
  { label: 'AI急救', href: '/ai-assistant', color: 'bg-purple-50 text-purple-700' },
  { label: '话术练兵', href: '/practice', color: 'bg-orange-50 text-orange-700' },
  { label: '知识问答', href: '/knowledge-qa', color: 'bg-green-50 text-green-700' },
  { label: '我的课程', href: '/learning-center', color: 'bg-sky-50 text-sky-700' },
  { label: '消息通知', href: '/notifications', color: 'bg-pink-50 text-pink-700' },
];

export default function QuickActionsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#2B7DE9]" />
          快捷操作
        </h1>
        <p className="text-gray-500 mt-1">一键直达常用功�?/p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`${action.color} rounded-xl p-6 text-center hover:shadow-md transition-shadow`}
          >
            <span className="text-base font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
