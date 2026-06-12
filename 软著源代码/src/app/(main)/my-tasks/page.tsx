'use client';

import { useAuth } from '@/lib/auth-context';
import { CheckSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function MyTasksPage() {
  const { profile } = useAuth();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-[#2B7DE9]" />
          我的待办
        </h1>
        <p className="text-gray-500 mt-1">查看和处理分配给你的待办任务</p>
      </div>

      {/* Placeholder content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckSquare className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无待办任务</h3>
        <p className="text-gray-500 text-sm mb-6">所有任务已处理完毕，做得不错！</p>
        <Link
          href="/my-workspace"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2B7DE9] text-white rounded-lg hover:bg-[#1a6dd4] transition-colors text-sm font-medium"
        >
          返回工作�?<ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
