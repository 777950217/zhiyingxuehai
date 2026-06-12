'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, ArrowRight, BookOpen, Lock, ClipboardList } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { IndustryInsightCard } from '@/components/industry-insight-card';
import ConceptCard from '@/components/ConceptCard';
import GoPractice from '@/components/go-practice';
import LessonFeedbackModal from '@/components/LessonFeedbackModal';
import { getConceptCard, type ConceptCardTier } from '@/lib/concept-cards';
import {
  ALL_MODULES, COLOR_MAP, MODULE_SUMMARIES,
  loadProgress,
  getModuleById, getAdjacentLessons, renderLines,
  loadProgressFromAPI, toggleLessonProgress,
  isLessonUnlocked, markLessonLearned,
} from '@/lib/course-data';

/** 找到某个课时所属的模块id */
function getModuleIdForLesson(lessonNum: number): string {
  for (const m of ALL_MODULES) {
    if (m.lessons.some(l => l.num === lessonNum)) return m.id;
  }
  return 'role';
}


export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;
  const lessonNum = parseInt(params.lessonId as string, 10);
  const mod = getModuleById(moduleId);
  const lesson = mod?.lessons.find(l => l.num === lessonNum);
  const { session, profile } = useAuth();
  const userId = profile?.id;

  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [showModuleComplete, setShowModuleComplete] = useState(false);
  const [showConceptCard, setShowConceptCard] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    // 检查课程是否解锁
    setUnlocked(isLessonUnlocked(lessonNum));
  }, [lessonNum, mounted]);

  useEffect(() => {
    const token = session?.access_token;
    if (token) {
      loadProgressFromAPI(token, userId).then(setProgress);
    } else {
      setProgress(loadProgress(userId));
    }
  }, [session?.access_token, userId]);

  // 进入课程时，如果有概念卡(conceptCardId)，先弹概念卡
  useEffect(() => {
    if (!mounted || !lesson) return;
    if (!lesson.conceptCardId) return; // 没有关联概念卡，不弹
    const tier: ConceptCardTier = profile?.role === 'enterprise_admin' ? 'flagship'
      : profile?.role === 'enterprise_manager' ? 'professional'
      : 'personal';
    const card = getConceptCard(lesson.conceptCardId, tier);
    if (card) {
      setShowConceptCard(true);
    }
  }, [lesson, mounted, profile?.role]);

  const toggleDone = useCallback(() => {
    if (!lesson || !mod) return;
    const newLearned = !progress[lesson.id];
    setProgress(prev => {
      const next = { ...prev };
      if (newLearned) { next[lesson.id] = true; } else { delete next[lesson.id]; }
      return next;
    });
    const token = session?.access_token;
    toggleLessonProgress(lesson.id, newLearned, token, userId);
    // 标记完成时弹出课程反馈
    if (newLearned) {
      setTimeout(() => setShowFeedback(true), 800);
    }
    // Check if this is the last lesson in the module and being marked as learned
    if (newLearned && mod.lessons.length > 0 && lesson.id === mod.lessons[mod.lessons.length - 1].id) {
      const allModuleLessonsDone = mod.lessons.every(l => l.id === lesson.id || progress[l.id]);
      if (allModuleLessonsDone) {
        setTimeout(() => setShowModuleComplete(true), 600);
      }
    }
  }, [lesson, mod, progress, session?.access_token]);

  // 同步笔记提交状态到进度
  useEffect(() => {
    if (!mounted || !lesson) return;
    try {
      const raw = localStorage.getItem('knowledge-notes-v2');
      if (raw) {
        const notes = JSON.parse(raw) as Record<string, { userNote?: string }>;
        if (notes[lesson.id]?.userNote?.trim() && !progress[lesson.id]) {
          setProgress(prev => ({ ...prev, [lesson.id]: true }));
          const token = session?.access_token;
          markLessonLearned(lesson.id, token);
        }
      }
    } catch { /* ignore */ }
  }, [lesson, mounted, session?.access_token, progress]);

  const moduleIndex = ALL_MODULES.findIndex(m => m.id === moduleId);
  const moduleSummary = (moduleIndex >= 0 && moduleIndex < MODULE_SUMMARIES.length) ? MODULE_SUMMARIES[moduleIndex] : null;
  const isAllComplete = moduleId === 'business' && showModuleComplete;

  // 概念卡数据
  const tier: ConceptCardTier = profile?.role === 'enterprise_admin' ? 'flagship'
    : profile?.role === 'enterprise_manager' ? 'professional'
    : 'personal';
  const conceptCard = lesson?.conceptCardId ? getConceptCard(lesson.conceptCardId, tier) : undefined;

  if (!mod || !lesson) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">课时不存在</p>
          <Link href="/learning-path" className="mt-4 inline-block text-blue-600 hover:underline">返回学习中心</Link>
        </div>
      </div>
    );
  }

  // 未解锁提示
  if (mounted && !unlocked) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen">
        <Link
          href={`/learning-path/${mod.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回{mod.name}
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">课程未解锁</h2>
          <p className="text-gray-600 mb-4">请先完成上一课的课后作业，才能进入本课学习</p>
          <Link
            href="/knowledge-notes"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <ClipboardList className="w-4 h-4" />
            前往课程笔记
          </Link>
        </div>
      </div>
    );
  }

  const colors = COLOR_MAP[mod.color];
  const done = !!progress[lesson.id];
  const { prev, next } = getAdjacentLessons(lesson.id);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen">
      {/* 概念卡弹窗 */}
      {showConceptCard && conceptCard && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setShowConceptCard(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative my-8" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowConceptCard(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            <ConceptCard
              data={conceptCard}
              onStartLearning={() => setShowConceptCard(false)}
            />
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/learning-path/${mod.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回{mod.name}
        </Link>

        <div className="flex items-center gap-2">
          {/* 概念卡回看按钮 */}
          {conceptCard && (
            <button
              onClick={() => setShowConceptCard(true)}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              📋 概念卡
            </button>
          )}
          {done && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium px-3 py-2 bg-emerald-100 rounded-lg">
              <Check className="w-3 h-3" /> 已学
            </span>
          )}
        </div>
      </div>

      {/* 课头 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colors.badgeBg} ${colors.badgeText}`}>
            {mod.name}
          </span>
          {done && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check className="w-3 h-3" /> 已完成
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          第{lesson.num}课：{lesson.title}
        </h1>
      </div>

      {/* 6段式内容，直接展开，无折叠 */}
      <div className="space-y-8">
        {/* 1. 本节痛点 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">🎯 本节痛点</h2>
          <div className="text-[15px] text-gray-700 leading-relaxed">{renderLines(lesson.painPoint)}</div>
        </section>

        {/* 2. 学习目标 */}
        <section className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-6">
          <h2 className="font-bold text-lg text-blue-800 mb-3 flex items-center gap-2">📖 学习目标</h2>
          <div className="text-[15px] text-blue-900 leading-relaxed">{renderLines(lesson.goal)}</div>
        </section>

        {/* 3. 底层逻辑 */}
        <section className="bg-sky-50 rounded-xl p-6 border border-sky-100">
          <h2 className="font-bold text-lg text-sky-800 mb-3 flex items-center gap-2">💡 底层逻辑</h2>
          <div className="text-[15px] text-sky-900 leading-relaxed">{renderLines(lesson.logic)}</div>
        </section>

        {/* 4. 标准方法论 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">📋 标准方法论</h2>
          <div className="text-[15px] text-gray-800 leading-relaxed">{renderLines(lesson.method)}</div>
        </section>

        {/* 5. 场景案例·对错对照 */}
        <section className="space-y-4">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">🔍 场景案例·对错对照</h2>
          <div className="bg-red-50 border-l-4 border-red-400 rounded-r-xl p-5">
            <div className="font-semibold text-red-700 text-[15px]">❌ {lesson.caseBad}</div>
            <p className="mt-2 text-sm text-red-600 leading-relaxed">→ 致命问题：{lesson.caseBadWhy}</p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-500 rounded-r-xl p-5">
            <div className="font-semibold text-green-700 text-[15px]">✅ {lesson.caseGood}</div>
            <p className="mt-2 text-sm text-green-600 leading-relaxed">→ 优势：{lesson.caseGoodWhy}</p>
          </div>
        </section>

        {/* 6. 课后落地+课程笔记 */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="font-bold text-lg text-amber-800 mb-3 flex items-center gap-2">✅ 课后落地</h2>
          <div className="text-[15px] text-amber-900 leading-relaxed">{renderLines(lesson.task)}</div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-amber-700">前往课程笔记完成作业→</span>
            <Link
              href={`/knowledge-notes?lesson=${lesson.id}`}
              className="inline-flex items-center gap-1 bg-[#0F2B46] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#1a3a5c] transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              课程笔记 →
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* 去实操引导 */}
        <GoPractice lessonId={lesson.id} />

        {/* 你的行业视角卡片 */}
        <IndustryInsightCard
          topic={lesson.title}
          context={lesson.painPoint}
        />
      </div>

      {/* 底部导航：上一课/下一课 */}
      <div className="mt-8 mb-6 flex items-center justify-between">
        {prev ? (
          <Link
            href={`/learning-path/${getModuleIdForLesson(prev.num)}/${prev.num}`}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            上一课：第{prev.num}课
          </Link>
        ) : <div />}

        {next ? (
          <Link
            href={`/learning-path/${getModuleIdForLesson(next.num)}/${next.num}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            下一课：第{next.num}课
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href="/learning-path"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            返回学习中心
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 模块通关总结弹窗 */}
      {showModuleComplete && moduleSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModuleComplete(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModuleComplete(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            {isAllComplete ? (
              /* 全部课程结业 */
              <div className="text-center">
                <div className="text-5xl mb-4">🎓</div>
                <h2 className="text-2xl font-bold text-blue-900 mb-2">全部课程结业</h2>
                <p className="text-gray-600 mb-4">恭喜你完成全部25课学习！你已系统掌握客服主管的核心管理能力。</p>
                <div className="bg-blue-50 rounded-xl p-4 mb-4 text-left">
                  <h3 className="font-semibold text-blue-800 mb-2">你的学习成果</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>✅ 完成角色认知、目标管理、团队带教、业务落地4大篇章</li>
                    <li>✅ 掌握管理六步法、3步法等核心方法论</li>
                    <li>✅ 建立了完整的客服管理体系框架</li>
                  </ul>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left">
                  <h3 className="font-semibold text-amber-800 mb-1">持续精进建议</h3>
                  <p className="text-sm text-gray-700">管理是实践的艺术。建议每周回顾一次课程笔记，每月做一次体系自检，持续迭代你的管理方法。</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Link href="/knowledge-notes" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    查看课程笔记
                  </Link>
                  <Link href="/learning-path" className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    返回学习中心
                  </Link>
                </div>
              </div>
            ) : (
              /* 模块通关总结 */
              <div className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-xl font-bold text-blue-900 mb-1">恭喜完成「{moduleSummary.title}」</h2>
                <p className="text-gray-500 text-sm mb-4">{moduleSummary.subtitle}</p>
                <div className="bg-blue-50 rounded-xl p-4 mb-4 text-left">
                  <h3 className="font-semibold text-blue-800 mb-2">本篇核心重点</h3>
                  <ul className="space-y-1.5">
                    {moduleSummary.keyPoints.map((pt: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2">
                        <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {moduleSummary.tips.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-4 mb-4 text-left">
                    <h3 className="font-semibold text-amber-800 mb-1">实操注意事项</h3>
                    <ul className="space-y-1">
                      {moduleSummary.tips.map((tip: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">⚠️ {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {moduleSummary.nextModule && (
                  <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                    <h3 className="font-semibold text-green-800 mb-1">下一篇章预告</h3>
                    <p className="text-sm text-gray-700">接下来进入「{moduleSummary.nextModuleTitle}」，{moduleSummary.nextHint}</p>
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  {moduleSummary.nextModule ? (
                    <Link href="/learning-path" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      进入下一篇
                    </Link>
                  ) : null}
                  <button onClick={() => setShowModuleComplete(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    关闭
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 课程反馈弹窗 */}
      {showFeedback && (
        <LessonFeedbackModal
          onClose={() => setShowFeedback(false)}
          lessonId={String(params.lessonId)}
          courseId={moduleId}
          userId={profile?.id || ''}
        />
      )}
    </div>
  );
}
