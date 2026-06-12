'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3, BookOpen, Brain, MessageSquare, Clock, Trophy,
  Target, TrendingDown, Users, Zap, Award, CheckCircle2, Circle,
} from 'lucide-react';
import { PageHint } from '@/components/page-hint';
import { DataSecurityBadge } from '@/components/data-security-badge';

/* ── Types ── */
interface LearningProgress {
  completed: number[];
}

interface AiUsageStats {
  aiAssistant?: number;
  practiceCount?: number;
}

/* ── localStorage helpers ── */
function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/* ── Learning path modules (mirrors learning-path page) ── */
const PHASES = [
  {
    key: 'basics', label: '基础入门', color: 'blue', range: [1, 5] as const,
    modules: ['角色认知', '沟通框�?, '问题分类', '时间管理', '情绪管理'],
  },
  {
    key: 'advanced', label: '进阶提升', color: 'green', range: [6, 10] as const,
    modules: ['KPI制定', '质检标准', 'SOP编写', '绩效面谈', '数据复盘'],
  },
  {
    key: 'expert', label: '高手修炼', color: 'purple', range: [11, 15] as const,
    modules: ['体系设计', '制度制定', '培训带教', '持续优化', '案例沉淀'],
  },
];

const TOTAL_MODULES = 15;

/* ── Achievement badges ── */
interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  check: (stats: { completedModules: number; practiceCount: number; usedBusinessTools: boolean }) => boolean;
}

const BADGES: Badge[] = [
  { id: 'beginner', icon: '\u{1F331}', title: '新手入门', desc: '完成基础入门阶段', check: s => s.completedModules >= 5 },
  { id: 'data', icon: '\u{1F4CA}', title: '数据达人', desc: '首次使用经营工具�?, check: s => s.usedBusinessTools },
  { id: 'talk', icon: '\u{1F4AC}', title: '话术高手', desc: '话术练习超过10�?, check: s => s.practiceCount >= 10 },
  { id: 'master', icon: '\u{1F3C6}', title: '管理专家', desc: '完成全部15个模�?, check: s => s.completedModules >= 15 },
];

/* ── Onboarding task data (from API) ── */
interface OnboardingTask {
  day: number;
  title: string;
  is_completed: boolean;
}

interface OnboardingProgress {
  current_day: number;
  completed_days: number;
  total_days: number;
}

/* ── Phase color helpers ── */
function phaseColor(color: string, type: 'text' | 'bg' | 'bar' | 'ring') {
  const m: Record<string, Record<string, string>> = {
    blue:   { text: 'text-blue-400', bg: 'bg-blue-500', bar: 'from-blue-500 to-blue-400', ring: 'stroke-blue-500' },
    green:  { text: 'text-green-400', bg: 'bg-green-500', bar: 'from-green-500 to-green-400', ring: 'stroke-green-500' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500', bar: 'from-purple-500 to-purple-400', ring: 'stroke-purple-500' },
  };
  return m[color]?.[type] || m.blue[type];
}

/* ── Circular progress SVG ── */
function CircularProgress({ percent, size = 120, strokeWidth = 10, color = 'blue' }: {
  percent: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor"
        className="text-slate-700" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        className={phaseColor(color, 'ring')} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, sub, className = '' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; className?: string;
}) {
  return (
    <div className={`bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c] ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-slate-400">{icon}</div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-sky-400">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

/* ── Main Page ── */
export default function LearningProfilePage() {
  const { profile, authFetch } = useAuth();
  const role = profile?.role || 'staff';
  const isPersonal = role === 'personal_user';
  const companyId = profile?.companyId;

  const [mounted, setMounted] = useState(false);

  // Personal data from localStorage
  const [learningProgress, setLearningProgress] = useState<LearningProgress>({ completed: [] });
  const [aiUsage, setAiUsage] = useState<AiUsageStats>({});
  const [usedBusinessTools, setUsedBusinessTools] = useState(false);

  // Enterprise data from API
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);
  const [workOrderCount, setWorkOrderCount] = useState(0);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [phraseCount, setPhraseCount] = useState(0);
  const [costBefore, setCostBefore] = useState<number | null>(null);
  const [costAfter, setCostAfter] = useState<number | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [agentTrainedCount, setAgentTrainedCount] = useState(0);

  // Load data
  useEffect(() => {
    setMounted(true);

    // localStorage data (personal, isolated by userId)
    const uid = profile?.id || '';
    const lp = loadJson<LearningProgress>(uid ? `learning-path-progress_${uid}` : 'learning-path-progress', { completed: [] });
    // fallback to legacy key
    if (!lp.completed?.length && uid) {
      const legacyLp = loadJson<LearningProgress>('learning-path-progress', { completed: [] });
      if (legacyLp.completed?.length) setLearningProgress(legacyLp);
      else setLearningProgress(lp);
    } else {
    setLearningProgress(lp);
    }
    const ai = loadJson<AiUsageStats>('ai-usage-stats', {});
    setAiUsage(ai);
    setUsedBusinessTools(localStorage.getItem('business-tools-public-costs') !== null);

    // API data (enterprise)
    if (!isPersonal && companyId) {
      fetchEnterpriseData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, companyId]);

  const fetchEnterpriseData = useCallback(async () => {
    try {
      const headers = await getHeaders();
      if (!headers) return;

      // Onboarding tasks
      const taskRes = await fetch(`/api/onboarding-tasks?company_id=${companyId}&flow=45day`, { headers });
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setOnboardingTasks(taskData.tasks || []);
        setOnboardingProgress(taskData.progress || null);
      }

      // Work orders count
      const woRes = await fetch(`/api/work-orders?company_id=${companyId}`, { headers });
      if (woRes.ok) {
        const woData = await woRes.json();
        setWorkOrderCount(Array.isArray(woData) ? woData.length : woData.data?.length || 0);
      }

      // Knowledge base count
      const kbRes = await fetch(`/api/product-knowledge?company_id=${companyId}`, { headers });
      if (kbRes.ok) {
        const kbData = await kbRes.json();
        setKnowledgeCount(Array.isArray(kbData) ? kbData.length : kbData.entries?.length || 0);
      }

      // Quick phrases count
      const qpRes = await fetch(`/api/quick-phrases?company_id=${companyId}`, { headers });
      if (qpRes.ok) {
        const qpData = await qpRes.json();
        setPhraseCount(Array.isArray(qpData) ? qpData.length : qpData.data?.length || 0);
      }

      // Cost records for before/after comparison
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      const costRes = await fetch(`/api/cost-records?company_id=${companyId}&month=${lastMonthStr}`, { headers });
      if (costRes.ok) {
        const costData = await costRes.json();
        const records = costData.records || costData.data || [];
        const total = records.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.total_amount) || 0), 0);
        setCostBefore(total || null);
      }
      const costRes2 = await fetch(`/api/cost-records?company_id=${companyId}&month=${thisMonth}`, { headers });
      if (costRes2.ok) {
        const costData2 = await costRes2.json();
        const records2 = costData2.records || costData2.data || [];
        const total2 = records2.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.total_amount) || 0), 0);
        setCostAfter(total2 || null);
      }

      // Agents training status
      const agRes = await fetch(`/api/agents?company_id=${companyId}`, { headers });
      if (agRes.ok) {
        const agData = await agRes.json();
        const agents = Array.isArray(agData) ? agData : agData.data || [];
        setAgentCount(agents.length);
        setAgentTrainedCount(agents.filter((a: Record<string, unknown>) => a.training_stage === '独立上岗').length);
      }
    } catch (err) {
      console.error('[成果看板] fetchEnterpriseData error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function getHeaders(): Promise<Record<string, string> | null> {
    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase-browser');
      const sb = await getSupabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };
    } catch { /* ignore */ }
    return null;
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm">加载�?..</div>
      </div>
    );
  }

  /* ── Personal version computed values ── */
  const completedModules = learningProgress.completed?.length || 0;
  const phaseStats = PHASES.map(phase => {
    const phaseCompleted = phase.range[0] <= completedModules
      ? Math.min(completedModules - (phase.range[0] - 1), phase.range[1] - phase.range[0] + 1)
      : 0;
    const phaseTotal = phase.range[1] - phase.range[0] + 1;
    return { ...phase, completed: Math.max(0, phaseCompleted), total: phaseTotal, percent: Math.round((Math.max(0, phaseCompleted) / phaseTotal) * 100) };
  });

  const aiCount = aiUsage.aiAssistant || 0;
  const practiceCount = aiUsage.practiceCount || 0;

  // Learning days estimate (from localStorage)
  const learningDaysKey = 'learning-days-tracker';
  const learningDays: string[] = loadJson(learningDaysKey, []);
  const today = new Date().toISOString().slice(0, 10);
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const weekStartStr = thisWeekStart.toISOString().slice(0, 10);
  const weekDays = learningDays.filter(d => d >= weekStartStr).length;

  // Badge stats
  const badgeStats = { completedModules, practiceCount, usedBusinessTools };

  /* ── Enterprise version computed values ── */
  const completedTaskDays = onboardingTasks.filter(t => t.is_completed).length;
  const totalTaskDays = onboardingProgress?.total_days || onboardingTasks.length || 7;
  const taskPercent = totalTaskDays > 0 ? Math.round((completedTaskDays / totalTaskDays) * 100) : 0;
  const remainingDays = Math.max(0, totalTaskDays - completedTaskDays);

  // Onboarding phases (mirrors PHASE_MANAGER in onboarding-flow)
  const onboardingPhases = [
    { label: '诊断搭建', range: [1, 3] as const, color: 'blue' },
    { label: '财务落地', range: [4, 5] as const, color: 'green' },
    { label: '管控闭环', range: [6, 7] as const, color: 'purple' },
  ];
  const onboardingPhaseStats = onboardingPhases.map(phase => {
    const phaseTasks = onboardingTasks.filter(t => t.day >= phase.range[0] && t.day <= phase.range[1]);
    const phaseCompleted = phaseTasks.filter(t => t.is_completed).length;
    return { ...phase, completed: phaseCompleted, total: phaseTasks.length, percent: phaseTasks.length > 0 ? Math.round((phaseCompleted / phaseTasks.length) * 100) : 0 };
  });

  const costChange = costBefore !== null && costAfter !== null && costBefore > 0
    ? Math.round(((costAfter - costBefore) / costBefore) * 100)
    : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">成果看板</h1>
              <PageHint text="看进步、看成果——学习进度、工具使用、能力提升，一眼看到成长�? />
            </div>
          </div>
          <DataSecurityBadge />
        </div>

        {/* ══════════════════════════════════════════
            Personal Version
        ══════════════════════════════════════════ */}
        {isPersonal && (
          <div className="space-y-6">
            {/* Row 1: Learning progress big card */}
            <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c]">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-sky-400" />
                <span className="text-base font-semibold text-white">学习进度</span>
              </div>
              <div className="flex items-center gap-8">
                {/* Big number */}
                <div className="text-center">
                  <div className="text-5xl font-bold text-sky-400">{completedModules}</div>
                  <div className="text-sm text-slate-400 mt-1">/ {TOTAL_MODULES} 模块</div>
                </div>
                {/* Phase breakdown */}
                <div className="flex-1 space-y-3">
                  {phaseStats.map(phase => (
                    <div key={phase.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${phaseColor(phase.color, 'text')}`}>{phase.label}</span>
                        <span className="text-xs text-slate-400">{phase.completed}/{phase.total}</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#1a3a5c] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${phaseColor(phase.color, 'bar')} transition-all duration-700`}
                          style={{ width: `${phase.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a3a5c] flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>最近学习：{learningDays.length > 0 ? learningDays[learningDays.length - 1] : '暂无记录'}</span>
              </div>
            </div>

            {/* Row 2: AI usage (2 cols) */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Brain className="w-5 h-5" />}
                label="AI急救站使用次�?
                value={aiCount}
                sub="遇到问题，即时解�?
              />
              <StatCard
                icon={<MessageSquare className="w-5 h-5" />}
                label="话术练兵场练习次�?
                value={practiceCount}
                sub="每天练一练，话术自然�?
              />
            </div>

            {/* Row 3: Learning days */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="累计学习天数"
                value={learningDays.length}
                sub="坚持就是胜利"
              />
              <StatCard
                icon={<Zap className="w-5 h-5" />}
                label="本周学习天数"
                value={weekDays}
                sub="保持节奏"
              />
            </div>

            {/* Row 4: Achievement badges */}
            <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c]">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-base font-semibold text-white">成就徽章</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {BADGES.map(badge => {
                  const achieved = badge.check(badgeStats);
                  return (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        achieved
                          ? 'bg-[#1a3a5c]/60 border-sky-500/30'
                          : 'bg-[#0F2B46]/40 border-[#1a3a5c] opacity-50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        achieved ? 'bg-sky-500/20' : 'bg-[#1a3a5c]/60'
                      }`}>
                        {badge.icon}
                      </div>
                      <div className="text-center">
                        <div className={`text-sm font-medium ${achieved ? 'text-white' : 'text-slate-500'}`}>
                          {badge.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{badge.desc}</div>
                      </div>
                      {achieved && (
                        <div className="flex items-center gap-1 text-xs text-sky-400">
                          <CheckCircle2 className="w-3 h-3" /> 已达�?
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            Enterprise Version (Pro / Flagship)
        ══════════════════════════════════════════ */}
        {!isPersonal && (
          <div className="space-y-6">
            {/* Row 1: Onboarding completion (big ring) */}
            <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c]">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-sky-400" />
                <span className="text-base font-semibold text-white">学习完成�?/span>
              </div>
              <div className="flex items-center gap-8">
                {/* Ring progress */}
                <div className="relative flex-shrink-0">
                  <CircularProgress percent={taskPercent} size={140} strokeWidth={12} color="blue" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-sky-400">{taskPercent}%</span>
                    <span className="text-xs text-slate-400">完成�?/span>
                  </div>
                </div>
                {/* Phase breakdown */}
                <div className="flex-1 space-y-3">
                  {onboardingPhaseStats.map(phase => (
                    <div key={phase.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${phaseColor(phase.color, 'text')}`}>{phase.label}</span>
                        <span className="text-xs text-slate-400">{phase.completed}/{phase.total}�?/span>
                      </div>
                      <div className="w-full h-2.5 bg-[#1a3a5c] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${phaseColor(phase.color, 'bar')} transition-all duration-700`}
                          style={{ width: `${phase.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-slate-400">
                    剩余 <span className="text-sky-400 font-semibold">{remainingDays}</span> �?
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Cost change */}
            <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c]">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-green-400" />
                <span className="text-base font-semibold text-white">售后成本变化</span>
              </div>
              <div className="grid grid-cols-3 gap-6 items-center">
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">上月售后支出</div>
                  <div className="text-2xl font-bold text-slate-300">
                    {costBefore !== null ? `¥${costBefore.toLocaleString()}` : '--'}
                  </div>
                </div>
                <div className="text-center">
                  {costChange !== null ? (
                    <div className={`text-2xl font-bold ${costChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {costChange <= 0 ? '' : '+'}{costChange}%
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-slate-500">--</div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">环比变化</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">本月售后支出</div>
                  <div className="text-2xl font-bold text-slate-300">
                    {costAfter !== null ? `¥${costAfter.toLocaleString()}` : '--'}
                  </div>
                </div>
              </div>
              {costBefore === null && costAfter === null && (
                <div className="text-center text-xs text-slate-500 mt-3">
                  暂无成本数据，请在成本预警中录入
                </div>
              )}
            </div>

            {/* Row 3: Business metrics (3 cols) */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={<Award className="w-5 h-5" />}
                label="累计处理工单"
                value={workOrderCount}
                sub="问题闭环追踪"
              />
              <StatCard
                icon={<BookOpen className="w-5 h-5" />}
                label="知识库条�?
                value={knowledgeCount}
                sub="产品知识沉淀"
              />
              <StatCard
                icon={<MessageSquare className="w-5 h-5" />}
                label="话术模板�?
                value={phraseCount}
                sub="标准化沟�?
              />
            </div>

            {/* Row 4: Team growth (Pro/Flagship only) */}
            <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c]">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-base font-semibold text-white">团队成长</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-slate-400 mb-1">团队培训完成�?/div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-sky-400">
                      {agentCount > 0 ? Math.round((agentTrainedCount / agentCount) * 100) : 0}%
                    </span>
                    <span className="text-sm text-slate-400">
                      {agentTrainedCount}/{agentCount} 人独立上�?
                    </span>
                  </div>
                  <div className="mt-2 w-full h-2 bg-[#1a3a5c] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-700"
                      style={{ width: `${agentCount > 0 ? Math.round((agentTrainedCount / agentCount) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">AI工具团队使用总次�?/div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-sky-400">{aiCount}</span>
                    <span className="text-sm text-slate-400">�?/span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    提升效率的关键指�?
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
