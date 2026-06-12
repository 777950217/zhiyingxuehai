'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ALL_MODULES, markLessonLearned, isLessonUnlocked } from '@/lib/course-data';
import type { Lesson, Module } from '@/lib/course-data';
import { useAuth } from '@/lib/auth-context';
import {
  BookOpen, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Lightbulb, ClipboardList, PenLine, ArrowLeft, Loader2, Sparkles, RotateCcw, Lock, ArrowRight
} from 'lucide-react';
import LessonFeedbackModal from '@/components/LessonFeedbackModal';

/* ─── localStorage 工具 ─── */
const STORAGE_KEY = 'knowledge-notes-v2';

interface GradingResult {
  grade: string;
  feedback: string;
  gradedAt: string;
}

interface LessonNote {
  completed: boolean;
  userNote: string;
  updatedAt: string;
  grading?: GradingResult | null;
}

type NotesMap = Record<string, LessonNote>;

function loadNotesFromLS(): NotesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // Try v1 data migration
    const v1raw = localStorage.getItem('knowledge-notes-v1');
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));
      localStorage.removeItem('knowledge-notes-v1');
      return v1;
    }
    return {};
  } catch { return {}; }
}

function saveNotesToLS(notes: NotesMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/* ─── Supabase 读写工具 ─── */
async function loadNotesFromSupabase(
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  userId: string
): Promise<{ notes: NotesMap; rowIds: Record<string, string> }> {
  try {
    const res = await authFetch(`/api/phrases?category=${encodeURIComponent('知识笔记')}&is_preset=false`);
    if (!res.ok) return { notes: {}, rowIds: {} };
    const data = await res.json();
    const records = (data.data || []) as Record<string, unknown>[];
    const notes: NotesMap = {};
    const rowIds: Record<string, string> = {};
    for (const r of records) {
      if (r.created_by !== userId && r.created_by !== null) continue;
      const lessonId = (r.question as string) || '';
      if (!lessonId) continue;
      const rowId = (r.id as string) || '';
      if (rowId) rowIds[lessonId] = rowId;
      try {
        const parsed = JSON.parse((r.content as string) || '{}') as LessonNote;
        notes[lessonId] = parsed;
      } catch {
        // legacy: content might be raw userNote
        notes[lessonId] = {
          completed: !!(r.answer as string)?.trim(),
          userNote: (r.answer as string) || '',
          updatedAt: (r.updated_at as string) || (r.created_at as string) || '',
          grading: null,
        };
      }
    }
    return { notes, rowIds };
  } catch { return { notes: {}, rowIds: {} }; }
}

async function saveNoteToSupabase(
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  userId: string,
  companyId: string | null,
  lessonId: string,
  note: LessonNote,
  existingRowId?: string | null
): Promise<string | null> {
  try {
    const payload = {
      company_id: companyId || null,
      category: '知识笔记',
      content: JSON.stringify(note),
      question: lessonId,
      answer: note.userNote,
      scene: `课程笔记`,
      tags: note.grading?.grade || '',
      is_preset: false,
      created_by: userId,
    };

    if (existingRowId) {
      const res = await authFetch('/api/phrases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existingRowId, ...payload }),
      });
      if (!res.ok) throw new Error('update failed');
      const data = await res.json();
      return (data.data as Record<string, unknown>)?.id as string || existingRowId;
    } else {
      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('create failed');
      const data = await res.json();
      return (data.data as Record<string, unknown>)?.id as string || null;
    }
  } catch {
    return null;
  }
}

/* ─── 模块图标映射 ─── */
const MODULE_ICONS: Record<string, string> = {
  role: '🧭',
  target: '🎯',
  team: '👥',
  business: '📊',
};

/* ─── 获取所有课程的有序列表（用于锁定判断） ─── */
function getOrderedLessons(): Lesson[] {
  return ALL_MODULES.flatMap(m => m.lessons);
}

/* ─── 继续学习下一课按�?─── */
function NextLessonButton({ currentLessonId }: { currentLessonId: string }) {
  const allLessons = ALL_MODULES.flatMap(m => m.lessons);
  const currentIdx = allLessons.findIndex(l => l.id === currentLessonId);
  const isLast = currentIdx === allLessons.length - 1;
  const nextLesson = isLast ? null : allLessons[currentIdx + 1];
  const nextModule = nextLesson ? ALL_MODULES.find(m => m.lessons.some(l => l.id === nextLesson.id)) : null;

  if (!isLast && nextLesson && nextModule) {
    return (
      <div className="mt-3 pt-3 border-t border-slate-200/50">
        <Link
          href={`/learning-path/${nextModule.id}/${nextLesson.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          继续学习下一�?<ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-slate-500 mt-1.5">下一课：{nextLesson.title}</p>
      </div>
    );
  }
  return (
    <div className="mt-3 pt-3 border-t border-slate-200/50">
      <Link
        href="/learning-path"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        返回课程总览 <ArrowRight className="w-4 h-4" />
      </Link>
      <p className="text-xs text-slate-500 mt-1.5">已学完全部课�?/p>
    </div>
  );
}

/* ─── 页面组件 ─── */
export default function KnowledgeNotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetLesson = searchParams.get('lesson');
  const { session, profile, authFetch } = useAuth();

  const [notes, setNotes] = useState<NotesMap>({});
  const [supabaseRowIds, setSupabaseRowIds] = useState<Record<string, string>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLesson, setExpandedLesson] = useState<string | null>(targetLesson || null);
  const [mounted, setMounted] = useState(false);
  const [gradingLessonId, setGradingLessonId] = useState<string | null>(null);
  const [feedbackLesson, setFeedbackLesson] = useState<{ lessonId: string; courseId: string } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // 多标签页同步：标签页重新获得焦点时，从服务器重新加载数据
  useEffect(() => {
    if (!profile?.id || !authFetch) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadNotesFromSupabase(authFetch, profile.id!).then(result => {
          if (Object.keys(result.notes).length > 0) {
            setNotes(result.notes);
            setSupabaseRowIds(result.rowIds);
            saveNotesToLS(result.notes);
          }
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [profile?.id, authFetch]);

  // 读取：优先Supabase，失败降级localStorage
  useEffect(() => {
    if (!mounted) return;
    const userId = profile?.id || '';
    const companyId = profile?.companyId || null;
    if (userId && authFetch) {
      loadNotesFromSupabase(authFetch, userId).then(result => {
        if (Object.keys(result.notes).length > 0) {
          setNotes(result.notes);
          setSupabaseRowIds(result.rowIds);
          saveNotesToLS(result.notes); // 缓存到localStorage
        } else {
          setNotes(loadNotesFromLS()); // 降级读取localStorage
        }
      }).catch(() => {
        setNotes(loadNotesFromLS());
      });
    } else {
      setNotes(loadNotesFromLS());
    }
  }, [mounted, profile?.id]);

  // 初始展开目标课程所在模�?
  useEffect(() => {
    if (targetLesson) {
      for (const m of ALL_MODULES) {
        if (m.lessons.some(l => l.id === targetLesson)) {
          setExpandedModules(prev => new Set(prev).add(m.id));
          break;
        }
      }
    }
  }, [targetLesson]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleLesson = (id: string) => {
    setExpandedLesson(prev => prev === id ? null : id);
  };

  const updateNote = useCallback((lessonId: string, patch: Partial<LessonNote>) => {
    setNotes(prev => {
      const existing = prev[lessonId] ?? { completed: false, userNote: '', grading: null };
      const next = {
        ...prev,
        [lessonId]: {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      };
      // 双写：localStorage + Supabase
      saveNotesToLS(next);
      const userId = profile?.id || '';
      const companyId = profile?.companyId || null;
      if (userId && authFetch) {
        const noteData = next[lessonId];
        saveNoteToSupabase(
          authFetch, userId, companyId,
          lessonId, noteData,
          supabaseRowIds[lessonId] || null
        ).then(rowId => {
          if (rowId) {
            setSupabaseRowIds(prev => ({ ...prev, [lessonId]: rowId }));
          }
        }).catch(() => { toast.error('保存失败，数据已暂存本地，恢复网络后将自动同�?); });
      }

      // 需�?：提交笔�?自动标记已学
      // 当用户写入了笔记内容，自动同步到 learning-path-progress
      const userNote = patch.userNote !== undefined ? patch.userNote : existing.userNote;
      if (userNote?.trim()) {
        const token = session?.access_token;
        markLessonLearned(lessonId, token);
        // 同时更新 completed 状�?
        if (!prev[lessonId]?.completed) {
          next[lessonId] = { ...next[lessonId], completed: true };
          // 首次完成课时，触发课程反馈弹�?
          setFeedbackLesson({ lessonId, courseId: '' });
          saveNotesToLS(next);
        }
      }

      return next;
    });
  }, [session?.access_token, profile?.id, profile?.companyId, authFetch, supabaseRowIds]);

  /* ─── AI 批改 ─── */
  const handleGrade = async (lesson: Lesson) => {
    const userNote = notes[lesson.id]?.userNote || '';
    if (!userNote.trim()) return;

    setGradingLessonId(lesson.id);

    try {
      const systemPrompt = `你是资深客服管理导师，正在批改学员的课后作业�?

批改维度�?
1. 是否理解核心概念�?0分）
2. 是否有可落地的行动方案（40分）
3. 是否有具体数�?案例支撑�?0分）

评分标准�?
- A（优秀）：理解深入，行动方案具体可执行，有明确数据和案�?
- B（良好）：基本理解，有行动方向但不够具体，缺少数据支�?
- C（需改进）：理解有偏差或缺少行动方案，无法直接落�?

请严格按以下JSON格式返回（不要加任何其他文字）：
{
  "grade": "A/B/C",
  "feedback": "分三个维度依次点评，每个维度2-3句话，最后给一句鼓励性的改进建议。用中文�?
}`;

      const prompt = `课程�?{lesson.title}
核心知识点：${lesson.goal}
课后作业要求�?{lesson.task}
学员提交的作业内容：
${userNote}`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
      });

      if (!res.ok) throw new Error('批改请求失败');

      const data = await res.json();
      const content = data.content || '';

      // 解析AI返回的JSON
      let grading: GradingResult;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          grading = {
            grade: parsed.grade || 'B',
            feedback: parsed.feedback || content,
            gradedAt: new Date().toISOString(),
          };
        } else {
          grading = { grade: 'B', feedback: content, gradedAt: new Date().toISOString() };
        }
      } catch {
        grading = { grade: 'B', feedback: content, gradedAt: new Date().toISOString() };
      }

      updateNote(lesson.id, { grading });
    } catch (err) {
      console.error('AI批改失败:', err);
    } finally {
      setGradingLessonId(null);
    }
  };

  /* ─── 统计 ─── */
  const totalLessons = ALL_MODULES.reduce((s: number, m: { lessons: { id: string }[] }) => s + m.lessons.length, 0);
  const completedCount = ALL_MODULES.reduce(
    (s: number, m: { lessons: { id: string }[] }) => s + m.lessons.filter((l: { id: string }) => notes[l.id]?.completed || notes[l.id]?.userNote?.trim()).length, 0
  );

  /* ─── 检查课程是否解�?─── */
  const isUnlocked = useCallback((lesson: Lesson): boolean => {
    if (!mounted) return true; // SSR时默认解�?
    return isLessonUnlocked(lesson.num);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部�?*/}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">课程笔记与作�?/h1>
            <p className="text-xs text-slate-500">已完�?{completedCount}/{totalLessons} �?/p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${totalLessons ? (completedCount / totalLessons) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-medium text-blue-700">
              {totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 课程列表 */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {ALL_MODULES.map((mod) => (
          <ModuleSection
            key={mod.id}
            module={mod}
            expanded={expandedModules.has(mod.id)}
            expandedLesson={expandedLesson}
            notes={notes}
            gradingLessonId={gradingLessonId}
            onToggleModule={() => toggleModule(mod.id)}
            onToggleLesson={toggleLesson}
            onUpdateNote={updateNote}
            onGrade={handleGrade}
            isUnlocked={isUnlocked}
          />
        ))}

      {/* 课程反馈弹窗 */}
      {feedbackLesson && (
        <LessonFeedbackModal
          lessonId={feedbackLesson.lessonId}
          courseId={feedbackLesson.courseId}
          userId={profile?.id || ''}
          onClose={() => setFeedbackLesson(null)}
        />
      )}
      </div>
    </div>
  );
}

/* ─── 模块区块 ─── */
function ModuleSection({
  module, expanded, expandedLesson, notes, gradingLessonId,
  onToggleModule, onToggleLesson, onUpdateNote, onGrade, isUnlocked,
}: {
  module: Module;
  expanded: boolean;
  expandedLesson: string | null;
  notes: NotesMap;
  gradingLessonId: string | null;
  onToggleModule: () => void;
  onToggleLesson: (id: string) => void;
  onUpdateNote: (id: string, patch: Partial<LessonNote>) => void;
  onGrade: (lesson: Lesson) => void;
  isUnlocked: (lesson: Lesson) => boolean;
}) {
  const doneCount = module.lessons.filter(l => notes[l.id]?.completed || notes[l.id]?.userNote?.trim()).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* 模块�?*/}
      <button
        onClick={onToggleModule}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <span className="text-xl">{MODULE_ICONS[module.id] || '📘'}</span>
        <div className="flex-1 text-left">
          <div className="font-bold text-slate-900">{module.name}</div>
          <div className="text-xs text-slate-500">{module.lessons.length}�?· 已完成{doneCount}�?/div>
        </div>
        {expanded
          ? <ChevronDown className="w-5 h-5 text-slate-400" />
          : <ChevronRight className="w-5 h-5 text-slate-400" />
        }
      </button>

      {/* 课程列表 */}
      {expanded && (
        <div className="border-t border-slate-100">
          {module.lessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              moduleName={module.name}
              expanded={expandedLesson === lesson.id}
              note={notes[lesson.id]}
              isGrading={gradingLessonId === lesson.id}
              unlocked={isUnlocked(lesson)}
              onToggle={() => onToggleLesson(lesson.id)}
              onUpdateNote={onUpdateNote}
              onGrade={() => onGrade(lesson)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 评分等级配色 ─── */
const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-amber-100 text-amber-800 border-amber-200',
};

/* ─── 单课卡片 ─── */
function LessonCard({
  lesson, moduleName, expanded, note, isGrading, unlocked, onToggle, onUpdateNote, onGrade,
}: {
  lesson: Lesson;
  moduleName: string;
  expanded: boolean;
  note?: LessonNote;
  isGrading: boolean;
  unlocked: boolean;
  onToggle: () => void;
  onUpdateNote: (id: string, patch: Partial<LessonNote>) => void;
  onGrade: () => void;
}) {
  const isCompleted = note?.completed || !!(note?.userNote?.trim());
  const hasNote = (note?.userNote || '').trim().length > 0;
  const hasGrading = !!note?.grading;

  // �?goal 提取核心知识�?
  const keyPoints = useMemo(() => {
    if (!lesson.goal) return [];
    return lesson.goal
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  }, [lesson.goal]);

  // 未解锁：显示锁定提示
  if (!unlocked) {
    return (
      <div className="border-b border-slate-50 last:border-b-0 px-4 py-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-slate-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-400">
              第{lesson.num}�?· {lesson.title}
            </div>
            <div className="text-xs text-amber-600 mt-0.5">
              请先完成上一课的课后作业
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-50 last:border-b-0">
      {/* 课程�?*/}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 transition-colors text-left"
      >
        {isCompleted
          ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          : <Circle className="w-5 h-5 text-slate-300 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            第{lesson.num}�?· {lesson.title}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>{moduleName}</span>
            {hasGrading && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${GRADE_STYLES[note?.grading?.grade || 'B']}`}>
                {note?.grading?.grade}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        }
      </button>

      {/* 展开详情 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 核心知识�?*/}
          {keyPoints.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">核心知识�?/span>
              </div>
              <ul className="space-y-1">
                {keyPoints.map((pt, i) => (
                  <li key={i} className="text-sm text-blue-900 flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">�?/span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 课后落地/作业 */}
          {lesson.task && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">课后落地作业</span>
              </div>
              <p className="text-sm text-amber-900 whitespace-pre-line">{lesson.task}</p>
            </div>
          )}

          {/* 笔记�?*/}
          <div className="space-y-3">
            {/* 已完成提示（替代手动勾选） */}
            {isCompleted && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>已完成本课作�?/span>
              </div>
            )}

            {/* 用户笔记 */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <PenLine className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">我的作业/笔记</span>
                <span className="text-xs text-slate-400">（提交即标记已学�?/span>
              </div>
              <textarea
                value={note?.userNote || ''}
                onChange={e => onUpdateNote(lesson.id, { userNote: e.target.value })}
                placeholder="写下你的作业内容、学习心得、完成情�?.. 提交后自动标记已学并解锁下一�?
                rows={5}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* AI 批改按钮 */}
            <div className="flex items-center gap-2">
              {hasNote && !hasGrading && (
                <button
                  onClick={onGrade}
                  disabled={isGrading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGrading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI批改�?..</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> 提交批改</>
                  )}
                </button>
              )}
              {hasGrading && (
                <>
                  <button
                    onClick={onGrade}
                    disabled={isGrading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGrading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI批改�?..</>
                    ) : (
                      <><RotateCcw className="w-3.5 h-3.5" /> 重新批改</>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* 批改结果 */}
            {hasGrading && note?.grading && (
              <div className={`rounded-lg p-3 border ${GRADE_STYLES[note.grading.grade] || 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                    note.grading.grade === 'A' ? 'bg-green-200 text-green-800' :
                    note.grading.grade === 'B' ? 'bg-blue-200 text-blue-800' :
                    'bg-amber-200 text-amber-800'
                  }`}>
                    {note.grading.grade}
                  </span>
                  <span className="text-sm font-semibold">
                    {note.grading.grade === 'A' ? '优秀' : note.grading.grade === 'B' ? '良好' : '需改进'}
                  </span>
                  <span className="text-xs opacity-70 ml-auto">
                    {new Date(note.grading.gradedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-line leading-relaxed">{note.grading.feedback}</p>

                {/* 继续学习下一�?*/}
                <NextLessonButton currentLessonId={lesson.id} />
              </div>
            )}

            {/* 保存时间 */}
            {note?.updatedAt && (
              <p className="text-xs text-slate-400">
                最后更新：{new Date(note.updatedAt).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
