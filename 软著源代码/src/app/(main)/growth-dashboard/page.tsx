'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  BookOpen, Target, Sparkles, ChevronRight, PlayCircle,
  GraduationCap, CheckCircle2, Clock, ArrowRight, Flame, PencilLine,
  Shield, Building2, Crown, Crosshair, Lock, MessageSquare,
  Lightbulb, Headset, AlertCircle, X, ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

/* ─── 类型定义 ─── */

interface CourseNextLesson {
  id: string;
  stage: number;
  lesson_number: number;
  title: string;
  duration_minutes: number;
  stageName: string;
}

interface CourseLastCompleted {
  id?: string;
  stage: number;
  lesson_number: string;
  title: string;
  stageName: string;
  completed_at: string;
}

interface CourseProgressData {
  nextLesson: CourseNextLesson | null;
  lastCompleted: CourseLastCompleted | null;
  isAllCompleted: boolean;
  totalCompleted: number;
  totalLessons: number;
  stageSummary: Record<number, { total: number; completed: number; name: string }>;
}

interface ToolRecommendation {
  icon: string;
  title: string;
  desc: string;
  href: string;
  fromLesson: string;
}

interface LearningContextData {
  recommendations: ToolRecommendation[];
  totalCompleted: number;
  totalLessons: number;
  isAllCompleted: boolean;
  recentlyCompleted: { id: string; stage: number; lesson_number: number; title: string; completed_at: string }[];
}

/* ─── 4阶段配置 ─── */

const STAGES = [
  {
    num: 1,
    name: '角色认知',
    desc: '话术+质检+成本管控',
    lessons: ['1.1 客服主管到底管什�?, '1.2 话术标准�?, '1.3 质检入门', '1.4 售后成本管控', '1.5 话术库搭�?],
    color: 'blue',
    badge: '🛡�?,
    badgeTitle: '稳住基本�?,
    bgColor: 'from-blue-50 to-sky-50',
    borderColor: 'border-blue-300',
    activeBg: 'from-blue-100 to-sky-100',
    textColor: 'text-blue-700',
    accentColor: 'bg-blue-600',
    progressBg: 'bg-blue-200',
    progressFill: 'bg-blue-600',
  },
  {
    num: 2,
    name: '目标管理',
    desc: 'KPI+排班+激�?数据',
    lessons: ['2.1 KPI制定', '2.2 排班优化', '2.3 质检体系', '2.4 话术审核', '2.5 数据驱动', '2.6 目标拆解'],
    color: 'emerald',
    badge: '🏗�?,
    badgeTitle: '团队自运�?,
    bgColor: 'from-emerald-50 to-green-50',
    borderColor: 'border-emerald-300',
    activeBg: 'from-emerald-100 to-green-100',
    textColor: 'text-emerald-700',
    accentColor: 'bg-emerald-600',
    progressBg: 'bg-emerald-200',
    progressFill: 'bg-emerald-600',
  },
  {
    num: 3,
    name: '团队带教',
    desc: '新人培训+排班+早会+激�?,
    lessons: ['3.1 团队沟�?, '3.2 情景模拟', '3.3 情绪管理', '3.4 新人培训SOP', '3.5 正向激�?, '3.6 行为监控', '3.7 知识库更�?],
    color: 'amber',
    badge: '👑',
    badgeTitle: '带队伍的�?,
    bgColor: 'from-amber-50 to-yellow-50',
    borderColor: 'border-amber-300',
    activeBg: 'from-amber-100 to-yellow-100',
    textColor: 'text-amber-700',
    accentColor: 'bg-amber-500',
    progressBg: 'bg-amber-200',
    progressFill: 'bg-amber-500',
  },
  {
    num: 4,
    name: '业务落地',
    desc: 'SOP+亏损透视+审批+周报+红警',
    lessons: ['4.1 核心数据核算', '4.2 业务汇报公式', '4.3 周报月报写法', '4.4 质检五维体系', '4.5 售后成本管控', '4.6 SOP落地', '4.7 体系自检'],
    color: 'rose',
    badge: '🎯',
    badgeTitle: '操盘�?,
    bgColor: 'from-rose-50 to-red-50',
    borderColor: 'border-rose-300',
    activeBg: 'from-rose-100 to-red-100',
    textColor: 'text-rose-700',
    accentColor: 'bg-rose-600',
    progressBg: 'bg-rose-200',
    progressFill: 'bg-rose-600',
  },
] as const;

/* ─── 图标映射 ─── */

const STAGE_ICON_MAP: Record<number, React.ReactNode> = {
  1: <Shield className="w-6 h-6" />,
  2: <Building2 className="w-6 h-6" />,
  3: <Crown className="w-6 h-6" />,
  4: <Crosshair className="w-6 h-6" />,
};

const TOOL_ICON_MAP: Record<string, React.ReactNode> = {
  '💬': <MessageSquare className="w-5 h-5 text-blue-600" />,
  '🔍': <Target className="w-5 h-5 text-purple-600" />,
  '💰': <Lightbulb className="w-5 h-5 text-amber-600" />,
  '📋': <BookOpen className="w-5 h-5 text-emerald-600" />,
  '🎯': <Target className="w-5 h-5 text-red-600" />,
  '📊': <Crosshair className="w-5 h-5 text-sky-600" />,
  '📝': <GraduationCap className="w-5 h-5 text-indigo-600" />,
  '�?: <CheckCircle2 className="w-5 h-5 text-green-600" />,
};

/* ─── 主组�?─── */

export default function GrowthDashboardPage() {
  const { profile, session } = useAuth();
  const [courseProgress, setCourseProgress] = useState<CourseProgressData | null>(null);
  const [dailyPracticeDone, setDailyPracticeDone] = useState<boolean | null>(null);
  const [wrongPendingCount, setWrongPendingCount] = useState(0);
  const [learningContext, setLearningContext] = useState<LearningContextData | null>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── 首次引导 ───
  const [onboardStep, setOnboardStep] = useState(0); // 0=不显�? 1/2/3=步骤
  const [stageNotify, setStageNotify] = useState<number | null>(null); // 阶段提示

  // 检测首次登�?+ 阶段提示
  useEffect(() => {
    if (profile?.id) {
      const onboarded = localStorage.getItem(`personal_onboarded_${profile.id}`);
      if (!onboarded) {
        setOnboardStep(1);
      }
    }
  }, [profile?.id]);

  // 阶段提示检测（依赖课程数据�?
  useEffect(() => {
    if (!profile?.id || !courseProgress?.stageSummary) return;
    const stageNum = (() => {
      for (const s of STAGES) {
        const info = courseProgress.stageSummary[s.num];
        if (!info || info.completed < info.total) return s.num;
      }
      return 4;
    })();
    // 只对阶段2+弹出，阶�?是首次引导覆盖的
    if (stageNum > 1) {
      const key = `personal_stage_${stageNum}_notified_${profile.id}`;
      if (!localStorage.getItem(key)) {
        setStageNotify(stageNum);
      }
    }
  }, [profile?.id, courseProgress?.stageSummary]);

  const completeOnboard = useCallback(() => {
    if (profile?.id) {
      localStorage.setItem(`personal_onboarded_${profile.id}`, 'true');
    }
    setOnboardStep(0);
  }, [profile?.id]);

  const dismissStageNotify = useCallback(() => {
    if (profile?.id && stageNotify !== null) {
      localStorage.setItem(`personal_stage_${stageNotify}_notified_${profile.id}`, 'true');
    }
    setStageNotify(null);
  }, [profile?.id, stageNotify]);

  const fetchAllData = useCallback(async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setLoading(false); return; }

      // 并行请求
      const [courseRes, practiceRes, contextRes, wrongCountRes] = await Promise.allSettled([
        fetch('/api/courses?action=next-lesson', { headers: { authorization: `Bearer ${token}` } }),
        fetch('/api/daily-practice', { headers: { authorization: `Bearer ${token}` } }),
        fetch('/api/courses?action=learning-context', { headers: { authorization: `Bearer ${token}` } }),
        fetch('/api/daily-practice?action=wrong-count', { headers: { authorization: `Bearer ${token}` } }),
      ]);

      if (courseRes.status === 'fulfilled' && courseRes.value.ok) {
        setCourseProgress(await courseRes.value.json());
      }
      if (practiceRes.status === 'fulfilled' && practiceRes.value.ok) {
        const json = await practiceRes.value.json();
        setDailyPracticeDone(!!json.alreadyAnswered);
      }
      if (contextRes.status === 'fulfilled' && contextRes.value.ok) {
        setLearningContext(await contextRes.value.json());
      }
      if (wrongCountRes.status === 'fulfilled' && wrongCountRes.value.ok) {
        const json = await wrongCountRes.value.json();
        setWrongPendingCount(json.pendingCount || 0);
      }
    } catch (e) {
      console.error('Fetch data error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ─── 加载�?───
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sky-600 text-lg animate-pulse">加载�?..</div>
      </div>
    );
  }

  const displayName = profile?.displayName || '同学';
  const cp = courseProgress;

  // 优先从localStorage读取真实进度（与learning-path/knowledge-notes同步�?
  const localStorageProgress = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const uid = profile?.id || '';
      return JSON.parse(localStorage.getItem(`learning-path-progress_${uid}`) || localStorage.getItem('learning-path-progress') || '{}');
    } catch { return null; }
  })();
  const localStorageCompleted = localStorageProgress
    ? Object.values(localStorageProgress).filter(Boolean).length
    : 0;

  const totalCompleted = localStorageCompleted > 0
    ? localStorageCompleted
    : (cp?.totalCompleted ?? 0);
  const totalLessons = 25;
  const progressPct = totalLessons > 0 ? Math.round(totalCompleted / totalLessons * 100) : 0;

  // 确定当前阶段
  const currentStageNum = (() => {
    if (!cp?.stageSummary) return 1;
    for (const s of STAGES) {
      const info = cp.stageSummary[s.num];
      if (!info || info.completed < info.total) return s.num;
    }
    return 4;
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* ══════�?第一区：今日任务 ══════�?*/}
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 px-6 pt-8 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-white">欢迎回来，{displayName}�?/h1>
              <p className="text-sky-100 mt-1 text-base">
                {cp?.isAllCompleted
                  ? '全部课程已学完，保持实践持续精进'
                  : totalCompleted === 0
                    ? '开始你的第一课，迈出管理第一�?
                    : `你还�?{totalLessons - totalCompleted}课待学习，继续加油`}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3">
              <BookOpen className="w-5 h-5 text-white" />
              <span className="text-lg font-semibold text-white">
                {totalCompleted}<span className="text-sky-200 font-normal">/{totalLessons}</span> 节课
              </span>
            </div>
          </div>

          {/* 进度�?*/}
          <div className="w-full bg-white/20 rounded-full h-3 mb-6">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-300 h-3 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* 推荐路径提示 - 未开始任何课程时显示 */}
          {!cp?.nextLesson && !cp?.isAllCompleted && (
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-5 shadow-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-white">建议�?.1开�?/div>
                <div className="text-sm text-sky-100">客服主管到底管什�?�?你的第一节课�?5分钟搞定</div>
              </div>
              <Link
                href="/learning-center"
                className="bg-white text-sky-700 font-bold text-base px-5 py-2.5 rounded-xl hover:bg-sky-50 transition-colors shrink-0"
              >
                开始学�?
              </Link>
            </div>
          )}

          {/* 继续学习横幅 - 已开始课程后显示 */}
          {cp?.nextLesson && !cp?.isAllCompleted && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-sky-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {cp.lastCompleted ? (
                  <>
                    <div className="text-xs text-gray-400 mb-0.5">上次学到：{cp.lastCompleted.stageName} {cp.lastCompleted.stage}.{cp.lastCompleted.lesson_number} {cp.lastCompleted.title}</div>
                    <div className="text-lg font-bold text-gray-900">继续学习：{cp.nextLesson.stageName} {cp.nextLesson.stage}.{cp.nextLesson.lesson_number} {cp.nextLesson.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> 约{cp.nextLesson.duration_minutes}分钟
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-gray-900">继续学习：{cp.nextLesson.title}</div>
                    <div className="text-xs text-sky-600 font-medium">{cp.nextLesson.stageName} · 第{cp.nextLesson.lesson_number}�?/div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> 约{cp.nextLesson.duration_minutes}分钟
                    </div>
                  </>
                )}
              </div>
              <Link
                href="/learning-center"
                className="bg-sky-600 text-white font-bold text-base px-5 py-2.5 rounded-xl hover:bg-sky-700 transition-colors shrink-0"
              >
                继续学习
              </Link>
            </div>
          )}

          {/* 今日任务卡片 */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-sky-600" />
              今日任务
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 学习入口 */}
              <Link
                href={cp?.isAllCompleted ? '/ai-assistant' : '/learning-center'}
                className="flex items-center gap-4 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 hover:border-sky-400 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  {cp?.isAllCompleted ? (
                    <>
                      <div className="text-base font-bold text-gray-900">恭喜完成全部课程�?/div>
                      <div className="text-sm text-gray-500">来试试AI助手帮你落地</div>
                    </>
                  ) : (
                    <>
                      <div className="text-base font-bold text-gray-900">学习中心</div>
                      <div className="text-sm text-gray-500">4阶段25节课，系统提�?/div>
                    </>
                  )}
                </div>
                <ArrowRight className="w-6 h-6 text-sky-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all shrink-0" />
              </Link>

              {/* 每日一�?*/}
              <Link
                href="/learning-center"
                className="flex items-center gap-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                  {dailyPracticeDone
                    ? <CheckCircle2 className="w-7 h-7 text-white" />
                    : <PencilLine className="w-7 h-7 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-amber-900">
                    {dailyPracticeDone ? '�?今日一练已完成' : '📝 今日一练待完成'}
                  </div>
                  <div className="text-sm text-amber-600">
                    {dailyPracticeDone ? '明天再来挑战' : '每天1道实战题，保持手�?}
                  </div>
                </div>
                {dailyPracticeDone !== null && (
                  <Flame className={`w-7 h-7 shrink-0 ${dailyPracticeDone ? 'text-orange-500' : 'text-amber-400'}`} />
                )}
              </Link>

              {/* 错题提醒 */}
              {wrongPendingCount > 0 && (
                <Link
                  href="/learning-center"
                  className="flex items-center gap-4 py-3 px-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 hover:border-red-400 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-red-900">
                      你有 {wrongPendingCount} 道错题待复习
                    </div>
                    <div className="text-sm text-red-600">
                      去错题本看看，补上知识漏�?
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-red-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-6 mt-8">
        {/* ══════�?第二区：4阶段进度面板 ══════�?*/}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-sky-600" />
            学习路线�?阶段25节课
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAGES.map((stage) => {
              const info = cp?.stageSummary?.[stage.num];
              // 从localStorage计算该阶段完成数
              const stageLessonOffset = STAGES.slice(0, stage.num - 1).reduce((sum, s) => sum + s.lessons.length, 0);
              const stageLessonCount = stage.lessons.length;
              let localStorageStageCompleted = 0;
              if (localStorageProgress) {
                for (let i = stageLessonOffset; i < stageLessonOffset + stageLessonCount; i++) {
                  const key = `lesson-${i + 1}`;
                  if (localStorageProgress[key]) localStorageStageCompleted++;
                }
              }
              const completed = localStorageStageCompleted > 0
                ? localStorageStageCompleted
                : (info?.completed ?? 0);
              const total = stageLessonCount;
              const isDone = completed >= total && total > 0;
              const isCurrent = stage.num === currentStageNum && !isDone;
              const isNext = stage.num === currentStageNum + 1 && !isDone;
              const isLocked = !isDone && !isCurrent && !isNext;

              return (
                <div
                  key={stage.num}
                  className={`rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                    isDone
                      ? `bg-gradient-to-br ${stage.bgColor} ${stage.borderColor} shadow-md`
                      : isCurrent
                        ? `bg-gradient-to-br ${stage.activeBg} ${stage.borderColor} shadow-lg ring-2 ring-${stage.color}-300`
                        : isNext
                          ? `bg-white ${stage.borderColor} shadow-sm hover:shadow-md`
                          : 'bg-gray-50 border-gray-200 opacity-70'
                  }`}
                  onClick={() => setExpandedStage(expandedStage === stage.num ? null : stage.num)}
                >
                  {/* 阶段头部 */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDone ? stage.accentColor
                        : isCurrent ? stage.accentColor
                          : isNext ? 'bg-gray-200'
                            : 'bg-gray-100'
                    } text-white`}>
                      {isDone
                        ? <span className="text-lg">{stage.badge}</span>
                        : isLocked
                          ? <Lock className="w-5 h-5 text-gray-400" />
                          : <span className="text-white">{STAGE_ICON_MAP[stage.num]}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-base font-bold ${
                        isDone ? stage.textColor
                          : isCurrent ? stage.textColor
                            : isNext ? 'text-gray-700'
                              : 'text-gray-400'
                      }`}>
                        {stage.name}
                      </div>
                      <div className={`text-xs ${
                        isDone ? 'text-gray-600'
                          : isCurrent ? 'text-gray-600'
                            : 'text-gray-400'
                      }`}>
                        {isDone ? `�?${stage.badgeTitle}` : stage.desc}
                      </div>
                    </div>
                  </div>

                  {/* 进度�?*/}
                  <div className={`w-full rounded-full h-2 mb-2 ${isDone ? stage.progressBg : isCurrent ? stage.progressBg : 'bg-gray-200'}`}>
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${isDone ? stage.progressFill : isCurrent ? stage.progressFill : isNext ? 'bg-gray-300' : 'bg-gray-200'}`}
                      style={{ width: `${total > 0 ? Math.round(completed / total * 100) : 0}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isDone ? stage.textColor : isCurrent ? stage.textColor : 'text-gray-400'}`}>
                      {completed}/{total}
                    </span>
                    {isCurrent && cp?.nextLesson && (
                      <Link
                        href="/learning-center"
                        className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        下一�?<PlayCircle className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {isDone && (
                      <span className="text-xs font-medium text-green-600">已完�?�?/span>
                    )}
                  </div>

                  {/* 展开的课程列�?*/}
                  {expandedStage === stage.num && (
                    <div className="mt-3 pt-3 border-t border-gray-200/60 space-y-2">
                      {stage.lessons.map((lessonTitle, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx < completed
                              ? 'bg-green-500 text-white'
                              : idx === completed && isCurrent
                                ? `${stage.accentColor} text-white`
                                : 'bg-gray-200 text-gray-400'
                          }`}>
                            {idx < completed ? '�? : idx + 1}
                          </div>
                          <span className={idx < completed ? 'text-gray-600' : idx === completed && isCurrent ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                            {lessonTitle}
                          </span>
                        </div>
                      ))}
                      {!isLocked && (
                        <Link
                          href="/learning-center"
                          className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700 py-2 rounded-lg hover:bg-sky-50 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDone ? '回顾本阶�? : '去学�?} <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════�?第三区：学以致用 ══════�?*/}
        {learningContext && learningContext.recommendations.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              学完就用——AI帮你落地
            </h2>
            <p className="text-sm text-gray-500 mb-4">已学课程对应的实战工具，学了就能�?/p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {learningContext.recommendations.map((rec) => (
                <Link
                  key={rec.fromLesson}
                  href={rec.href}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    {TOOL_ICON_MAP[rec.icon] ?? <span className="text-lg">{rec.icon}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                      {rec.title}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{rec.desc}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      学完 {rec.fromLesson === 'all' ? '全部课程' : `�?{rec.fromLesson}课`} 解锁
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ══════�?第四区：功能入口�?宫格�?══════�?*/}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Headset className="w-6 h-6 text-purple-600" />
            常用工具
          </h2>
          <p className="text-sm text-gray-500 mb-4">学了就用，边学边�?/p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* 1. AI急救�?- 放大 + 标注 */}
            <Link
              href="/ai-assistant"
              className="col-span-2 sm:col-span-1 flex flex-col items-center gap-2 py-5 px-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 hover:border-purple-500 hover:shadow-lg transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-gray-900">AI急救�?/div>
                <div className="text-xs text-purple-600 font-semibold mt-0.5">3秒出方案</div>
              </div>
            </Link>

            {/* 2. 学习路径 - 放大 + 标注 */}
            <Link
              href="/learning-center"
              className="col-span-2 sm:col-span-1 flex flex-col items-center gap-2 py-5 px-4 rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100 border-2 border-sky-300 hover:border-sky-500 hover:shadow-lg transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-sky-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-gray-900">学习路径</div>
                <div className="text-xs text-sky-600 font-semibold mt-0.5">从零入门</div>
              </div>
            </Link>

            {/* 3. 话术练兵�?*/}
            <Link
              href="/practice"
              className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm font-medium text-gray-900">话术练兵�?/div>
            </Link>

            {/* 4. 知识笔记 */}
            <Link
              href="/knowledge-notes"
              className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PencilLine className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm font-medium text-gray-900">知识笔记</div>
            </Link>

            {/* 5. 模板�?*/}
            <Link
              href="/templates"
              className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm font-medium text-gray-900">模板�?/div>
            </Link>

          </div>
        </div>

        {/* ══════�?全部完成彩蛋 ══════�?*/}
        {cp?.isAllCompleted && (
          <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">🎓</div>
            <div className="text-xl font-bold text-gray-900 mb-1">恭喜完成全部课程�?/div>
            <div className="text-base text-gray-600 mb-4">你已经掌握了客服主管的核心管理能力，去领取你的结业证书吧</div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/learning-center"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors text-base"
              >
                <GraduationCap className="w-5 h-5" />
                领取结业证书
              </Link>
              <Link
                href="/ai-assistant"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-amber-300 text-amber-700 font-bold hover:bg-amber-50 transition-colors text-base"
              >
                <Sparkles className="w-5 h-5" />
                AI帮你落地
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ══════�?首次登录3步引导弹�?══════�?*/}
      {onboardStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* 步骤指示�?*/}
            <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-6 pt-6 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                        s < onboardStep ? 'bg-green-400 text-white' :
                        s === onboardStep ? 'bg-white text-sky-700 scale-110' :
                        'bg-white/30 text-white/60'
                      }`}>
                        {s < onboardStep ? '�? : s}
                      </div>
                      {s < 3 && (
                        <div className={`w-8 h-1 rounded-full ${
                          s < onboardStep ? 'bg-green-400' : 'bg-white/30'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={completeOnboard}
                  className="text-white/70 hover:text-white text-sm underline"
                >
                  跳过引导
                </button>
              </div>
              <div className="text-white/80 text-sm">�?{onboardStep} 步，�?3 �?/div>
            </div>

            {/* 步骤内容 */}
            <div className="px-8 py-8">
              {onboardStep === 1 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="text-5xl mb-3">📚</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">第一步，了解客服主管核心职责</h2>
                    <p className="text-base text-gray-600 leading-relaxed">
                      学习中心�?阶段课程体系，帮你从新手主管成长为操盘手�?br />
                      <span className="font-semibold text-sky-700">角色认知 �?目标管理 �?团队带教 �?业务落地</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {STAGES.map((s) => (
                      <div key={s.num} className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-xl mb-1">{s.badge}</div>
                        <div className="text-sm font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.desc}</div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/learning-center"
                    onClick={completeOnboard}
                    className="block w-full text-center py-4 rounded-xl bg-orange-500 text-white text-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    去学�?1.1 课程 �?
                  </Link>
                </div>
              )}

              {onboardStep === 2 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="text-5xl mb-3">🎯</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">第二步，学完练一�?/h2>
                    <p className="text-base text-gray-600 leading-relaxed">
                      每节课后�?span className="font-semibold text-sky-700">实操练习</span>�?span className="font-semibold text-emerald-700">实战案例</span>�?
                      AI帮你评分，告诉你哪里做得好、哪里还能提升。边学边练，才不是纸上谈兵�?
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-sky-50 rounded-xl p-4">
                      <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0 text-xl">📝</div>
                      <div>
                        <div className="font-bold text-gray-900 text-base">实操练习</div>
                        <div className="text-sm text-gray-500">写话术、做质检、定KPI…AI给你打分</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-xl">💡</div>
                      <div>
                        <div className="font-bold text-gray-900 text-base">实战案例</div>
                        <div className="text-sm text-gray-500">对错对比，照着做不出错</div>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/learning-center"
                    onClick={completeOnboard}
                    className="block w-full text-center py-4 rounded-xl bg-orange-500 text-white text-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    看看实操任务 �?
                  </Link>
                </div>
              )}

              {onboardStep === 3 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="text-5xl mb-3">🔥</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">第三步，每天进步一点点</h2>
                    <p className="text-base text-gray-600 leading-relaxed">
                      <span className="font-semibold text-amber-700">每日一�?/span>帮你巩固知识，坚持打卡拿勋章�?
                      答错也没关系，错题本帮你查漏补缺，反复复习直到掌握�?
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-1">✍️</div>
                      <div className="text-sm font-bold text-gray-900">每日一�?/div>
                      <div className="text-xs text-gray-500">3道题测一�?/div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-1">�?/div>
                      <div className="text-sm font-bold text-gray-900">错题�?/div>
                      <div className="text-xs text-gray-500">错了自动收藏</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-1">🏅</div>
                      <div className="text-sm font-bold text-gray-900">打卡勋章</div>
                      <div className="text-xs text-gray-500">坚持就是胜利</div>
                    </div>
                  </div>
                  <Link
                    href="/practice"
                    onClick={completeOnboard}
                    className="block w-full text-center py-4 rounded-xl bg-orange-500 text-white text-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    开始每日一�?�?
                  </Link>
                </div>
              )}

              {/* 底部导航 */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => onboardStep > 1 ? setOnboardStep(onboardStep - 1) : null}
                  className={`flex items-center gap-1 text-sm font-medium ${
                    onboardStep > 1 ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 cursor-not-allowed'
                  }`}
                  disabled={onboardStep <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一�?
                </button>
                {onboardStep < 3 ? (
                  <button
                    onClick={() => setOnboardStep(onboardStep + 1)}
                    className="flex items-center gap-1 px-5 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors text-sm"
                  >
                    下一�?
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={completeOnboard}
                    className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm"
                  >
                    完成
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════�?阶段进入提示 ══════�?*/}
      {stageNotify !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className={`bg-gradient-to-r ${
              stageNotify === 2 ? 'from-emerald-500 to-green-600' :
              stageNotify === 3 ? 'from-amber-500 to-yellow-600' :
              'from-rose-500 to-red-600'
            } px-6 pt-6 pb-5 text-center`}>
              <div className="text-5xl mb-2">
                {STAGES.find(s => s.num === stageNotify)?.badge}
              </div>
              <h2 className="text-2xl font-bold text-white">进入新阶段！</h2>
            </div>
            <div className="px-8 py-6 space-y-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 mb-1">
                  {STAGES.find(s => s.num === stageNotify)?.name}
                </div>
                <div className="text-base text-gray-600">
                  本阶段重点：{STAGES.find(s => s.num === stageNotify)?.desc}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm font-bold text-gray-700 mb-2">建议先完成的课程�?/div>
                <div className="space-y-1">
                  {STAGES.find(s => s.num === stageNotify)?.lessons.slice(0, 2).map((l, i) => (
                    <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/learning-center"
                  onClick={dismissStageNotify}
                  className="flex-1 text-center py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors text-base"
                >
                  开始学�?
                </Link>
                <button
                  onClick={dismissStageNotify}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  稍后再说
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
