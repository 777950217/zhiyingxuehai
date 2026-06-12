'use client';

import React from 'react';
import Link from 'next/link';
import { Wrench, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getToolsForCourse } from '@/lib/tool-course-map';

interface GoPracticeProps {
  lessonId: string;
}

/** 个人版可访问的工具路径（学习工具，非管理工具） */
const PERSONAL_ALLOWED_TOOLS: string[] = [];

/**
 * 课程完成后「去实操」引导组件
 * - 个人版：只引导到KPI规划器等学习工具
 * - 专业版/旗舰版：引导到全部管理工具
 */
export default function GoPractice({ lessonId }: GoPracticeProps) {
  const { profile } = useAuth();
  const mapping = getToolsForCourse(lessonId);
  if (!mapping) return null;

  const isPersonal = profile?.role === 'personal_user' || profile?.role === 'staff';

  // 根据角色筛选可用工具
  const availableTools = isPersonal
    ? mapping.tools.filter((t) => PERSONAL_ALLOWED_TOOLS.includes(t.path))
    : mapping.tools;

  // 锁定的工具（个人版看不到的管理工具）
  const lockedTools = isPersonal
    ? mapping.tools.filter((t) => !PERSONAL_ALLOWED_TOOLS.includes(t.path))
    : [];

  if (availableTools.length === 0 && lockedTools.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-900">学完去实操</span>
      </div>
      <div className="space-y-2">
        {availableTools.map((tool) => (
          <Link
            key={tool.path}
            href={tool.path}
            className="flex items-center justify-between rounded-lg bg-white border border-emerald-100 px-3 py-2 hover:border-emerald-300 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm text-gray-700 group-hover:text-emerald-700">{tool.name}</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium group-hover:text-emerald-700">
              {tool.label}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
        {lockedTools.map((tool) => (
          <div
            key={tool.path}
            className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 opacity-60"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-400">{tool.name}</span>
            </div>
            <span className="text-xs text-gray-400">专业版功能</span>
          </div>
        ))}
      </div>
    </div>
  );
}
