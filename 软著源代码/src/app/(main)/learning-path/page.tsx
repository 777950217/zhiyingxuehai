'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Compass, Target, Users, BarChart3, ArrowRight, NotebookPen, Lock, Zap, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  ALL_MODULES, COLOR_MAP,
  loadProgress, getLearnedCount, getTotalLessons,
  loadProgressFromAPI, saveProgress,
} from '@/lib/course-data';

const MODULE_ICONS: Record<string, React.ElementType> = {
  Compass, Target, Users, BarChart3,
};

export default function LearningPathPage() {
  const { session, profile } = useAuth();
  const isEfficiency = profile?.role === 'efficiency_user';
  const userId = profile?.id;
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [trialActive, setTrialActive] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    // Check grayscale trial bypass
    if (isEfficiency && typeof window !== 'undefined') {
      const active = sessionStorage.getItem('efficiency_trial_active');
      if (active) {
        sessionStorage.removeItem('efficiency_trial_active');
        setTrialActive(true);
      }
    }
  }, [isEfficiency]);

  useEffect(() => {
    const token = session?.access_token;
    if (token) {
      loadProgressFromAPI(token, userId).then(setProgress);
    } else {
      setProgress(loadProgress(userId));
    }
  }, [session?.access_token, userId]);

  // Sync notes to progress
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem('knowledge-notes-v2');
      if (raw) {
        const notes = JSON.parse(raw) as Record<string, { userNote?: string; completed?: boolean }>;
        let changed = false;
        const updated = { ...progress };
        for (const [id, note] of Object.entries(notes)) {
          if ((note.userNote?.trim() || note.completed) && !updated[id]) {
            updated[id] = true;
            changed = true;
          }
        }
        if (changed) {
          setProgress(updated);
          saveProgress(updated, userId);
        }
      }
    } catch { /* ignore */ }
  }, [mounted, progress, userId]);

  const learnedCount = getLearnedCount(progress);
  const totalLessons = getTotalLessons();
  const progressPct = totalLessons > 0 ? Math.round((learnedCount / totalLessons) * 100) : 0;

  // efficiency_user without trial active �?show locked page
  if (isEfficiency && !trialActive) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">管理版专属功�?/h2>
          <p className="text-sm text-gray-500 mb-6">
            学习中心�?5课管理课程体系，为管理版专属权限。解�?80管理版即可开启全套管理课�?+ 深度AI诊断 + 团队管控工具�?
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/contact"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              了解管理�?
            </Link>
            <Link
              href="/"
              className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      {/* 页头 */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学习中心</h1>
          <p className="text-sm text-gray-500">4大模块进阶体系，学完就能�?/p>
        </div>
      </div>

      {/* 进度�?*/}
      <div className="mb-8 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">学习进度</span>
          <span className="text-sm font-medium text-blue-600">已学 {learnedCount}/{totalLessons} �?({progressPct}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-[#2B7DE9] h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* 课程笔记入口 */}
      <Link
        href="/knowledge-notes"
        className="flex items-center gap-3 mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
          <NotebookPen className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-indigo-800">课程笔记与作�?/h3>
          <p className="text-xs text-indigo-600/70">查看每课核心知识点、完成课后落地作业、提交AI批改</p>
        </div>
        <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* 4个模块卡�?*/}
      <div className="space-y-4">
        {ALL_MODULES.map((mod, modIdx) => {
          const colors = COLOR_MAP[mod.color];
          const IconComp = MODULE_ICONS[mod.icon] || BookOpen;
          const modLearned = mod.lessons.filter(l => progress[l.id]).length;
          const modTotal = mod.lessons.length;
          const modPct = modTotal > 0 ? Math.round((modLearned / modTotal) * 100) : 0;
          const isFirstModule = modIdx === 0;

          // efficiency_user: first module is trial, others locked
          if (isEfficiency && !isFirstModule) {
            return (
              <div
                key={mod.id}
                className="block rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6 opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <IconComp className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-lg text-gray-400">{mod.name}</h2>
                      <span className="flex items-center gap-1 text-xs text-amber-600"><Lock className="w-3 h-3" />管理版专�?/span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{mod.desc}</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={mod.id}
              href={`/learning-path/${mod.id}`}
              className={`block rounded-2xl border p-5 sm:p-6 ${colors.bg} ${colors.border} hover:shadow-lg transition-all cursor-pointer group`}
            >
              <div className="flex items-start gap-4">
                {/* 图标 */}
                <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                  <IconComp className={`w-6 h-6 ${colors.accent}`} />
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className={`font-bold text-lg ${colors.accent}`}>{mod.name}</h2>
                      {isEfficiency && isFirstModule && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-cyan-100 text-cyan-700 font-semibold rounded-full">
                          <Zap className="w-3 h-3" />免费试学
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">{mod.desc}</p>

                  {/* 进度 */}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-gray-500">{modTotal}节课</span>
                    <div className="flex-1 max-w-[200px]">
                      <div className="bg-white/60 rounded-full h-1.5">
                        <div className={`${colors.progressBg} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${modPct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{modLearned}/{modTotal} 已学</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div className="mt-10 mb-4 bg-white rounded-xl border border-gray-200 p-5 text-center">
        <p className="text-sm text-gray-500">课程是根，AI是枝。学完课程再配合AI工具，效果翻倍�?/p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Link href="/data-input" className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">数据录入</Link>
          <Link href="/ai-reports" className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">周报月报</Link>
          <Link href="/chat-check" className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">对话自检</Link>
          <Link href="/cda-analysis" className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">CDA分析</Link>
          <Link href="/knowledge-notes" className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">课程笔记</Link>
        </div>
      </div>
    </div>
  );
}
