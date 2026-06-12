'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, Compass, Target, Users, BarChart3, Lightbulb, Lock, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  ALL_MODULES, COLOR_MAP,
  loadProgress,
  getModuleById,
  loadProgressFromAPI,
  isLessonUnlocked,
} from '@/lib/course-data';

const MODULE_ICONS: Record<string, React.ElementType> = {
  Compass, Target, Users, BarChart3,
};

export default function ModulePage() {
  const params = useParams();
  const moduleId = params.moduleId as string;
  const mod = getModuleById(moduleId);
  const { session, profile } = useAuth();
  const isEfficiency = profile?.role === 'efficiency_user';
  const userId = profile?.id;
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [unlockMap, setUnlockMap] = useState<Record<number, boolean>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = session?.access_token;
    if (token) {
      loadProgressFromAPI(token, userId).then(setProgress);
    } else {
      setProgress(loadProgress(userId));
    }
  }, [session?.access_token, userId]);

  // 检查每课是否解锁
  useEffect(() => {
    if (!mounted || !mod) return;
    const map: Record<number, boolean> = {};
    mod.lessons.forEach(l => {
      map[l.num] = isLessonUnlocked(l.num);
    });
    setUnlockMap(map);
  }, [mod, mounted]);

  if (!mod) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">模块不存在</p>
          <Link href="/learning-path" className="mt-4 inline-block text-blue-600 hover:underline">返回学习中心</Link>
        </div>
      </div>
    );
  }

  const colors = COLOR_MAP[mod.color];
  const IconComp = MODULE_ICONS[mod.icon] || Compass;
  const modLearned = mod.lessons.filter(l => progress[l.id]).length;
  const modTotal = mod.lessons.length;
  const modPct = modTotal > 0 ? Math.round((modLearned / modTotal) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      {/* 返回按钮 */}
      <Link
        href="/learning-path"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回学习中心
      </Link>

      {/* 模块标题卡 */}
      <div className={`rounded-2xl border p-5 sm:p-6 mb-2 ${colors.headerBg} ${colors.headerBorder}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-11 h-11 ${colors.iconBg} rounded-xl flex items-center justify-center`}>
            <IconComp className={`w-5 h-5 ${colors.accent}`} />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${colors.accent}`}>{mod.name}</h1>
            <p className="text-sm text-gray-500">{modLearned}/{modTotal} 已学 · {modPct}%</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed mt-2">{mod.desc}</p>

        {/* 模块三特殊提示 */}
        {mod.id === 'team' && (
          <div className="mt-3 bg-orange-100/80 border border-orange-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 leading-relaxed">即使你现在是1人单打团队，这些沟通协作、带人带教的底层能力，也是你未来升职、晋级、坐稳管理岗的核心硬本事，提前学、提前储备，机会来临时才能接得住。</p>
          </div>
        )}

        {/* 顺序学习提示 */}
        <div className="mt-3 bg-blue-100/80 border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">课程需按顺序学习，提交课后作业后自动解锁下一课</p>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-white/60 rounded-full h-1.5 mt-3">
          <div className={`${colors.progressBg} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${modPct}%`}} />
        </div>
      </div>

      {/* 课表列表 */}
      <div className="mt-6 space-y-3">
        {mod.lessons.map((lesson, lessonIdx) => {
          const done = !!progress[lesson.id];
          const isUnlocked = mounted ? (unlockMap[lesson.num] ?? true) : true;

          // efficiency_user: only first lesson (index 0) is accessible, rest locked as "管理版专属"
          const isEfficiencyLocked = isEfficiency && lessonIdx > 0;

          if (isEfficiencyLocked) {
            return (
              <div
                key={lesson.id}
                className="block bg-white rounded-xl border border-gray-100 p-4 sm:p-5 opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-gray-100 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-gray-400">
                      第{lesson.num}课：{lesson.title}
                    </h3>
                    <p className="text-sm mt-0.5 text-amber-600 flex items-center gap-1">
                      <Lock className="w-3 h-3" />管理版专属
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          if (!isUnlocked) {
            return (
              <div
                key={lesson.id}
                className="block bg-white rounded-xl border border-gray-100 p-4 sm:p-5 opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-gray-100 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-gray-400">
                      第{lesson.num}课：{lesson.title}
                    </h3>
                    <p className="text-sm mt-0.5 text-amber-600">
                      请先完成上一课的课后作业
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={lesson.id}
              href={`/learning-path/${mod.id}/${lesson.num}`}
              className={`block bg-white rounded-xl border p-4 sm:p-5 hover:shadow-md transition-all group ${
                done ? 'border-gray-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* 序号/状态 */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : `${colors.iconBg} ${colors.accent}`
                }`}>
                  {done ? <Check className="w-5 h-5" /> : lesson.num}
                </div>

                {/* 标题 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-base ${done ? 'text-gray-400' : 'text-gray-900'}`}>
                      第{lesson.num}课：{lesson.title}
                    </h3>
                    {isEfficiency && lessonIdx === 0 && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-cyan-100 text-cyan-700 font-semibold rounded-full">
                        <Zap className="w-3 h-3" />免费试学
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 line-clamp-1 ${done ? 'text-gray-400' : 'text-gray-500'}`}>
                    🎯 {lesson.painPoint.slice(0, 50)}…
                  </p>
                </div>

                {/* 状态/箭头 */}
                <div className="shrink-0 flex items-center gap-2">
                  {done && <span className="text-xs text-emerald-600 font-medium">已学</span>}
                  <svg className={`w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
