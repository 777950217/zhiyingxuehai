'use client';

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { markOnboardingDay } from '@/lib/onboarding-helpers';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { Button } from '@/components/ui/button';
import { PageHint } from '@/components/page-hint';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Download, FileText, ChevronRight, Check, Wand2, X, ArrowLeft,
  ClipboardCheck, ClipboardEdit, Plus, ChevronDown, ChevronUp, Loader2,
  AlertTriangle, TrendingUp, TrendingDown, CalendarDays, DollarSign,
  History, Upload, FileSpreadsheet, BarChart3, Target, Users, Award,
  Zap, Eye, Trash2, Play, FileBarChart, ArrowUpRight, CheckCircle, Lightbulb,
  MessageSquare, BookOpen, Shield, Brain,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PermissionLocked } from '@/components/permission-locked';
import { getPlanLimits, isOverLimit, formatLimit } from '@/lib/plan-limits';
import Link from 'next/link';
import { DataSecurityBadge } from '@/components/data-security-badge';

const KPI_TYPES = [
  { id: '售前', label: '售前KPI', desc: '咨询→成交全流程考核', icon: '📞' },
  { id: '售后', label: '售后KPI', desc: '问题解决+客户满意�?, icon: '🔧' },
  { id: '通用', label: '通用KPI', desc: '售前售后混合团队', icon: '📊' },
  { id: '薪酬', label: '薪酬方案', desc: '底薪+绩效+提成结构', icon: '💰' },
];

const PAIN_POINTS = ['响应�?, '转化�?, '投诉�?, '话术不统一', '新人上手�?, '数据不透明'];
const GOALS = ['提升转化�?, '降低投诉�?, '缩短响应时间', '提升客单�?, '提高复购�?, '规范话术'];

/* ─── 质检相关类型 ─── */
interface QualityRecord {
  id: string;
  company_id: string;
  inspector_id: string;
  staff_id: string;
  problem_solution_id: string | null;
  response_score: number;
  script_score: number;
  attitude_score: number;
  process_score: number;
  resolution_score: number;
  total_score: number;
  comment: string;
  created_at: string;
  inspector_name?: string;
  staff_name?: string;
}

interface KpiPlan {
  id: string;
  company_id: string;
  name: string;
  team_size: number | null;
  team_stage: string | null;
  focus: string;
  metrics: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

interface KpiMetricRecord {
  id: string;
  company_id: string;
  record_date: string;
  metrics_data: Record<string, number>;
}

interface AgentOption {
  id: string;
  name: string;
}

interface ProblemSolutionOption {
  id: string;
  query: string;
  created_at: string;
}

// 维度改进建议映射（得�?< 12分即 <60% 时触发）
const IMPROVEMENT_SUGGESTIONS: Record<string, { label: string; links: { label: string; href: string; icon: typeof MessageSquare }[] }> = {
  response_score: {
    label: '响应时效',
    links: [
      { label: '查看话术�?· 快捷回复', href: '/newbie-training?module=6', icon: MessageSquare },
      { label: '培训：售中工作细�?, href: '/newbie-training?module=4', icon: BookOpen },
    ],
  },
  script_score: {
    label: '话术规范',
    links: [
      { label: '查看话术�?· 标准话术', href: '/newbie-training?module=6', icon: MessageSquare },
      { label: '培训：快捷话术速查', href: '/newbie-training?module=6', icon: BookOpen },
    ],
  },
  attitude_score: {
    label: '服务态度',
    links: [
      { label: '查看SOP · 投诉处理流程', href: '/newbie-training?module=5', icon: BookOpen },
      { label: '培训：售后工作手�?, href: '/newbie-training?module=5', icon: BookOpen },
    ],
  },
  process_score: {
    label: '合规�?,
    links: [
      { label: '查看红线规则', href: '/newbie-training?module=4', icon: Shield },
      { label: '培训：全平台规则速查', href: '/newbie-training?module=2', icon: BookOpen },
    ],
  },
  resolution_score: {
    label: '问题解决�?,
    links: [
      { label: '查看AI问题解决�?, href: '/ai-assistant', icon: Brain },
      { label: '培训：卫浴基础知识', href: '/newbie-training?module=1', icon: BookOpen },
    ],
  },
};

const SCORE_DIMENSIONS = [
  { key: 'response_score', label: '响应时效', max: 20, desc: '回复速度、首次响应时�?, ref: '💡 超时未回复：-3�? },
  { key: 'script_score', label: '话术规范', max: 20, desc: '标准话术使用、表达专业度', ref: '💡 未按话术回复�?2�? },
  { key: 'attitude_score', label: '服务态度', max: 20, desc: '耐心、礼貌、主动�?, ref: '💡 用语不礼貌：-5�?/ 态度冷淡�?3�? },
  { key: 'process_score', label: '流程合规', max: 20, desc: '判断链执行、留痕规�? },
  { key: 'resolution_score', label: '问题解决', max: 20, desc: '客户满意度、问题闭环率', ref: '💡 信息不准确：-5�? },
] as const;

const QUICK_TAGS = ["话术不规�?, "响应超时", "态度问题", "流程遗漏", "解决不彻�?];

type ScoreKey = typeof SCORE_DIMENSIONS[number]['key'];

const KPI_METRICS = [
  { key: 'responseTime', label: '响应时长', unit: '分钟', target: 3, ref: '💡 行业参考：�?5�? },
  { key: 'conversionRate', label: '转化�?, unit: '%', target: 30, ref: '💡 行业参考：�?5%' },
  { key: 'avgOrderValue', label: '客单�?, unit: '�?, target: 500 },
  { key: 'resolutionRate', label: '问题解决�?, unit: '%', target: 90, ref: '💡 行业参考：�?5%' },
  { key: 'satisfaction', label: '客户满意�?, unit: '%', target: 85, ref: '💡 行业参考：�?0%' },
  { key: 'returnHandling', label: '退换货处理时长', unit: '小时', target: 24 },
];

const KPI_IMPROVEMENT: Record<string, { summary: string; links: { text: string; href: string; icon: string }[] }> = {
  '响应时长': {
    summary: '优化响应速度',
    links: [
      { text: '优化快捷话术使用', href: '/newbie-training?module=6', icon: 'MessageSquare' },
      { text: '查看排班是否合理', href: '/kpi', icon: 'CalendarDays' },
    ],
  },
  '转化�?: {
    summary: '强化促单能力',
    links: [
      { text: '强化促单话术', href: '/newbie-training?module=6', icon: 'MessageSquare' },
      { text: '查看售中细则培训', href: '/newbie-training?module=4', icon: 'BookOpen' },
    ],
  },
  '客单�?: {
    summary: '提升客单价策�?,
    links: [
      { text: '查看售中推荐话术', href: '/newbie-training?module=6', icon: 'MessageSquare' },
      { text: '卫浴知识培训', href: '/newbie-training?module=1', icon: 'BookOpen' },
    ],
  },
  '问题解决�?: {
    summary: '加强问题解决能力',
    links: [
      { text: '加强产品知识培训', href: '/newbie-training?module=1', icon: 'BookOpen' },
      { text: '使用AI问题解决器辅�?, href: '/ai-assistant', icon: 'Brain' },
    ],
  },
  '客户满意�?: {
    summary: '提升客户满意�?,
    links: [
      { text: '查看质检低分维度', href: '/kpi', icon: 'BarChart3' },
      { text: '加强服务态度培训', href: '/newbie-training?module=5', icon: 'BookOpen' },
    ],
  },
  '退换货处理时长': {
    summary: '加快退换货处理',
    links: [
      { text: '查看售后工作手册', href: '/newbie-training?module=5', icon: 'BookOpen' },
      { text: '工单处理流程优化', href: '/work-orders', icon: 'FileBarChart' },
    ],
  },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare, BookOpen, CalendarDays, Brain, BarChart3, FileBarChart,
};

function getTotalBg(score: number): string {
  if (score >= 90) return 'bg-green-50 border-green-200';
  if (score >= 70) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function getTotalColor(score: number): string {
  if (score >= 90) return 'text-green-700';
  if (score >= 70) return 'text-yellow-700';
  return 'text-red-700';
}

function getTotalRing(score: number): string {
  if (score >= 90) return 'ring-green-200 border-green-400';
  if (score >= 70) return 'ring-yellow-200 border-yellow-400';
  return 'ring-red-200 border-red-400';
}

function getBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

/* ─── 三维框架 Mock 数据 ─── */
const MOCK_KPI_GOALS = [
  { metric: 'KPI达标�?, target: 85, unit: '%', actual: 72, weight: '25%', inverse: false },
  { metric: '客诉�?, target: 5, unit: '%', actual: 7.2, weight: '20%', inverse: true },
  { metric: '平均响应时长', target: 3, unit: '分钟', actual: 4.5, weight: '15%', inverse: true },
  { metric: '客户满意�?, target: 90, unit: '%', actual: 88, weight: '25%', inverse: false },
  { metric: '问题解决�?, target: 90, unit: '%', actual: 92, weight: '15%', inverse: false },
];

const MOCK_KPI_PATHS = [
  { type: '培训', description: '完成话术规范专项培训，覆�?名客�?, relatedMetrics: ['客诉�?, '满意�?], date: '周一' },
  { type: '质检', description: '周质检发现2人话术不规范，已纠正', relatedMetrics: ['KPI达标�?], date: '周二' },
  { type: '流程', description: '调整首次响应SOP，增加快捷语覆盖�?, relatedMetrics: ['平均响应时长'], date: '周三' },
  { type: '异常', description: '退款率异常升高，排查为物流问题', relatedMetrics: ['问题解决�?], date: '周四' },
  { type: '培训', description: '售后场景模拟训练2�?, relatedMetrics: ['满意�?, '问题解决�?], date: '周五' },
  { type: '管理', description: 'KPI目标值调整：响应时长目标�?分降�?�?, relatedMetrics: ['平均响应时长'], date: '周六' },
];

const KPI_REVIEW_QUESTIONS = [
  '这个指标未达标的根本原因是什么？',
  '是人员能力问题还是流程问题？',
  '是否有外部因素影响（如促销、物流）�?,
  '目标值设置是否合理？需要调整吗�?,
  '同类企业该指标的中位值是多少�?,
  '之前有采取过什么措施？效果如何�?,
  '接下来的1周，你计划采取什么具体行动？',
  '如何监控改进效果，多久复检一次？',
];

const KPI_PATH_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '培训': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '质检': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '流程': { bg: 'bg-green-100', text: 'text-green-700' },
  '异常': { bg: 'bg-red-100', text: 'text-red-700' },
  '管理': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '其他': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function KPIPage() {

  const { profile, authFetch } = useAuth();

  // Permission guard
  const role = profile?.role || 'staff';
  const lockedMsg = (role === 'staff' || role === 'personal_user') ? '解锁专业版即可使用绩效管理功�? : null;
  if (lockedMsg) {
    return <PermissionLocked title="绩效管理" description={lockedMsg} />;
  }

  const canInspect = role === 'enterprise_manager' || role === 'enterprise_admin' || role === 'admin';

  // ─── Tab 状�?───
  const [activeTab, setActiveTab] = useState<'setting' | 'quality' | 'dashboard'>('setting');

  // ─── KPI 生成原有状�?───
  const [step, setStep] = useState(1);
  const [kpiType, setKpiType] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [extraNote, setExtraNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [creditsDialog, setCreditsDialog] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ─── KPI方案列表 ───
  const [kpiPlans, setKpiPlans] = useState<KpiPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<KpiPlan | null>(null);

  // ─── 质检状�?───
  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);
  const [qualityTotal, setQualityTotal] = useState(0);
  const [qualityPage, setQualityPage] = useState(0);

  // 从localStorage读取当前生效的KPI方案
  const [activeKpiPlan, setActiveKpiPlan] = useState<{id:string;name:string;type?:string;indicators:Array<{name:string;target:string;weight:string;category:string;actualValue?:number;actualDate?:string}>} | null>(null);
  const [dashSubTab, setDashSubTab] = useState<'presale'|'aftersale'>('presale');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('active-kpi-plan');
      if (saved) setActiveKpiPlan(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qualityView, setQualityView] = useState<'records' | 'report'>('records');
  const [dashboardViewMode, setDashboardViewMode] = useState<'byMember' | 'byIndicator'>('byMember');
  const [expandedKpiImprovement, setExpandedKpiImprovement] = useState<string | null>(null);
  const [expandedKpiReview, setExpandedKpiReview] = useState<string | null>(null);

  // ─── 质检弹窗状�?───
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [solutions, setSolutions] = useState<ProblemSolutionOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedSolutionId, setSelectedSolutionId] = useState('');
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    response_score: 12, script_score: 12, attitude_score: 12,
    process_score: 12, resolution_score: 12,
  });
  const [inspectComment, setInspectComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');

  // ─── 绩效看板状�?───
  const [kpiMetricRecords, setKpiMetricRecords] = useState<KpiMetricRecord[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // ─── 版本数量限制 ───
  const limits = getPlanLimits(role, profile?.companyPlan);
  const [kpiUpgradeOpen, setKpiUpgradeOpen] = useState(false);

  // ─── 关联客服 ───
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [agentList, setAgentList] = useState<AgentOption[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);

  // 从activeKpiPlan读取已关联的客服ID
  useEffect(() => {
    if (activeKpiPlan) {
      const linked = (activeKpiPlan as Record<string, unknown>).linkedAgentIds as string[] | undefined;
      setSelectedAgentIds(linked || []);
    }
  }, [activeKpiPlan]);

  // ─── 实际值录�?───
  const [showActualDialog, setShowActualDialog] = useState(false);
  const [editingIndicatorIdx, setEditingIndicatorIdx] = useState<number>(-1);
  const [actualInput, setActualInput] = useState('');
  const csvImportRef = useRef<HTMLInputElement>(null);

  // ─── 绩效数据录入弹窗 ───
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryAgentId, setEntryAgentId] = useState('');
  const [entryPeriod, setEntryPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [entryScores, setEntryScores] = useState<Record<string, string>>({});
  const [entryRemark, setEntryRemark] = useState('');
  const [entrySubmitting, setEntrySubmitting] = useState(false);

  // ─── 批量导入弹窗 ───
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchPreview, setBatchPreview] = useState<Array<Record<string, string>>>([]);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchResult, setBatchResult] = useState<{ success: number; fail: number; errors: string[] } | null>(null);
  const batchFileRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 10;

  /* ─── KPI 方案加载 ─── */
  const fetchKpiPlans = useCallback(async () => {
    if (!profile?.companyId) return;
    setPlansLoading(true);
    try {
      const res = await authFetch(`/api/kpi-plans?company_id=${profile.companyId}`);
      const json = await res.json();
      if (json.data) setKpiPlans(json.data);
    } catch (err) {
      console.error('Fetch kpi plans error:', err);
    } finally {
      setPlansLoading(false);
    }
  }, [profile?.companyId, authFetch]);

  useEffect(() => {
    fetchKpiPlans();
  }, [fetchKpiPlans]);

  /* ─── 绩效看板数据加载 ─── */
  const fetchDashboardData = useCallback(async () => {
    if (!profile?.companyId) return;
    setDashboardLoading(true);
    try {
      const res = await authFetch(`/api/kpi-data?companyId=${profile.companyId}`);
      if (res.ok) {
        const data = await res.json();
        setKpiMetricRecords(data.data || []);
      }
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [profile?.companyId, authFetch]);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData();
  }, [activeTab, fetchDashboardData]);

  /* ─── KPI 生成逻辑 ─── */
  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleGenerate = useCallback(async () => {
    if (!kpiType) return;
    const isEnterprise = profile?.role === 'staff' || profile?.role === 'enterprise_manager' || profile?.role === 'personal_user';
    if (isEnterprise) {
      setCreditsDialog(true);
      return;
    }

    setGenerating(true);
    setResult('');

    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await authFetch('/api/ai/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiType,
          teamSize: teamSize || undefined,
          painPoints,
          goals,
          extraNote: extraNote || undefined,
          userId: profile?.id,
          companyId: profile?.companyId,
        }),
        signal: ctrl.signal,
      });

      if (res.status === 403) {
        setCreditsDialog(true);
        setGenerating(false);
        return;
      }

      if (!res.ok) {
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              fullText += parsed.content;
              setResult(fullText);
            }
          } catch { /* ignore */ }
        }
      }
      setStep(3);
      // 刷新方案列表
      fetchKpiPlans();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('KPI gen error:', err);
      }
    } finally {
      setGenerating(false);
    }
  }, [kpiType, teamSize, painPoints, goals, extraNote, profile, fetchKpiPlans]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPI方案_${kpiType}_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, kpiType]);

  const handleExportExcel = useCallback(() => {
    if (!result) return;
    const lines = result.split('\n').filter(l => l.trim());
    const csvContent = lines.map(l => `"${l.replace(/"/g, '""')}"`).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPI方案_${kpiType}_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, kpiType]);

  const handleReset = () => {
    setStep(1);
    setKpiType('');
    setTeamSize('');
    setPainPoints([]);
    setGoals([]);
    setExtraNote('');
    setResult('');
  };

  /* ─── 启用方案 ─── */
  const handleActivatePlan = async (planId: string) => {
    try {
      const res = await authFetch('/api/kpi-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, activate: true }),
      });
      const json = await res.json();
      if (json.data) {
        // 同步保存到localStorage供绩效看板读�?
        const plan = kpiPlans.find(p => p.id === planId);
        if (plan) {
          try {
            const metrics = typeof plan.metrics === 'string' ? JSON.parse(plan.metrics) : plan.metrics;
            const planType = (plan.name || '').includes('售前') ? '售前' : (plan.name || '').includes('售后') ? '售后' : '通用';
            const activePlan = {
              id: plan.id,
              name: plan.name || kpiType + 'KPI方案',
              type: planType as '售前' | '售后' | '通用',
              createdAt: plan.created_at,
              isActive: true,
              indicators: Array.isArray(metrics) ? metrics.map((m: Record<string, string>) => ({
                name: m.name || m.indicator || m.metric || '',
                target: m.target || m.value || '',
                weight: m.weight || '',
                category: m.category || '',
              })) : [],
            };
            localStorage.setItem('active-kpi-plan', JSON.stringify(activePlan));
          } catch { /* 解析失败不影响主流程 */ }
        }
        toast.success('方案已启�?);
        fetchKpiPlans();
      } else {
        toast.error(json.error || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  /* ─── 应用AI生成的当前方�?─── */
  const handleApplyCurrentPlan = () => {
    // 从AI生成结果解析指标
    const indicators: { name: string; target: string; weight: string; category: string }[] = [];
    const lines = result.split('\n');
    let currentCategory = '';
    for (const line of lines) {
      const trimmed = line.trim();
      // 检测分类标�?(�?"一、核心指�? "二、过程指�?)
      const catMatch = trimmed.match(/^[一二三四五六七八九十]+[�?．]\s*(.+)/);
      if (catMatch) {
        currentCategory = catMatch[1].replace(/[�?]/g, '').trim();
        continue;
      }
      // 检测指标行 (含序�?指标�?目标�?
      const indMatch = trimmed.match(/^\d+[�?�?）]\s*(.+?)[�?]\s*(.+)/);
      if (indMatch) {
        const name = indMatch[1].replace(/\*\*/g, '').trim();
        const rest = indMatch[2].replace(/\*\*/g, '').trim();
        // 尝试提取权重
        const weightMatch = rest.match(/权重[�?]*\s*(\d+%)/);
        indicators.push({
          name,
          target: rest,
          weight: weightMatch ? weightMatch[1] : '',
          category: currentCategory || '核心指标',
        });
      }
    }

    const resolvedIndicators = indicators.length > 0 ? indicators : [
      { name: '平均首次响应时长', target: '�?0�?, weight: '10%', category: '过程指标', ref: '💡 行业参考：�?5�? },
      { name: '客户满意�?, target: '�?0%', weight: '20%', category: '核心指标', ref: '💡 行业参考：�?0%' },
      { name: '问题解决�?, target: '�?5%', weight: '15%', category: '核心指标', ref: '💡 行业参考：�?5%' },
      { name: '话术规范�?, target: '�?0�?, weight: '10%', category: '过程指标' },
      { name: '转化�?, target: '�?0%', weight: '15%', category: '核心指标', ref: '💡 行业参考：�?5%' },
      { name: '售后成本控制', target: '�?%营收', weight: '10%', category: '成本指标', ref: '💡 行业参考：赔付率≤3%' },
    ];

    // 检查专业版指标上限
    if (limits.maxKpiIndicators !== Infinity && resolvedIndicators.length > limits.maxKpiIndicators) {
      // 专业版：截取前N个指标并提示
      const truncated = resolvedIndicators.slice(0, limits.maxKpiIndicators);
      const activePlan = {
        id: 'ai-' + Date.now(),
        name: kpiType + 'KPI方案',
        type: kpiType as '售前' | '售后' | '通用',
        createdAt: new Date().toISOString().slice(0, 10),
        isActive: true,
        indicators: truncated,
      };
      localStorage.setItem('active-kpi-plan', JSON.stringify(activePlan));
      setKpiUpgradeOpen(true);
      toast.success(`方案已应用，当前版本最多支�?{formatLimit(limits.maxKpiIndicators)}个指标，已截取前${limits.maxKpiIndicators}个`);
      return;
    }

    const activePlan = {
      id: 'ai-' + Date.now(),
      name: kpiType + 'KPI方案',
      type: kpiType as '售前' | '售后' | '通用',
      createdAt: new Date().toISOString().slice(0, 10),
      isActive: true,
      indicators: resolvedIndicators,
    };
    localStorage.setItem('active-kpi-plan', JSON.stringify(activePlan));
    toast.success('方案已应用，绩效看板将按此方案展示指�?);
  };

  /* ─── 关联客服 ─── */
  const handleOpenAgentDialog = async () => {
    setShowAgentDialog(true);
    setAgentLoading(true);
    try {
      const res = await authFetch(`/api/agents?companyId=${profile?.companyId || ''}`);
      const json = await res.json();
      const list = (json.data || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
      setAgentList(list);
    } catch { /* ignore */ }
    setAgentLoading(false);
  };

  const handleSaveLinkedAgents = () => {
    if (!activeKpiPlan) return;
    const updated = { ...activeKpiPlan, linkedAgentIds: selectedAgentIds };
    localStorage.setItem('active-kpi-plan', JSON.stringify(updated));
    setActiveKpiPlan(updated as typeof activeKpiPlan);
    setShowAgentDialog(false);
    toast.success(`已关�?${selectedAgentIds.length} 名客服`);
  };

  const linkedAgentNames = activeKpiPlan
    ? ((activeKpiPlan as Record<string, unknown>).linkedAgentIds as string[] || [])
        .map(id => agentList.find(a => a.id === id)?.name).filter(Boolean)
    : [];

  /* ─── 实际值录�?─── */
  const handleOpenActualDialog = (idx: number) => {
    if (!activeKpiPlan) return;
    setEditingIndicatorIdx(idx);
    const current = activeKpiPlan.indicators[idx]?.actualValue;
    setActualInput(current !== undefined ? String(current) : '');
    setShowActualDialog(true);
  };

  const handleSaveActualValue = () => {
    if (!activeKpiPlan || editingIndicatorIdx < 0) return;
    const val = actualInput.trim() === '' ? undefined : Number(actualInput);
    if (val !== undefined && isNaN(val)) {
      toast.error('请输入有效数�?);
      return;
    }
    const updated = {
      ...activeKpiPlan,
      indicators: activeKpiPlan.indicators.map((ind, i) =>
        i === editingIndicatorIdx
          ? { ...ind, actualValue: val, actualDate: val !== undefined ? new Date().toISOString().slice(0, 10) : undefined }
          : ind
      ),
    };
    localStorage.setItem('active-kpi-plan', JSON.stringify(updated));
    setActiveKpiPlan(updated as typeof activeKpiPlan);
    setShowActualDialog(false);
    toast.success(val !== undefined ? '实际值已保存' : '已清除实际�?);
  };

  /* ─── 绩效数据录入（保存到数据库） ─── */
  const handleOpenEntryModal = async () => {
    if (!activeKpiPlan) {
      toast.error('请先在KPI设定中生成并启用一个方案，再录入绩效数�?);
      return;
    }
    // 加载客服列表
    if (agents.length === 0) {
      try {
        const res = await authFetch(`/api/agents?companyId=${profile?.companyId || ''}`);
        const json = await res.json();
        const list = (json.data || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
        setAgents(list.filter((a: AgentOption) => a.id !== profile?.id));
      } catch { /* ignore */ }
    }
    setEntryAgentId('');
    setEntryPeriod(new Date().toISOString().slice(0, 7));
    setEntryScores({});
    setEntryRemark('');
    setShowEntryModal(true);
  };

  const handleSaveEntry = async () => {
    if (!profile?.companyId) return;
    if (!entryAgentId) {
      toast.error('请选择客服');
      return;
    }
    if (!entryPeriod) {
      toast.error('请选择考核月份');
      return;
    }
    if (!activeKpiPlan || activeKpiPlan.indicators.length === 0) {
      toast.error('当前没有KPI指标，请先设定方�?);
      return;
    }

    setEntrySubmitting(true);
    try {
      // 为每个指标录入一条记�?
      const results = await Promise.allSettled(
        activeKpiPlan.indicators.map(async (ind) => {
          const actualStr = entryScores[ind.name];
          if (!actualStr || actualStr.trim() === '') return null; // 跳过未填的指�?

          const actualNum = parseFloat(actualStr);
          const targetNum = parseFloat(String(ind.target).replace(/[^\d.]/g, ''));
          const score = !isNaN(actualNum) && !isNaN(targetNum) && targetNum > 0
            ? Math.round((actualNum / targetNum) * 100)
            : null;

          const res = await authFetch('/api/kpi-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: entryAgentId,
              recordDate: `${entryPeriod}-01`,
              period: entryPeriod,
              metricName: ind.name,
              metricsData: {
                target: ind.target,
                actual: actualNum,
                weight: ind.weight,
                category: ind.category,
                agentName: agents.find(a => a.id === entryAgentId)?.name || '',
              },
              score,
              maxScore: 100,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || '保存失败');
          return json;
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null && entryScores[activeKpiPlan.indicators[results.indexOf(r)]?.name]?.trim()));

      // 同步更新localStorage中的实际�?
      const updatedIndicators = activeKpiPlan.indicators.map(ind => {
        const val = entryScores[ind.name];
        if (val && val.trim() !== '') {
          return { ...ind, actualValue: parseFloat(val), actualDate: new Date().toISOString().slice(0, 10) };
        }
        return ind;
      });
      const updatedPlan = { ...activeKpiPlan, indicators: updatedIndicators };
      setActiveKpiPlan(updatedPlan as typeof activeKpiPlan);
      localStorage.setItem('active-kpi-plan', JSON.stringify(updatedPlan));

      toast.success(`成功录入 ${succeeded} 个指标数据`);
      setShowEntryModal(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Save entry error:', err);
      toast.error('录入失败，请重试');
    } finally {
      setEntrySubmitting(false);
    }
  };

  /* ─── 批量导入 ─── */
  const handleOpenBatchModal = async () => {
    setBatchFile(null);
    setBatchPreview([]);
    setBatchResult(null);
    // 加载客服列表
    if (agents.length === 0) {
      try {
        const res = await authFetch(`/api/agents?companyId=${profile?.companyId || ''}`);
        const json = await res.json();
        const list = (json.data || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
        setAgents(list.filter((a: AgentOption) => a.id !== profile?.id));
      } catch { /* ignore */ }
    }
    setShowBatchModal(true);
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchFile(file);
    setBatchResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          toast.error('文件至少需�?行表�?1行数�?);
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim());
        const rows: Array<Record<string, string>> = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 3) continue;
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = cols[idx] || '';
          });
          rows.push(row);
        }
        if (rows.length === 0) {
          toast.error('未解析到有效数据�?);
          return;
        }
        setBatchPreview(rows);
      } catch {
        toast.error('文件解析失败，请检查格�?);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBatchImport = async () => {
    if (!profile?.companyId || batchPreview.length === 0) return;
    setBatchImporting(true);
    try {
      const records: Array<{
        agentId: string;
        agentName: string;
        period: string;
        recordDate: string;
        metricName: string;
        target: string;
        actual: string;
        remark: string;
      }> = [];

      // 解析模板格式
      // 格式1: 客服姓名,考核月份,指标1,指标2,...,备注（按指标名列表列�?
      // 格式2: 客服姓名,考核月份,指标名称,目标�?实际�?备注（通用格式�?
      const headers = Object.keys(batchPreview[0]);
      const hasColumnName = headers.some(h => h.includes('指标名称') || h.includes('指标�?) || h.includes('指标'));

      if (hasColumnName) {
        // 通用格式：每行一个指�?
        batchPreview.forEach(row => {
          const agentName = row['客服姓名'] || row['客服'] || row['姓名'] || '';
          const period = row['考核月份'] || row['月份'] || row['�?] || new Date().toISOString().slice(0, 7);
          const metricName = row['指标名称'] || row['指标'] || row['指标�?] || '';
          const target = row['目标�?] || row['目标'] || '';
          const actual = row['实际�?] || row['实际'] || '';
          const remark = row['备注'] || '';
          if (!metricName) return;
          const matchedAgent = agents.find(a => a.name === agentName || agentName.includes(a.name));
          records.push({
            agentId: matchedAgent?.id || '',
            agentName,
            period,
            recordDate: period.length >= 7 ? `${period}-01` : new Date().toISOString().slice(0, 10),
            metricName,
            target,
            actual,
            remark,
          });
        });
      } else if (activeKpiPlan) {
        // 按指标名列的格式：每行一个客服，各指标为独立�?
        batchPreview.forEach(row => {
          const agentName = row['客服姓名'] || row['客服'] || row['姓名'] || '';
          const period = row['考核月份'] || row['月份'] || row['�?] || new Date().toISOString().slice(0, 7);
          const remark = row['备注'] || '';
          const matchedAgent = agents.find(a => a.name === agentName || agentName.includes(a.name));
          // 从header中匹配指标列（排除客服姓名、考核月份、备注）
          const skipHeaders = ['客服姓名', '客服', '姓名', '考核月份', '月份', '�?, '备注'];
          headers.forEach(h => {
            if (skipHeaders.some(s => h.includes(s))) return;
            // 提取指标名（去掉括号内的目标值）
            const metricName = h.replace(/\(.*\)/, '').replace(/�?*�?, '').trim();
            const actual = row[h] || '';
            if (!actual.trim()) return;
            // 从activeKpiPlan找目标�?
            const ind = activeKpiPlan.indicators.find(i => i.name === metricName || metricName.includes(i.name) || i.name.includes(metricName));
            records.push({
              agentId: matchedAgent?.id || '',
              agentName,
              period,
              recordDate: period.length >= 7 ? `${period}-01` : new Date().toISOString().slice(0, 10),
              metricName,
              target: ind?.target || '',
              actual,
              remark,
            });
          });
        });
      }

      if (records.length === 0) {
        toast.error('未找到有效的指标数据，请检查表头是否包�?指标名称"列或使用模板格式');
        setBatchImporting(false);
        return;
      }

      const res = await authFetch('/api/kpi-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', records }),
      });
      const json = await res.json();

      if (res.ok) {
        setBatchResult({
          success: json.imported || records.length,
          fail: 0,
          errors: [],
        });
        toast.success(`成功导入 ${json.imported || records.length} 条数据`);
        fetchDashboardData();
        // 同步更新localStorage
        if (activeKpiPlan) {
          const updatedIndicators = activeKpiPlan.indicators.map(ind => {
            const match = records.find(r => r.metricName === ind.name || ind.name.includes(r.metricName) || r.metricName.includes(ind.name));
            if (match && match.actual) {
              return { ...ind, actualValue: parseFloat(String(match.actual)), actualDate: new Date().toISOString().slice(0, 10) };
            }
            return ind;
          });
          const updatedPlan = { ...activeKpiPlan, indicators: updatedIndicators };
          setActiveKpiPlan(updatedPlan as typeof activeKpiPlan);
          localStorage.setItem('active-kpi-plan', JSON.stringify(updatedPlan));
        }
      } else {
        setBatchResult({
          success: 0,
          fail: records.length,
          errors: [json.error || '导入失败'],
        });
        toast.error(json.error || '导入失败');
      }
    } catch (err) {
      console.error('Batch import error:', err);
      setBatchResult({
        success: 0,
        fail: batchPreview.length,
        errors: ['网络错误，请重试'],
      });
      toast.error('导入失败，请重试');
    } finally {
      setBatchImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    // 客户端生成CSV模板，避免API鉴权问题
    const BOM = '\uFEFF';
    let header = '客服姓名,考核月份';
    if (activeKpiPlan) {
      activeKpiPlan.indicators.forEach(ind => {
        header += `,${ind.name}(目标:${ind.target})`;
      });
    } else {
      header += ',指标名称,目标�?实际�?;
    }
    header += ',备注\n';
    const example1 = activeKpiPlan
      ? `张三,${new Date().toISOString().slice(0, 7)},${activeKpiPlan.indicators.map(() => '90').join(',')},达标\n`
      : `张三,${new Date().toISOString().slice(0, 7)},客户满意�?�?0%,92%,持续保持\n`;
    const example2 = activeKpiPlan
      ? `李四,${new Date().toISOString().slice(0, 7)},${activeKpiPlan.indicators.map(() => '75').join(',')},需改进\n`
      : `李四,${new Date().toISOString().slice(0, 7)},问题解决�?�?5%,80%,待提升\n`;
    const csvContent = BOM + header + example1 + example2;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kpi_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── CSV导入实际�?─── */
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast.error('CSV文件至少需�?行表�?1行数�?); return; }
        // 解析表头
        const headers = lines[0].split(',').map(h => h.trim());
        const nameIdx = headers.findIndex(h => h.includes('指标�?) || h.includes('指标'));
        const targetIdx = headers.findIndex(h => h.includes('目标'));
        const actualIdx = headers.findIndex(h => h.includes('实际'));
        const weightIdx = headers.findIndex(h => h.includes('权重'));
        if (nameIdx === -1) { toast.error('CSV缺少"指标名称"列，请检查表�?); return; }
        if (!activeKpiPlan) { toast.error('请先启用KPI方案，再导入实际�?); return; }
        // 匹配并更新实际�?
        let matched = 0;
        const updatedIndicators = activeKpiPlan.indicators.map(ind => {
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            const name = cols[nameIdx] || '';
            if (name === ind.name || name.includes(ind.name) || ind.name.includes(name)) {
              matched++;
              return {
                ...ind,
                ...(actualIdx !== -1 && cols[actualIdx] ? { actualValue: parseFloat(cols[actualIdx]) || 0 } : {}),
                ...(targetIdx !== -1 && cols[targetIdx] ? { target: cols[targetIdx] } : {}),
                ...(weightIdx !== -1 && cols[weightIdx] ? { weight: cols[weightIdx] } : {}),
              };
            }
          }
          return ind;
        });
        if (matched === 0) { toast.error('未匹配到任何指标，请检查指标名称是否一�?); return; }
        const updatedPlan = { ...activeKpiPlan, indicators: updatedIndicators };
        setActiveKpiPlan(updatedPlan);
        localStorage.setItem('active-kpi-plan', JSON.stringify(updatedPlan));
        toast.success(`成功导入 ${matched} 个指标的实际值`);
      } catch { toast.error('CSV解析失败，请检查文件格�?); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ─── 导出KPI绩效看板数据 ─── */
  const handleExportDashboard = useCallback(() => {
    if (!activeKpiPlan) return;
    const BOM = '\uFEFF';
    const header = '指标名称,分类,目标�?实际�?达标�?权重\n';
    const rows = activeKpiPlan.indicators.map(ind => {
      const actualVal = ind.actualValue !== undefined ? ind.actualValue : '';
      const targetNum = parseFloat(ind.target.replace(/[^\d.]/g, ''));
      let rateStr = '';
      if (ind.actualValue !== undefined && !isNaN(targetNum) && targetNum > 0) {
        rateStr = ((ind.actualValue / targetNum) * 100).toFixed(1) + '%';
      }
      return `${ind.name},${ind.category || ''},${ind.target},${actualVal},${rateStr},${ind.weight}`;
    }).join('\n');
    const csvContent = BOM + header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `KPI方案_${activeKpiPlan.name || '绩效看板'}_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  }, [activeKpiPlan]);

  /* ─── 导出KPI方案列表为CSV ─── */
  const handleExportPlansCsv = useCallback(() => {
    if (kpiPlans.length === 0) { toast.error('暂无方案可导�?); return; }
    const BOM = '\uFEFF';
    const header = '方案名称,团队人数,阶段,重点,状�?创建时间\n';
    const rows = kpiPlans.map(p =>
      `"${(p.name || '').replace(/"/g, '""')}",${p.team_size || ''},${p.team_stage || ''},"${(p.focus || '').replace(/"/g, '""')}",${p.is_active ? '启用�? : '未启�?},${new Date(p.created_at).toLocaleDateString('zh-CN')}`
    ).join('\n');
    const csvContent = BOM + header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `KPI方案列表_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  }, [kpiPlans]);

  /* ─── 删除方案 ─── */
  const handleDeletePlan = async (planId: string) => {
    try {
      const res = await authFetch(`/api/kpi-plans?id=${planId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('方案已删�?);
        fetchKpiPlans();
      } else {
        toast.error(json.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  /* ─── 质检记录加载 ─── */
  const fetchQualityRecords = useCallback(async (page = 0) => {
    setQualityLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        companyId: profile?.companyId || '',
        userId: profile?.id || '',
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      const res = await authFetch(`/api/quality-inspections?${params}`);
      const json = await res.json();
      if (json.data) {
        setQualityRecords(json.data);
        setQualityTotal(json.total || 0);
        setQualityPage(page);
      }
    } catch (err) {
      console.error('Fetch quality records error:', err);
    } finally {
      setQualityLoading(false);
    }
  }, [role, profile, authFetch]);

  useEffect(() => {
    if (activeTab === 'quality') {
      fetchQualityRecords(0);
    }
  }, [activeTab, fetchQualityRecords]);

  /* ─── 质检弹窗：加载员工和AI记录 ─── */
  const openInspectModal = async () => {
    setShowInspectModal(true);
    setSelectedStaffId('');
    setSelectedSolutionId('');
    setScores({ response_score: 10, script_score: 10, attitude_score: 10, process_score: 10, resolution_score: 10 });
    setInspectComment('');

    try {
      const res = await authFetch(`/api/agents?companyId=${profile?.companyId || ''}`);
      const json = await res.json();
      const list = (json.data || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
      setAgents(list.filter((a: AgentOption) => a.id !== profile?.id));
    } catch { /* ignore */ }

    try {
      const res = await authFetch(`/api/problem-solutions?companyId=${profile?.companyId || ''}&limit=30`);
      const json = await res.json();
      setSolutions((json.data || []).map((s: { id: string; query: string; created_at: string }) => ({
        id: s.id, query: s.query, created_at: s.created_at,
      })));
    } catch { /* ignore */ }
  };

  /* ─── 手动添加员工 ─── */
  const handleAddStaff = async () => {
    const name = newStaffName.trim();
    if (!name) { toast.error('请输入员工姓�?); return; }
    try {
      const res = await authFetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile?.companyId,
          name,
          position: '售中客服',
          training_stage: '基础',
          status: '在职',
        }),
      });
      const json = await res.json();
      if (json.data) {
        const newAgent: AgentOption = { id: json.data.id, name: json.data.name };
        setAgents(prev => [...prev, newAgent]);
        setSelectedStaffId(newAgent.id);
        setNewStaffName('');
        setShowAddStaff(false);
        toast.success(`已添加员工：${name}`);
      } else {
        toast.error(json.error || '添加失败');
      }
    } catch {
      toast.error('添加员工失败');
    }
  };

  const handleSubmitInspect = async (saveAndNext = false) => {
    if (!selectedStaffId) {
      toast.error('请选择被质检员工');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/quality-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile?.companyId,
          inspector_id: profile?.id,
          staff_id: selectedStaffId,
          problem_solution_id: selectedSolutionId || null,
          ...scores,
          comment: selectedTags.length > 0 ? selectedTags.join('�?) + (inspectComment ? '�? + inspectComment : '') : inspectComment,
        }),
      });
      const json = await res.json();
      if (json.data) {
        // Day6: 进行首次5维质检 �?完成
        markOnboardingDay(authFetch, 6);
        toast.success('质检记录已提�?);
        if (saveAndNext) {
          setScores({ response_score: 12, script_score: 12, attitude_score: 12, process_score: 12, resolution_score: 12 });
          setInspectComment('');
          setSelectedTags([]);
          setSelectedSolutionId('');
        } else {
          setShowInspectModal(false);
        }
        fetchQualityRecords(0);
      } else {
        toast.error(json.error || '提交失败');
      }
    } catch {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── 质检统计 ─── */
  const avgScore = qualityRecords.length > 0
    ? (qualityRecords.reduce((sum, r) => sum + r.total_score, 0) / qualityRecords.length).toFixed(1)
    : '--';
  const thisMonth = qualityRecords.filter(r => {
    const d = new Date(r.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalScores = Object.values(scores).reduce((s, v) => s + v, 0);

  /* ─── 绩效看板统计 ─── */
  const dashboardStats = useMemo(() => {
    if (qualityRecords.length === 0 && kpiMetricRecords.length === 0) {
      return { avgScore: '--', inspectCount: 0, kpiRate: '--', needImprove: 0 };
    }
    // 团队均分
    const teamAvg = qualityRecords.length > 0
      ? (qualityRecords.reduce((s, r) => s + r.total_score, 0) / qualityRecords.length).toFixed(1)
      : '--';
    // 本月质检次数
    const inspectCount = thisMonth;
    // KPI达标�?
    let kpiRate = '--';
    if (kpiMetricRecords.length > 0) {
      const latest = [...kpiMetricRecords].sort((a, b) =>
        new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
      )[0];
      if (latest?.metrics_data) {
        const totalMetrics = KPI_METRICS.length;
        const metCount = KPI_METRICS.filter(m => {
          const val = latest.metrics_data[m.key];
          if (val === undefined) return false;
          return m.key === 'responseTime' || m.key === 'returnHandling'
            ? val <= m.target
            : val >= m.target;
        }).length;
        kpiRate = `${Math.round((metCount / totalMetrics) * 100)}%`;
      }
    }
    // 待改进人�?
    const staffScores: Record<string, number[]> = {};
    qualityRecords.forEach(r => {
      if (!staffScores[r.staff_id]) staffScores[r.staff_id] = [];
      staffScores[r.staff_id].push(r.total_score);
    });
    const needImprove = Object.values(staffScores).filter(scores => {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      return avg < 70;
    }).length;

    return { avgScore: teamAvg, inspectCount, kpiRate, needImprove };
  }, [qualityRecords, kpiMetricRecords, thisMonth]);

  /* ─── 员工绩效排行 ─── */
  const staffRanking = useMemo(() => {
    const staffScores: Record<string, { name: string; scores: number[] }> = {};
    qualityRecords.forEach(r => {
      if (!staffScores[r.staff_id]) {
        staffScores[r.staff_id] = { name: r.staff_name || '未知', scores: [] };
      }
      staffScores[r.staff_id].scores.push(r.total_score);
    });
    return Object.entries(staffScores)
      .map(([id, data]) => ({
        id,
        name: data.name,
        avg: data.scores.length > 0 ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length) : 0,
        count: data.scores.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [qualityRecords]);

  /* ─── 月度KPI加权汇�?─── */
  const monthlyKpiSummary = useMemo(() => {
    if (!kpiMetricRecords.length) return null;
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthRecords = kpiMetricRecords.filter(r => (r.record_date || '').startsWith(thisMonth));
    if (!monthRecords.length) return null;
    // Parse indicators from activeKpiPlan or first plan
    const plan = activeKpiPlan || (() => {
      const p = kpiPlans.find(p => p.is_active) || kpiPlans[0];
      if (!p) return null;
      try {
        const parsed = typeof p.metrics === 'string' ? JSON.parse(p.metrics) : p.metrics;
        return { id: p.id, name: p.name, indicators: Array.isArray(parsed) ? parsed : [] };
      } catch { return null; }
    })();
    if (!plan) return null;
    const indicators = plan.indicators || [];
    if (!indicators.length) return null;
    const teamScores: { name: string; weightedSum: number; totalWeight: number } = { name: '团队', weightedSum: 0, totalWeight: 0 };
    indicators.forEach((m: Record<string, unknown>) => {
      const mName = (m.name as string) || '';
      const weight = Number(m.weight) || 10;
      const target = Number(m.target) || 100;
      monthRecords.forEach(r => {
        const val = r.metrics_data?.[mName];
        if (val != null && target > 0) {
          const rate = Math.min(val / target, 1.5);
          teamScores.weightedSum += rate * weight;
          teamScores.totalWeight += weight;
        }
      });
    });
    if (teamScores.totalWeight === 0) return null;
    return [{ name: teamScores.name, score: Math.round((teamScores.weightedSum / teamScores.totalWeight) * 100) }];
  }, [kpiPlans, kpiMetricRecords, activeKpiPlan]);

  /* ─── 渲染 ─── */
  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
      {/* ─── 🎯 目标板块：KPI目标�?权重 ─── */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-sky-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-1">🎯 本周目标</h3>
        <p className="text-base text-gray-500 mb-4">核心KPI指标目标值与权重</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_KPI_GOALS.map((g) => {
            const achieved = g.inverse ? g.actual <= g.target : g.actual >= g.target;
            const rate = g.inverse
              ? g.target > 0 ? Math.min(100, Math.round((g.target / Math.max(g.actual, 0.01)) * 100)) : 100
              : g.target > 0 ? Math.min(100, Math.round((g.actual / g.target) * 100)) : 0;
            const statusLight = achieved ? '🟢' : rate >= 70 ? '🟡' : '🔴';
            return (
              <div key={g.metric} className={`rounded-xl border p-4 ${achieved ? 'bg-white border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">{g.metric}</span>
                  <span className="text-2xl">{statusLight}</span>
                </div>
                <div className="text-3xl font-bold text-blue-700 mb-1">
                  {g.target}{g.unit}
                  <span className="text-sm font-normal text-gray-400 ml-2">权重 {g.weight}</span>
                </div>
                {!achieved && (
                  <button
                    onClick={() => setExpandedKpiReview(expandedKpiReview === g.metric ? null : g.metric)}
                    className="text-red-600 text-sm font-medium hover:underline mt-1"
                  >
                    ⚠️ 未达�?�?查看复盘 {expandedKpiReview === g.metric ? '�? : '�?}
                  </button>
                )}
                {expandedKpiReview === g.metric && (
                  <div className="mt-3 bg-white rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-bold text-gray-800">8问复�?/p>
                    {KPI_REVIEW_QUESTIONS.map((q, i) => (
                      <div key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-blue-600 font-medium shrink-0">{i + 1}.</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-gray-400 mt-3">💡 目标值可在KPI设定Tab中设置和调整</p>
      </div>

      <hr className="border-gray-200" />

      {/* ─── 🛤�?路径板块：达成动�?调整记录 ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-1">🛤�?本周路径</h3>
        <p className="text-base text-gray-500 mb-4">管理动作与调整记�?/p>
        <div className="space-y-3">
          {MOCK_KPI_PATHS.map((p, i) => {
            const colors = KPI_PATH_TYPE_COLORS[p.type] || KPI_PATH_TYPE_COLORS['其他'];
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="shrink-0 w-16 text-sm text-gray-400 pt-1">{p.date}</div>
                <div className="w-3 h-3 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.bg} ${colors.text}`}>{p.type}</span>
                    <span className="text-base text-gray-800">{p.description}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {p.relatedMetrics.map(m => (
                      <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ─── 📊 结果板块：实际达�?偏差 ─── */}
      <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl border border-green-200 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-1">📊 本周结果</h3>
        <p className="text-base text-gray-500 mb-4">实际达成值与偏差分析</p>
        {(() => {
          const achieved = MOCK_KPI_GOALS.filter(g => g.inverse ? g.actual <= g.target : g.actual >= g.target);
          const rate = Math.round((achieved.length / MOCK_KPI_GOALS.length) * 100);
          return (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">综合达标�?/span>
                  <span className="text-2xl font-bold text-blue-700">{rate}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>已达�?{achieved.length} �?/span>
                  <span>未达�?{MOCK_KPI_GOALS.length - achieved.length} �?/span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_KPI_GOALS.map((g) => {
                  const isAchieved = g.inverse ? g.actual <= g.target : g.actual >= g.target;
                  const deviation = g.inverse
                    ? Math.round(((g.actual - g.target) / Math.max(g.target, 0.01)) * 100)
                    : Math.round(((g.actual - g.target) / Math.max(g.target, 0.01)) * 100);
                  const pct = g.target > 0
                    ? (g.inverse ? Math.min(100, Math.round((g.target / Math.max(g.actual, 0.01)) * 100)) : Math.min(100, Math.round((g.actual / g.target) * 100)))
                    : 0;
                  return (
                    <div key={g.metric} className={`rounded-xl border p-4 ${isAchieved ? 'bg-white border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-lg font-bold text-gray-900 mb-2">{g.metric}</div>
                      <div className="flex items-center justify-between text-base mb-2">
                        <span className="text-gray-500">目标 {g.target}{g.unit}</span>
                        <span className={`font-bold ${isAchieved ? 'text-green-700' : 'text-red-700'}`}>实际 {g.actual}{g.unit}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${isAchieved ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={`text-sm font-medium ${isAchieved ? 'text-green-600' : 'text-red-600'}`}>
                        {isAchieved ? '�?已达�? : `⚠️ 偏差 ${deviation > 0 ? '+' : ''}${deviation}%`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      <hr className="border-gray-200" />

      {/* ─── 原有功能区域 ─── */}
      <OnboardingGuide
        guideKey="kpi-guide"
        steps={[
          { title: '设置4个核心指�?, description: '添加响应时长、满意度、转化率、赔付率�?个核心KPI指标' },
          { title: '填入目标�?, description: '为每个指标填入目标值（参考行业参考�?💡�? },
          { title: '保存并通知团队', description: '保存设置后，团队成员即可查看自己的KPI达标情况' },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">绩效管理</h2>
          <p className="text-muted-foreground">KPI设定 · 质检打分 · 绩效看板</p>
          <div className="mt-2"><PageHint>制定团队考核标准——设指标、定目标、看达标，让客服知道怎么干才算好�?/PageHint></div>
          <DataSecurityBadge />
        </div>
        {/* 顶部工具栏：导入导出 */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => csvImportRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1" />导入数据
          </Button>
          {activeKpiPlan && (
            <Button variant="outline" size="sm" onClick={handleExportDashboard}>
              <Download className="w-3.5 h-3.5 mr-1" />导出数据
            </Button>
          )}
          {kpiPlans.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportPlansCsv}>
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />导出方案
            </Button>
          )}
          <input ref={csvImportRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('setting')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'setting' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Target className="w-4 h-4" />
          KPI设定
        </button>
        {canInspect && (
          <button
            onClick={() => setActiveTab('quality')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'quality' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            质检打分
          </button>
        )}
        {canInspect && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'dashboard' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            绩效看板
          </button>
        )}
      </div>

      {/* ════════ KPI设定 Tab ════════ */}
      {activeTab === 'setting' && (
        <div className="space-y-6">
          {/* AI生成区域 */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <h3 className="font-semibold">AI生成KPI方案</h3>
                  <p className="text-xs text-muted-foreground">根据团队情况智能生成</p>
                </div>
              </div>
              {step === 3 && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <Plus className="w-3 h-3 mr-1" />重新生成
                </Button>
              )}
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {['选择类型', '填写参数', '生成结果'].map((label, i) => (
                <React.Fragment key={label}>
                  <div className={`flex items-center gap-1.5 ${step >= i + 1 ? 'text-blue-900' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step > i + 1 ? 'bg-blue-900 text-white' : step === i + 1 ? 'border-2 border-sky-400 text-blue-900' : 'border border-gray-300 text-gray-400'
                    }`}>
                      {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className="text-xs font-medium hidden sm:inline">{label}</span>
                  </div>
                  {i < 2 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {KPI_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setKpiType(t.id)}
                    className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm text-sm ${
                      kpiType === t.id ? 'border-blue-900 bg-sky-50 ring-2 ring-sky-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span>{t.icon}</span>
                      <span className="font-semibold">{t.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
                <Button
                  onClick={() => setStep(2)}
                  disabled={!kpiType}
                  className="sm:col-span-2 bg-blue-900 hover:bg-blue-950 text-white"
                >
                  下一�?<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">团队人数</label>
                  <Input placeholder="例如�?�? value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">当前痛点</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PAIN_POINTS.map(p => (
                      <Button key={p} variant={painPoints.includes(p) ? 'default' : 'outline'} size="sm"
                        className={painPoints.includes(p) ? 'bg-blue-900' : ''}
                        onClick={() => toggleItem(painPoints, setPainPoints, p)}>
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">目标</label>
                  <div className="flex flex-wrap gap-1.5">
                    {GOALS.map(g => (
                      <Button key={g} variant={goals.includes(g) ? 'default' : 'outline'} size="sm"
                        className={goals.includes(g) ? 'bg-green-500' : ''}
                        onClick={() => toggleItem(goals, setGoals, g)}>
                        {g}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">其他说明</label>
                  <textarea className="w-full border rounded-lg p-3 text-sm h-16 resize-none focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                    placeholder="补充说明" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" />上一�?/Button>
                  <Button onClick={handleGenerate} disabled={generating} className="flex-1 bg-blue-900 hover:bg-blue-950 text-white">
                    {generating ? <><span className="animate-spin mr-2">�?/span>AI生成�?..</> : <><Wand2 className="w-4 h-4 mr-2" />生成方案</>}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 border-l-4 border-l-sky-400">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <h4 className="font-semibold">{kpiType}KPI方案</h4>
                    <Badge className="bg-blue-900 text-xs">AI生成</Badge>
                  </div>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                    {result}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="w-3 h-3 mr-1" />导出Excel</Button>
                  <Button variant="outline" size="sm" onClick={handleExport}><FileText className="w-3 h-3 mr-1" />导出文本</Button>
                  <Button size="sm" className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white"
                    onClick={() => {
                      if (confirm('确定应用此KPI方案？应用后绩效看板将按此方案的指标展示')) {
                        handleApplyCurrentPlan();
                      }
                    }}>
                    <CheckCircle className="w-3 h-3 mr-1" />应用此方�?
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 历史方案列表 */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-blue-900" />
              <h3 className="font-semibold">历史方案</h3>
              {kpiPlans.length > 0 && <Badge variant="outline" className="text-xs">{kpiPlans.length}</Badge>}
              {kpiPlans.length > 0 && (
                <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={handleExportPlansCsv}>
                  <FileSpreadsheet className="w-3 h-3 mr-1" />导出方案列表
                </Button>
              )}
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : kpiPlans.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无KPI方案</p>
                <p className="text-xs mt-1">使用AI生成后，方案会自动保存在这里</p>
              </div>
            ) : (
              <div className="space-y-2">
                {kpiPlans.map(plan => (
                  <div key={plan.id} className="rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${plan.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-medium text-sm truncate">{plan.name}</span>
                        {plan.is_active && <Badge className="bg-green-100 text-green-700 text-xs border-0">启用�?/Badge>}
                        {plan.is_active && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => handleOpenAgentDialog()}>
                            <Users className="w-3 h-3 mr-1" />关联客服
                          </Button>
                        )}
                        {plan.team_stage && <Badge variant="outline" className="text-xs">{plan.team_stage}</Badge>}
                        {plan.team_size && <span className="text-xs text-muted-foreground">{plan.team_size}�?/span>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => setViewingPlan(plan)}>
                          <Eye className="w-3 h-3 mr-1" />查看
                        </Button>
                        {!plan.is_active && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                            onClick={() => handleActivatePlan(plan.id)}>
                            <Play className="w-3 h-3 mr-1" />启用
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                          onClick={() => handleDeletePlan(plan.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 ml-4">
                      创建�?{new Date(plan.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generating overlay */}
          {generating && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky-100 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
                <h3 className="font-bold text-lg mb-2">AI正在生成KPI方案</h3>
                <p className="text-sm text-muted-foreground">正在分析您的需求，请稍�?..</p>
              </div>
            </div>
          )}

          {/* Credits dialog */}
          {creditsDialog && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
                <Sparkles className="w-12 h-12 mx-auto text-sky-400 mb-3" />
                <h3 className="font-bold text-lg mb-2">当日免费次数已用�?/h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {profile?.role === 'staff' || profile?.role === 'personal_user' || profile?.role === 'enterprise_manager'
                    ? '今日AI体验次数已用完，明日可继续使用，或联系企业管理员解锁更多服务'
                    : '今日AI体验次数已用完，明日再来，或解锁更多服务继续使用'}
                </p>
                <Button onClick={() => setCreditsDialog(false)} className="w-full">我知道了</Button>
              </div>
            </div>
          )}

          {/* 方案查看弹窗 */}
          <Dialog open={!!viewingPlan} onOpenChange={() => setViewingPlan(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-sky-400" />
                  {viewingPlan?.name || 'KPI方案'}
                  {viewingPlan?.is_active && <Badge className="bg-green-100 text-green-700 text-xs border-0">启用�?/Badge>}
                </DialogTitle>
              </DialogHeader>
              <DialogBody>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed mt-2">
                  {viewingPlan?.metrics || '（无内容�?}
                </div>
              </DialogBody>
              <DialogFooter>
                {!viewingPlan?.is_active && (
                  <Button onClick={() => { if (viewingPlan) handleActivatePlan(viewingPlan.id); setViewingPlan(null); }}
                    className="bg-blue-900 hover:bg-blue-950 text-white">
                    <Play className="w-4 h-4 mr-1" />启用此方�?
                  </Button>
                )}
                <Button variant="outline" onClick={() => setViewingPlan(null)}>关闭</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ════════ 质检打分 Tab ════════ */}
      {activeTab === 'quality' && (
        <div className="space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{avgScore}</div>
              <div className="text-xs text-muted-foreground mt-1">团队质检均分</div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-4 text-center">
              <div className="text-2xl font-bold text-blue-950">{qualityTotal}</div>
              <div className="text-xs text-muted-foreground mt-1">质检次数</div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-green-50 to-white p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{thisMonth}</div>
              <div className="text-xs text-muted-foreground mt-1">本月质检</div>
            </div>
          </div>

          {/* 质检子视图切�?+ 操作按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setQualityView('records')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${qualityView === 'records' ? 'bg-white shadow-sm font-medium text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                质检记录
              </button>
              <button
                onClick={() => setQualityView('report')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${qualityView === 'report' ? 'bg-white shadow-sm font-medium text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                质检报告
              </button>
            </div>
            <Button onClick={openInspectModal} className="bg-blue-900 hover:bg-blue-950 active:scale-95 text-white transition-all duration-200">
              <Plus className="w-4 h-4 mr-1" />新增质检
            </Button>
          </div>

          {/* 质检记录列表 */}
          {qualityView === 'records' && (
            <>
              {qualityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : qualityRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无质检记录</p>
                  <p className="text-sm mt-1">点击"新增质检"开始打�?/p>
                </div>
              ) : (
            <div className="space-y-3">
              {qualityRecords.map(record => {
                const isExpanded = expandedId === record.id;
                const staffName = record.staff_name || '未知员工';
                const inspectorName = record.inspector_name || '未知';

                return (
                  <div key={record.id} className="rounded-xl border bg-white overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg ${getTotalRing(record.total_score)}`}>
                        <span className={getTotalColor(record.total_score)}>{record.total_score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{staffName}</span>
                          <Badge variant="outline" className="text-xs">{inspectorName} 打分</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="hidden sm:block w-32">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${getBarColor(record.total_score)}`} style={{ width: `${record.total_score}%` }} />
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-gray-50/50">
                        <div className="grid grid-cols-5 gap-2 mt-3">
                          {SCORE_DIMENSIONS.map(dim => (
                            <div key={dim.key} className="text-center">
                              <div className="text-lg font-bold text-gray-800">{record[dim.key]}</div>
                              <div className="text-xs text-muted-foreground">{dim.label}</div>
                              <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full rounded-full ${getBarColor(record[dim.key] * 5)}`}
                                  style={{ width: `${(record[dim.key] / dim.max) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {record.comment && (
                          <div className="mt-3 p-3 bg-white rounded-lg border">
                            <div className="text-xs text-muted-foreground mb-1">评语</div>
                            <div className="text-sm text-gray-700">{record.comment}</div>
                          </div>
                        )}
                        {/* 改进建议 - 低分维度自动关联 */}
                        {(role === 'admin' || role === 'enterprise_admin' || role === 'enterprise_manager') && SCORE_DIMENSIONS.some(dim => record[dim.key] < 12) && (
                          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Lightbulb className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-semibold text-amber-700">改进建议</span>
                            </div>
                            <div className="space-y-2">
                              {SCORE_DIMENSIONS.filter(dim => record[dim.key] < 12).map(dim => {
                                const suggestion = IMPROVEMENT_SUGGESTIONS[dim.key];
                                if (!suggestion) return null;
                                return (
                                  <div key={dim.key} className="flex items-start gap-2">
                                    <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                      <span className="text-xs font-bold text-red-500">!</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-red-700">{dim.label}：{record[dim.key]}/{dim.max}�?/div>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {suggestion.links.map((link, li) => (
                                          <a key={li} href={link.href} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                                            <link.icon className="w-3 h-3" />
                                            {link.label}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {qualityTotal > PAGE_SIZE && (
                <div className="flex justify-center gap-2 pt-2">
                  <Button variant="outline" size="sm" disabled={qualityPage === 0}
                    onClick={() => fetchQualityRecords(qualityPage - 1)}>上一�?/Button>
                  <span className="flex items-center text-sm text-muted-foreground">
                    {qualityPage + 1} / {Math.ceil(qualityTotal / PAGE_SIZE)}
                  </span>
                  <Button variant="outline" size="sm" disabled={(qualityPage + 1) * PAGE_SIZE >= qualityTotal}
                    onClick={() => fetchQualityRecords(qualityPage + 1)}>下一�?/Button>
                </div>
              )}
            </div>
          )}
            </>
          )}

          {/* 质检报告视图 */}
          {qualityView === 'report' && (
            <div className="space-y-4">
              {qualityRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无质检数据</p>
                  <p className="text-sm mt-1">新增质检记录后可查看报告</p>
                </div>
              ) : (
                <>
                  {/* 按成员汇�?*/}
                  <div className="rounded-xl border bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" />成员质检汇�?
                      </h3>
                    </div>
                    <div className="divide-y">
                      {(() => {
                        const memberMap = new Map<string, { name: string; scores: number[]; dims: Record<string, number[]> }>();
                        qualityRecords.forEach(r => {
                          const name = r.staff_name || '未知';
                          if (!memberMap.has(name)) {
                            memberMap.set(name, { name, scores: [], dims: { response: [], script: [], attitude: [], process: [], resolution: [] } });
                          }
                          const m = memberMap.get(name)!;
                          m.scores.push(r.total_score);
                          if (r.response_score != null) m.dims.response.push(r.response_score);
                          if (r.script_score != null) m.dims.script.push(r.script_score);
                          if (r.attitude_score != null) m.dims.attitude.push(r.attitude_score);
                          if (r.process_score != null) m.dims.process.push(r.process_score);
                          if (r.resolution_score != null) m.dims.resolution.push(r.resolution_score);
                        });
                        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                        return Array.from(memberMap.values())
                          .sort((a, b) => avg(b.scores) - avg(a.scores))
                          .map((m, i) => {
                            const avgScore = avg(m.scores);
                            const lowDims = SCORE_DIMENSIONS.filter(dim => avg(m.dims[dim.key]) < 12);
                            return (
                              <div key={m.name} className="px-4 py-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-gray-300">{i + 1}</span>
                                    <div>
                                      <span className="font-medium">{m.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">{m.scores.length}次质检</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold ${avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                      {avgScore.toFixed(1)}
                                    </span>
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${avgScore >= 80 ? 'bg-green-500' : avgScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${avgScore}%` }} />
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-5 gap-2 mt-2">
                                  {SCORE_DIMENSIONS.map(dim => {
                                    const dimAvg = avg(m.dims[dim.key]);
                                    return (
                                      <div key={dim.key} className="text-center">
                                        <div className={`text-sm font-medium ${dimAvg < 12 ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{dimAvg > 0 ? dimAvg.toFixed(1) : '-'}</div>
                                        <div className="text-xs text-muted-foreground">{dim.label}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {lowDims.length > 0 && (
                                  <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="flex items-center gap-1 mb-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-xs font-semibold text-amber-700">低分维度</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {lowDims.map(dim => (
                                        <span key={dim.key} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{dim.label}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>

                  {/* 维度均分总览 */}
                  <div className="rounded-xl border bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-sky-700 to-sky-600 text-white">
                      <h3 className="font-semibold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />维度均分总览
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {(() => {
                          const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                          return SCORE_DIMENSIONS.map(dim => {
                            const allScores = qualityRecords.map(r => r[dim.key] as number).filter(v => v != null);
                            const dimAvg = avg(allScores);
                            const maxPossible = dim.max * 5;
                            return (
                              <div key={dim.key}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">{dim.label}</span>
                                  <span className={`text-sm font-bold ${dimAvg < 12 ? 'text-red-600' : dimAvg >= 16 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {dimAvg > 0 ? `${dimAvg.toFixed(1)} / ${maxPossible}` : '-'}
                                  </span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${dimAvg < 12 ? 'bg-red-400' : dimAvg >= 16 ? 'bg-green-400' : 'bg-amber-400'}`}
                                    style={{ width: `${dimAvg > 0 ? (dimAvg / maxPossible) * 100 : 0}%` }} />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════ 绩效看板 Tab ════════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 录入/导入按钮 */}
          {canInspect && (
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleOpenEntryModal}
                className="bg-blue-900 hover:bg-blue-950 text-white text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                录入绩效数据
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenBatchModal}
                className="text-sm"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                批量导入
              </Button>
              {activeKpiPlan && (
                <span className="text-xs text-muted-foreground">
                  当前方案：{activeKpiPlan.name}（{activeKpiPlan.indicators.length}个指标）
                </span>
              )}
            </div>
          )}
          {/* 售前/售后 子Tab */}
          {activeKpiPlan && (() => {
            const presaleIndicators = activeKpiPlan.indicators.filter(ind => (ind as Record<string, unknown>).type !== 'aftersale');
            const aftersaleIndicators = activeKpiPlan.indicators.filter(ind => (ind as Record<string, unknown>).type === 'aftersale');
            const hasPresale = presaleIndicators.length > 0;
            const hasAftersale = aftersaleIndicators.length > 0;
            if (!hasPresale && !hasAftersale) return null;
            return (
              <div className="flex gap-2">
                <button
                  onClick={() => setDashSubTab('presale')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dashSubTab === 'presale'
                      ? 'bg-[#0F2B46] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${!hasPresale ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={!hasPresale}
                >
                  售前指标{hasPresale ? `(${presaleIndicators.length})` : ''}
                </button>
                <button
                  onClick={() => setDashSubTab('aftersale')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dashSubTab === 'aftersale'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${!hasAftersale ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={!hasAftersale}
                >
                  售后指标{hasAftersale ? `(${aftersaleIndicators.length})` : ''}
                </button>
              </div>
            );
          })()}
          {/* 4个统计卡�?*/}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Award className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-muted-foreground">团队均分</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{dashboardStats.avgScore}</div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 text-sky-600" />
                </div>
                <span className="text-xs text-muted-foreground">本月质检</span>
              </div>
              <div className="text-2xl font-bold text-sky-700">{dashboardStats.inspectCount}</div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-green-50 to-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs text-muted-foreground">KPI达标�?/span>
              </div>
              <div className="text-2xl font-bold text-green-700">{dashboardStats.kpiRate}</div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-red-50 to-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-xs text-muted-foreground">待改�?/span>
              </div>
              <div className="text-2xl font-bold text-red-700">{dashboardStats.needImprove}</div>
            </div>
          </div>

          {/* 绩效看板双视�?*/}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-900" />
                <h3 className="font-semibold">绩效看板</h3>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setDashboardViewMode('byMember')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${dashboardViewMode === 'byMember' ? 'bg-white shadow-sm font-medium text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                >按成�?/button>
                <button
                  onClick={() => setDashboardViewMode('byIndicator')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${dashboardViewMode === 'byIndicator' ? 'bg-white shadow-sm font-medium text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                >按指�?/button>
              </div>
            </div>

            {dashboardViewMode === 'byMember' ? (
              /* ── 按成员视�?── */
              qualityRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无质检数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {staffRanking.map((staff, idx) => (
                    <div key={staff.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-600' :
                        idx === 2 ? 'bg-orange-50 text-orange-600' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{staff.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{staff.count}次质检</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getBarColor(staff.avg)}`}
                            style={{ width: `${staff.avg}%` }} />
                        </div>
                        <span className={`text-sm font-bold w-10 text-right ${getTotalColor(staff.avg)}`}>{staff.avg}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── 按指标视�?── */
              !activeKpiPlan ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">请先设定KPI方案</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeKpiPlan.indicators.map((ind: Record<string, unknown>, idx: number) => {
                    const indName = (ind.name as string) || `指标${idx + 1}`;
                    const target = Number(ind.target) || 100;
                    const values = kpiMetricRecords
                      .filter(r => r.metrics_data?.[indName] != null)
                      .map(r => r.metrics_data[indName]);
                    const avg = values.length ? values.reduce((s: number, v: number) => s + v, 0) / values.length : 0;
                    const rate = Math.min(avg / target, 1.5);
                    return (
                      <div key={idx} className="p-3 rounded-lg border bg-gray-50/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{indName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">目标 {target}</span>
                            <span className={`text-sm font-bold ${rate >= 1 ? 'text-green-600' : rate >= 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                              {avg > 0 ? avg.toFixed(1) : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${rate >= 1 ? 'bg-green-400' : rate >= 0.7 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${rate * 100 / 1.5}%` }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-muted-foreground">达成�?{rate > 0 ? `${(rate * 100).toFixed(0)}%` : '-'}</span>
                          <span className="text-xs text-muted-foreground">{values.length}条数�?/span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* 月度KPI加权汇�?*/}
          {monthlyKpiSummary && monthlyKpiSummary.length > 0 && (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">月度KPI加权汇�?/h3>
                <span className="text-xs text-muted-foreground">（本月加权得分排名）</span>
              </div>
              <div className="space-y-2">
                {monthlyKpiSummary.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="font-medium text-sm flex-1">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.score >= 100 ? 'bg-green-500' : item.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(item.score, 150) / 1.5}%` }} />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${item.score >= 100 ? 'text-green-600' : item.score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {item.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPI指标趋势 */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-900" />
                <h3 className="font-semibold">KPI指标趋势</h3>
                {activeKpiPlan ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded">当前方案：{activeKpiPlan.name}</span>
                    {linkedAgentNames.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                        考核：{linkedAgentNames.join('�?)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">（来自首页录入的KPI数据�?/span>
                )}
              </div>
              {activeKpiPlan && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => csvImportRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    导入数据
                  </button>
                  <button
                    onClick={handleExportDashboard}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    导出数据
                  </button>
                </div>
              )}
            </div>

            {/* 达标率汇�?*/}
            {activeKpiPlan && activeKpiPlan.indicators.some(ind => ind.actualValue !== undefined) && (() => {
              const indicatorsWithActual = activeKpiPlan.indicators.filter(ind => ind.actualValue !== undefined);
              const totalIndicators = indicatorsWithActual.length;
              const reachedCount = indicatorsWithActual.filter(ind => {
                const target = parseFloat(ind.target) || 0;
                if (target === 0) return false;
                const rate = (ind.actualValue! / target) * 100;
                return rate >= 100;
              }).length;
              const nearCount = indicatorsWithActual.filter(ind => {
                const target = parseFloat(ind.target) || 0;
                if (target === 0) return false;
                const rate = (ind.actualValue! / target) * 100;
                return rate >= 80 && rate < 100;
              }).length;
              const belowCount = totalIndicators - reachedCount - nearCount;
              return (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{reachedCount}</div>
                    <div className="text-xs text-green-600 mt-0.5">达标</div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{nearCount}</div>
                    <div className="text-xs text-yellow-600 mt-0.5">接近达标</div>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">{belowCount}</div>
                    <div className="text-xs text-red-600 mt-0.5">未达�?/div>
                  </div>
                </div>
              );
            })()}

            {!activeKpiPlan && !dashboardLoading && kpiMetricRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileBarChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无KPI指标数据</p>
                <p className="text-xs mt-1">请先在「KPI设定」中生成并应用一个方案，或在首页仪表盘录入KPI指标</p>
              </div>
            ) : dashboardLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : (
              <div className="space-y-4">
                {/* 最新指标�?*/}
                {(() => {
                  const sorted = [...kpiMetricRecords].sort((a, b) =>
                    new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
                  );
                  const latest = sorted[0];
                  const prev = sorted[1];

                  // 如果有生效方案，用方案指标；否则用默认KPI_METRICS
                  const allMetrics = activeKpiPlan
                    ? activeKpiPlan.indicators.map((ind, i) => ({
                        key: `ind_${i}`,
                        label: ind.name,
                        target: ind.target,
                        unit: '',
                        weight: ind.weight,
                        category: ind.category,
                        type: (ind as { type?: string }).type || '通用',
                      }))
                    : KPI_METRICS.map(m => ({ ...m, type: '通用' }));

                  const presaleMetrics = allMetrics.filter(m => m.type === '售前');
                  const aftersaleMetrics = allMetrics.filter(m => m.type === '售后');
                  const hasPresale = presaleMetrics.length > 0;
                  const hasAftersale = aftersaleMetrics.length > 0;
                  const effectiveDashTab = dashSubTab === 'presale' && hasPresale ? 'presale'
                    : dashSubTab === 'aftersale' && hasAftersale ? 'aftersale'
                    : hasPresale ? 'presale' : hasAftersale ? 'aftersale' : 'presale';
                  const displayMetrics = effectiveDashTab === 'presale' ? presaleMetrics : aftersaleMetrics;

                  return (
                    <>
                      <div className="text-xs text-muted-foreground mb-2">
                        最新录入：{latest?.record_date ?? '--'}（共{sorted.length}条记录）
                      </div>
                      {activeKpiPlan && (hasPresale || hasAftersale) && (
                        <div className="flex gap-1 mb-3">
                          <button
                            onClick={() => setDashSubTab('presale')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              effectiveDashTab === 'presale'
                                ? 'bg-sky-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${!hasPresale ? 'opacity-40 cursor-not-allowed' : ''}`}
                            disabled={!hasPresale}
                          >
                            售前指标 ({presaleMetrics.length})
                          </button>
                          <button
                            onClick={() => setDashSubTab('aftersale')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              effectiveDashTab === 'aftersale'
                                ? 'bg-sky-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${!hasAftersale ? 'opacity-40 cursor-not-allowed' : ''}`}
                            disabled={!hasAftersale}
                          >
                            售后指标 ({aftersaleMetrics.length})
                          </button>
                        </div>
                      )}
                      {/* 未达标汇总栏 */}
                      {displayMetrics.length > 0 && (() => {
                        const notMet = displayMetrics.filter(m => {
                          const ind = activeKpiPlan?.indicators.find(i => i.name === m.label);
                          if (!ind?.actualValue) return false;
                          const target = parseFloat(String(m.target)) || 0;
                          const isLB = m.key === 'responseTime' || m.key === 'returnHandling';
                          return isLB ? ind.actualValue > target : ind.actualValue < target;
                        });
                        if (notMet.length === 0) return null;
                        const priorityItem = notMet[0];
                        const prioritySuggestion = KPI_IMPROVEMENT[priorityItem.label];
                        return (
                          <div className="mb-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                              <AlertTriangle className="w-4 h-4" />
                              本月 {notMet.length} 项未达标
                              {prioritySuggestion && (
                                <span className="font-normal text-amber-700">
                                  ，建议优先改进：{prioritySuggestion.summary}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {displayMetrics.length > 0 ? displayMetrics.map((m, idx) => {
                          const val = latest?.metrics_data?.[m.key];
                          const prevVal = prev?.metrics_data?.[m.key];
                          const trend = val !== undefined && prevVal !== undefined ? Number(val) - Number(prevVal) : null;
                          const isLowerBetter = m.key === 'responseTime' || m.key === 'returnHandling';
                          const isGood = trend !== null ? (isLowerBetter ? trend < 0 : trend > 0) : null;
                          // 实际�?& 达标�?
                          const actualVal = activeKpiPlan?.indicators.find(ind => ind.name === m.label)?.actualValue;
                          const targetNum = parseFloat(String(m.target)) || 0;
                          const achievementRate = actualVal !== undefined && targetNum > 0 ? (actualVal / targetNum) * 100 : null;
                          const rateColor = achievementRate !== null
                            ? achievementRate >= 100 ? 'text-green-700'
                              : achievementRate >= 80 ? 'text-yellow-700'
                              : 'text-red-700'
                            : '';
                          const rateBg = achievementRate !== null
                            ? achievementRate >= 100 ? 'bg-green-50 border-green-200'
                              : achievementRate >= 80 ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-red-50 border-red-200'
                            : '';

                          return (
                            <div key={m.key} className={`rounded-lg border p-3 ${rateBg || ''}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{m.label}</span>
                                {'category' in m && m.category && (
                                  <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">{m.category}</span>
                                )}
                              </div>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-lg font-bold">{val ?? '--'}</span>
                                {'unit' in m && m.unit && <span className="text-xs text-muted-foreground">{m.unit}</span>}
                                {trend !== null && trend !== 0 && (
                                  <span className={`text-xs font-medium flex items-center ${isGood ? 'text-green-600' : 'text-red-500'}`}>
                                    {trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(trend).toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">目标：{m.target}{'unit' in m && m.unit ? m.unit : ''}</div>
                              {'ref' in m && m.ref && <div className="text-xs text-gray-400 mt-0.5">{m.ref}</div>}
                              {'weight' in m && m.weight && (
                                <div className="text-xs text-muted-foreground">权重：{m.weight}</div>
                              )}
                              {/* 实际�?+ 达标�?*/}
                              {activeKpiPlan && (() => {
                                const indIdx = activeKpiPlan.indicators.findIndex(ind => ind.name === m.label);
                                if (indIdx < 0) return null;
                                return (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    {actualVal !== undefined ? (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-xs text-muted-foreground">实际值：<span className="font-semibold text-gray-900">{actualVal}</span></div>
                                          <div className="text-xs text-muted-foreground">
                                            达标率：<span className={`font-bold ${rateColor}`}>{achievementRate?.toFixed(1)}%</span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleOpenActualDialog(indIdx)}
                                          className="text-xs text-sky-500 hover:text-sky-700 px-2 py-1 rounded hover:bg-sky-50 transition-colors"
                                        >
                                          修改
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenActualDialog(indIdx)}
                                        className="w-full text-xs text-sky-600 hover:text-sky-800 border border-dashed border-sky-300 rounded-md py-1.5 hover:bg-sky-50 transition-colors"
                                      >
                                        + 录入实际�?
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                              {/* 未达标改进建�?*/}
                              {actualVal !== undefined && achievementRate !== null && achievementRate < 100 && KPI_IMPROVEMENT[m.label] && role !== 'staff' && (
                                <div className="mt-2 pt-2 border-t border-orange-100">
                                  <button
                                    onClick={() => setExpandedKpiImprovement(prev => prev === m.key ? null : m.key)}
                                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    改进建议
                                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedKpiImprovement === m.key ? 'rotate-180' : ''}`} />
                                  </button>
                                  {expandedKpiImprovement === m.key && (
                                    <div className="mt-1.5 space-y-1">
                                      {KPI_IMPROVEMENT[m.label].links.map((s, si) => (
                                        <div key={si} className="flex items-center gap-1.5">
                                          <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                          <span className="text-xs text-gray-700">{s.text}</span>
                                          <a href={s.href} className="text-xs text-sky-600 hover:text-sky-800 underline flex-shrink-0">去查�?/a>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }) : (
                          <div className="col-span-full text-center py-8 text-gray-500">
                            当前{effectiveDashTab === 'presale' ? '售前' : '售后'}暂无指标数据，请先在KPI设定中生成并应用对应的KPI方案
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* 历史趋势�?*/}
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">历史记录</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 text-muted-foreground font-medium">日期</th>
                          {KPI_METRICS.slice(0, 4).map(m => (
                            <th key={m.key} className="text-right py-2 px-2 text-muted-foreground font-medium">{m.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...kpiMetricRecords]
                          .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
                          .slice(0, 10)
                          .map(r => (
                            <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 px-2">{r.record_date}</td>
                              {KPI_METRICS.slice(0, 4).map(m => (
                                <td key={m.key} className="text-right py-2 px-2">
                                  {r.metrics_data?.[m.key] ?? '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ 质检打分 Modal ════════ */}
      <Dialog open={showInspectModal} onOpenChange={setShowInspectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-sky-400" />
              新增质检打分
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">被质检员工 <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => setShowAddStaff(!showAddStaff)}
                  className="text-xs text-sky-400 hover:text-blue-900 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" />{showAddStaff ? '收起' : '添加员工'}
                </button>
              </div>
              {showAddStaff && (
                <div className="flex gap-2 mb-2">
                  <Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="输入员工姓名" className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()} />
                  <Button size="sm" onClick={handleAddStaff} className="h-8 bg-blue-900 hover:bg-blue-950 text-white text-xs px-3">添加</Button>
                </div>
              )}
              <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30">
                <option value="">请选择员工</option>
                {agents.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">关联AI记录（选填�?/label>
              <select value={selectedSolutionId} onChange={(e) => setSelectedSolutionId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30">
                <option value="">不关�?/option>
                {solutions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.query.slice(0, 30)}{s.query.length > 30 ? '...' : ''} - {new Date(s.created_at).toLocaleDateString('zh-CN')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">快速打分（1-5分制，自动换算百分制�?/div>
              {SCORE_DIMENSIONS.map(dim => {
                const starVal = Math.round(scores[dim.key] / 4);
                const clampedVal = Math.max(1, Math.min(5, starVal));
                const scoreLabel = ['�?, '一�?, '合格', '良好', '优秀'][clampedVal - 1];
                const scoreColor = clampedVal <= 2 ? 'text-red-500' : clampedVal === 3 ? 'text-yellow-600' : 'text-green-600';
                return (
                  <div key={dim.key} className="space-y-1.5 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{dim.label}</span>
                        <span className="text-xs text-muted-foreground ml-1">{dim.desc}</span>
                        {'ref' in dim && dim.ref && <span className="text-xs text-gray-400 ml-2">{dim.ref}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-lg font-bold ${scoreColor}`}>{clampedVal}</span>
                        <span className={`text-xs font-medium ${scoreColor}`}>{scoreLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} type="button"
                          onClick={() => setScores(prev => ({ ...prev, [dim.key]: v * 4 }))}
                          className={`flex-1 h-8 rounded-md text-xs font-medium transition-all ${
                            v <= clampedVal
                              ? v <= 2 ? 'bg-red-100 text-red-700 border border-red-200'
                                : v === 3 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                : 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`rounded-xl border-2 p-4 text-center ${getTotalBg(totalScores)}`}>
              <div className="text-xs text-muted-foreground mb-1">百分制总分</div>
              <div className={`text-4xl font-bold ${getTotalColor(totalScores)}`}>{totalScores}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalScores >= 90 ? '优秀' : totalScores >= 70 ? '合格' : '需改进'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">备注</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_TAGS.map(tag => (
                  <button key={tag} type="button"
                    onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                      selectedTags.includes(tag)
                        ? 'bg-sky-50 text-blue-950 border-sky-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
              <textarea value={inspectComment}
                onChange={(e) => setInspectComment(e.target.value.slice(0, 200))}
                className="w-full border rounded-lg p-3 text-sm h-16 resize-none focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="补充说明（选填�?.." />
              <div className="text-xs text-right text-muted-foreground mt-0.5">{inspectComment.length}/200</div>
            </div>
          </DialogBody>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowInspectModal(false)}>取消</Button>
            <Button variant="outline" onClick={() => handleSubmitInspect(false)}
              disabled={submitting || !selectedStaffId}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />提交�?/> : '保存'}
            </Button>
            <Button onClick={() => handleSubmitInspect(true)}
              disabled={submitting || !selectedStaffId}
              className="bg-blue-900 hover:bg-blue-950 active:scale-95 text-white transition-all duration-200">
              {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />提交�?/> : <><ClipboardEdit className="w-4 h-4 mr-1" />保存并下一�?/>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关联客服弹窗 */}
      {showAgentDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAgentDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-800" />
                关联客服人员
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                选择纳入KPI考核的客服人员（已�?{selectedAgentIds.length} 人）
              </p>
            </div>
            <div className="px-6 py-3 flex-1 overflow-y-auto">
              {agentLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : agentList.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无客服人员</p>
                  <p className="text-xs mt-1">请先在客服管理中添加客服</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedAgentIds(selectedAgentIds.length === agentList.length ? [] : agentList.map(a => a.id))}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-sky-600 hover:bg-sky-50 transition-colors"
                  >
                    {selectedAgentIds.length === agentList.length ? '取消全�? : '全�?}
                  </button>
                  {agentList.map(agent => {
                    const checked = selectedAgentIds.includes(agent.id);
                    return (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-sky-50 border border-sky-200' : 'hover:bg-gray-50 border border-transparent'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedAgentIds(prev => checked ? prev.filter(id => id !== agent.id) : [...prev, agent.id])}
                          className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
                        />
                        <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowAgentDialog(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveLinkedAgents}
                className="px-4 py-2 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors"
              >
                确认关联（{selectedAgentIds.length}人）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 录入实际值弹�?*/}
      <Dialog open={showActualDialog} onOpenChange={setShowActualDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-sky-500" />
              录入实际�?
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
          {activeKpiPlan && editingIndicatorIdx >= 0 && (
            <div className="space-y-4 py-2">
              <div>
                <div className="text-sm font-medium mb-1">
                  {activeKpiPlan.indicators[editingIndicatorIdx]?.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  目标值：{activeKpiPlan.indicators[editingIndicatorIdx]?.target}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">实际完成�?/label>
                <Input
                  type="number"
                  value={actualInput}
                  onChange={(e) => setActualInput(e.target.value)}
                  placeholder="请输入实际数�?
                  className="h-10"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveActualValue(); }}
                />
              </div>
              {actualInput.trim() !== '' && !isNaN(Number(actualInput)) && (() => {
                const target = parseFloat(activeKpiPlan.indicators[editingIndicatorIdx]?.target) || 0;
                const rate = target > 0 ? (Number(actualInput) / target) * 100 : 0;
                const color = rate >= 100 ? 'text-green-700' : rate >= 80 ? 'text-yellow-700' : 'text-red-700';
                const label = rate >= 100 ? '已达�? : rate >= 80 ? '接近达标' : '未达�?;
                return (
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">达标�?/div>
                    <div className={`text-2xl font-bold ${color}`}>{rate.toFixed(1)}%</div>
                    <div className={`text-xs font-medium ${color}`}>{label}</div>
                  </div>
                );
              })()}
            </div>
          )}
          </DialogBody>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowActualDialog(false)}>取消</Button>
            {activeKpiPlan?.indicators[editingIndicatorIdx]?.actualValue !== undefined && (
              <Button variant="outline" onClick={() => { setActualInput(''); handleSaveActualValue(); }} className="text-red-600 hover:text-red-700">
                清除实际�?
              </Button>
            )}
            <Button onClick={handleSaveActualValue} className="bg-blue-900 hover:bg-blue-950 text-white">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI指标上限升级提示 */}
      {kpiUpgradeOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setKpiUpgradeOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">KPI指标已达上限</h3>
              <p className="text-sm text-gray-500">
                当前版本最多支�?<span className="font-semibold text-amber-600">{formatLimit(limits.maxKpiIndicators)} �?/span> KPI指标，已截取前{limits.maxKpiIndicators}个应用。开通旗舰版可无限添�?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setKpiUpgradeOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                知道�?
              </button>
              <Link
                href="/contact"
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors text-center"
              >
                咨询开通旗舰版
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 录入绩效数据 Modal ════════ */}
      <Dialog open={showEntryModal} onOpenChange={setShowEntryModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardEdit className="w-5 h-5 text-sky-500" />
              录入绩效数据
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
          {!activeKpiPlan || activeKpiPlan.indicators.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">请先在KPI设定中生成并启用一个方�?/p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => { setShowEntryModal(false); setActiveTab('setting'); }}
              >
                去设定KPI
              </Button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* 客服选择 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  客服姓名 <span className="text-red-500">*</span>
                </label>
                <select
                  value={entryAgentId}
                  onChange={(e) => setEntryAgentId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                >
                  <option value="">请选择客服</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* 考核月份 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  考核月份 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="month"
                  value={entryPeriod}
                  onChange={(e) => setEntryPeriod(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              {/* KPI指标打分 */}
              <div>
                <div className="text-sm font-medium mb-2">KPI指标得分</div>
                <div className="space-y-3">
                  {activeKpiPlan.indicators.map((ind, idx) => (
                    <div key={idx} className="rounded-lg border p-3 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{ind.name}</span>
                        {ind.category && (
                          <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">{ind.category}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>目标：{ind.target}</span>
                        {ind.weight && <span>权重：{ind.weight}</span>}
                      </div>
                      {'ref' in ind && typeof ind.ref === 'string' && <div className="text-xs text-gray-400 mb-2">{ind.ref}</div>}
                      <Input
                        type="number"
                        value={entryScores[ind.name] || ''}
                        onChange={(e) => setEntryScores(prev => ({ ...prev, [ind.name]: e.target.value }))}
                        placeholder="输入实际完成�?
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium mb-1">备注（选填�?/label>
                <textarea
                  value={entryRemark}
                  onChange={(e) => setEntryRemark(e.target.value)}
                  placeholder="填写备注信息..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 min-h-[60px] resize-y"
                />
              </div>

              {/* 达标率预�?*/}
              {activeKpiPlan.indicators.some(ind => entryScores[ind.name] && entryScores[ind.name].trim() !== '') && (
                <div className="rounded-lg bg-gray-50 border p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">达标率预�?/div>
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      const filledIndicators = activeKpiPlan.indicators.filter(ind => entryScores[ind.name]?.trim());
                      const reached = filledIndicators.filter(ind => {
                        const target = parseFloat(String(ind.target).replace(/[^\d.]/g, ''));
                        const actual = parseFloat(entryScores[ind.name]);
                        return target > 0 && actual >= target;
                      }).length;
                      const near = filledIndicators.filter(ind => {
                        const target = parseFloat(String(ind.target).replace(/[^\d.]/g, ''));
                        const actual = parseFloat(entryScores[ind.name]);
                        const rate = target > 0 ? (actual / target) * 100 : 0;
                        return rate >= 80 && rate < 100;
                      }).length;
                      const below = filledIndicators.length - reached - near;
                      return (
                        <>
                          <div className="text-center p-2 rounded bg-green-50">
                            <div className="text-lg font-bold text-green-700">{reached}</div>
                            <div className="text-[10px] text-green-600">达标</div>
                          </div>
                          <div className="text-center p-2 rounded bg-yellow-50">
                            <div className="text-lg font-bold text-yellow-700">{near}</div>
                            <div className="text-[10px] text-yellow-600">接近达标</div>
                          </div>
                          <div className="text-center p-2 rounded bg-red-50">
                            <div className="text-lg font-bold text-red-700">{below}</div>
                            <div className="text-[10px] text-red-600">未达�?/div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
          </DialogBody>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEntryModal(false)}>取消</Button>
            <Button
              onClick={handleSaveEntry}
              disabled={entrySubmitting || !entryAgentId || !entryPeriod}
              className="bg-blue-900 hover:bg-blue-950 text-white"
            >
              {entrySubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ 批量导入 Modal ════════ */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              批量导入绩效数据
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            {/* 步骤1: 下载模板 */}
            <div className="rounded-lg border p-4 bg-blue-50/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-medium">1</div>
                <span className="text-sm font-medium">下载导入模板</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">请按模板格式填写数据，确保表头名称一�?/p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                下载导入模板
              </Button>
            </div>

            {/* 步骤2: 上传文件 */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-medium">2</div>
                <span className="text-sm font-medium">上传填写好的文件</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => batchFileRef.current?.click()}
                  className="text-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  选择文件
                </Button>
                <span className="text-xs text-muted-foreground">
                  {batchFile ? batchFile.name : '支持 .csv 文件'}
                </span>
                <input
                  ref={batchFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBatchFileSelect}
                />
              </div>
            </div>

            {/* 步骤3: 预览数据 */}
            {batchPreview.length > 0 && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-medium">3</div>
                  <span className="text-sm font-medium">预览导入数据（前5行）</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        {Object.keys(batchPreview[0]).map(key => (
                          <th key={key} className="text-left py-1.5 px-2 font-medium text-muted-foreground whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batchPreview.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          {Object.entries(row).map(([key, val]) => (
                            <td key={key} className="py-1.5 px-2 whitespace-nowrap">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  �?{batchPreview.length} 行数据{batchPreview.length > 5 ? `，仅显示�?行` : ''}
                </div>
              </div>
            )}

            {/* 导入结果 */}
            {batchResult && (
              <div className={`rounded-lg border p-4 ${batchResult.fail === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {batchResult.fail === 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {batchResult.fail === 0 ? '导入成功' : '导入完成（有错误�?}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="text-green-700">成功：{batchResult.success} �?/div>
                  {batchResult.fail > 0 && <div className="text-red-700">失败：{batchResult.fail} �?/div>}
                  {batchResult.errors.map((err, i) => (
                    <div key={i} className="text-red-600">{err}</div>
                  ))}
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowBatchModal(false)}>
              {batchResult ? '关闭' : '取消'}
            </Button>
            {batchPreview.length > 0 && !batchResult && (
              <Button
                onClick={handleBatchImport}
                disabled={batchImporting}
                className="bg-blue-900 hover:bg-blue-950 text-white"
              >
                {batchImporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                确认导入
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
