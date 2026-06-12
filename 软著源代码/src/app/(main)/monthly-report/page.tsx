'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, Users, Bot, Lightbulb,
  ChevronLeft, ChevronRight, Calendar,
  ArrowUpRight, ArrowDownRight, Target, Award, Clock,
  Lock, ArrowRight, Sparkles,
  ChevronDown, ChevronUp, AlertTriangle,
  BookOpen, ClipboardCheck, RefreshCw, AlertCircle, MoreHorizontal,
  CheckCircle2, XCircle, BarChart3,
} from 'lucide-react';

/* ========== 类型定义 ========== */

interface RefundData {
  total: number;
  prevTotal: number;
  changePercent: string;
  top3Categories: { name: string; amount: number }[];
  canSeeDetail: boolean;
}

interface TeamData {
  kpiAchieveRate: number;
  prevKpiAchieveRate: number;
  kpiChange: number;
  avgQualityScore: number;
  prevAvgQualityScore: number;
  qualityChange: number;
  avgHandleHours: number;
  kpiRecordCount: number;
  qualityRecordCount: number;
  completedOrderCount: number;
}

interface AiData {
  creditsUsed: number;
  estMinutesSaved: number;
  estHoursSaved: number;
}

interface ComparisonData {
  monthOverMonth: {
    refund: { current: number; prev: number; change: string };
    kpi: { current: number; prev: number; change: number };
    quality: { current: number; prev: number; change: number };
  };
  beforeVsNow: {
    hasBaseline: boolean;
    baselineMonth: string;
    refund: { baseline: number; current: number };
    kpi: { baseline: number; current: number };
    quality: { baseline: number; current: number };
  };
}

interface ValueQuantification {
  aiSavingHours: number;
  aiSavingMoney: number;
  refundSavedAmount: number;
  totalSaved: number;
  hourlyRate: number;
}

interface ReportData {
  month: string;
  prevMonth: string;
  refund: RefundData;
  team: TeamData;
  ai: AiData;
  suggestions: string[];
  comparison: ComparisonData;
  valueQuantification: ValueQuantification;
}

// 三维框架：月度目标指�?
interface GoalMetric {
  metric: string;
  target: number;
  actual: number;
  unit: string;
  inverse?: boolean; // 越小越好
  prevMonth: number;
  icon: typeof Target;
  iconColor: string;
  iconBg: string;
}

// 三维框架：月度路径动�?
interface PathAction {
  type: '培训' | '管理' | '流程' | '资源';
  description: string;
  relatedMetrics: string[];
  count: number; // 执行次数
}

// 三维框架：月度结�?
interface ResultMetric {
  metric: string;
  target: number;
  actual: number;
  unit: string;
  inverse?: boolean;
}

/* ========== 常量 ========== */

const PATH_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: typeof BookOpen }> = {
  '培训': { color: 'text-blue-400', bg: 'bg-blue-400/15', icon: BookOpen },
  '管理': { color: 'text-purple-400', bg: 'bg-purple-400/15', icon: ClipboardCheck },
  '流程': { color: 'text-sky-400', bg: 'bg-sky-400/15', icon: RefreshCw },
  '资源': { color: 'text-amber-400', bg: 'bg-amber-400/15', icon: AlertCircle },
};

const STATUS_LIGHT: Record<string, string> = { green: '🟢', yellow: '🟡', red: '🔴' };

const REVIEW_QUESTIONS = [
  '1. 这个指标没达标，最直接的原因是什么？',
  '2. 是偶发还是持续性问题？',
  '3. 哪个环节/人员影响最大？',
  '4. 之前有做过什么改善措施？效果如何�?,
  '5. 现在还能做什么补救？',
  '6. 下月可以预防的改进点是什么？',
  '7. 需要谁配合？需要什么资源？',
  '8. 如果再发生，预案是什么？',
];

// Mock月度路径数据
const MOCK_PATH_ACTIONS: PathAction[] = [
  { type: '培训', description: '完成售后话术专题培训，覆盖全组客�?, relatedMetrics: ['客户满意�?, '首响时效'], count: 4 },
  { type: '培训', description: '新员工入�?阶段培训与考核', relatedMetrics: ['培训达标�?, '上手速度'], count: 2 },
  { type: '管理', description: '每日晨会+周度复盘，追踪KPI进展', relatedMetrics: ['KPI达标�?, '工单关闭�?], count: 20 },
  { type: '管理', description: '质检抽检�?�?辅导跟进', relatedMetrics: ['质检合格�?], count: 8 },
  { type: '流程', description: '优化退货处理SOP，缩短平均处理时�?, relatedMetrics: ['处理时长', '工单关闭�?], count: 3 },
  { type: '流程', description: '建立异常赔付审批流程', relatedMetrics: ['赔付金额', '风控状�?], count: 1 },
  { type: '资源', description: 'AI急救站推广应用，提升团队效率', relatedMetrics: ['AI提效时长', '响应时效'], count: 6 },
  { type: '资源', description: '补充高频场景话术�?, relatedMetrics: ['客户好评�?, '首响时效'], count: 2 },
];

/* ========== 主组�?========== */

export default function MonthlyReportPage() {
  const { profile, authFetch } = useAuth();
  const userRole = profile?.role || '';
  const canAccess = !['personal_user', 'staff'].includes(userRole);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [historyMsg, setHistoryMsg] = useState('');
  const [historyReports, setHistoryReports] = useState<Array<{ report_month: string; summary: Record<string, string | number>; created_at: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadReport = useCallback(async () => {
    if (!profile?.companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/monthly-report?company_id=${profile.companyId}&month=${currentMonth}&role=${userRole}`);
      if (res.ok) {
        const json = await res.json();
        setReport(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [profile?.companyId, currentMonth, authFetch, userRole]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // Fetch history reports
  useEffect(() => {
    if (!profile?.companyId) return;
    authFetch('/api/monthly-report?mode=history&company_id=' + profile.companyId)
      .then(res => res.ok ? res.json() : { reports: [] })
      .then(data => { if (data.reports) setHistoryReports(data.reports); })
      .catch(() => {});
  }, [profile?.companyId, authFetch]);

  const navigateMonth = (dir: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMoney = (v: number) => v >= 10000 ? `¥${(v / 10000).toFixed(1)}万` : `¥${v.toFixed(0)}`;

  // 判断达标
  const isAchieved = (m: { actual: number; target: number; inverse?: boolean }) =>
    m.inverse ? m.actual <= m.target : m.actual >= m.target;

  // 状态灯
  const getStatus = (m: { actual: number; target: number; inverse?: boolean }) => {
    const achieved = isAchieved(m);
    if (achieved) return 'green';
    const ratio = m.inverse ? m.target / m.actual : m.actual / m.target;
    return ratio >= 0.8 ? 'yellow' : 'red';
  };

  // 权限守卫
  if (profile?.role !== 'enterprise_manager' && profile?.role !== 'enterprise_admin' && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0B1929] flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-14 h-14 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-xl">月度简报仅对专业版/旗舰版主管开�?/p>
        </div>
      </div>
    );
  }

  // 构建三维框架数据
  const goalMetrics: GoalMetric[] = report ? [
    {
      metric: 'KPI达标�?, target: 80, actual: report.team.kpiAchieveRate, unit: '%',
      prevMonth: report.team.prevKpiAchieveRate, inverse: false,
      icon: Target, iconColor: 'text-sky-400', iconBg: 'bg-sky-400/10',
    },
    {
      metric: '赔付总额', target: 5000, actual: report.refund.total, unit: '�?,
      prevMonth: report.refund.prevTotal, inverse: true,
      icon: DollarSign, iconColor: 'text-red-400', iconBg: 'bg-red-400/10',
    },
    {
      metric: '质检均分', target: 80, actual: report.team.avgQualityScore, unit: '�?,
      prevMonth: report.team.prevAvgQualityScore, inverse: false,
      icon: Award, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-400/10',
    },
    {
      metric: 'AI提效时长', target: 10, actual: report.ai.estHoursSaved, unit: '小时',
      prevMonth: 0, inverse: false,
      icon: Bot, iconColor: 'text-violet-400', iconBg: 'bg-violet-400/10',
    },
  ] : [];

  const resultMetrics: ResultMetric[] = report ? [
    { metric: 'KPI达标�?, target: 80, actual: report.team.kpiAchieveRate, unit: '%', inverse: false },
    { metric: '赔付总额', target: 5000, actual: report.refund.total, unit: '�?, inverse: true },
    { metric: '质检均分', target: 80, actual: report.team.avgQualityScore, unit: '�?, inverse: false },
    { metric: '工单关闭�?, target: 95, actual: 91, unit: '%', inverse: false },
    { metric: '客户好评�?, target: 90, actual: 85, unit: '%', inverse: false },
    { metric: '退款率', target: 3, actual: 4.5, unit: '%', inverse: true },
  ] : [];

  // 综合达标�?
  const achievementRate = resultMetrics.length > 0
    ? Math.round(resultMetrics.filter(isAchieved).length / resultMetrics.length * 100)
    : 0;

  const ComparisonRow = ({ label, prev, current, unit = '', invertColor = false }: {
    label: string; prev: number | string; current: number | string; unit?: string; invertColor?: boolean;
  }) => {
    const prevNum = typeof prev === 'number' ? prev : parseFloat(prev);
    const currNum = typeof current === 'number' ? current : parseFloat(current);
    const diff = currNum - prevNum;
    const isPositive = invertColor ? diff < 0 : diff > 0;
    const color = isNaN(diff) || diff === 0 ? 'text-gray-400' : isPositive ? 'text-emerald-400' : 'text-red-400';
    return (
      <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
        <span className="text-white/60 text-base">{label}</span>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-base min-w-[80px] text-right">{prev}{unit}</span>
          <ArrowRight className="w-4 h-4 text-white/20" />
          <span className="text-white font-medium text-base min-w-[80px] text-right">{current}{unit}</span>
          {!isNaN(diff) && diff !== 0 && (
            <span className={`text-sm font-medium ${color} min-w-[70px] text-right`}>
              {diff > 0 ? '+' : ''}{typeof prev === 'number' ? diff.toFixed(1) : diff}{unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1929] p-4 md:p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">月度管理效果简�?/h1>
          <p className="text-white/50 mt-2 text-base">每月自动汇总，帮你快速掌握经营全�?/p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-2.5 rounded-lg bg-[#1a3a5c] hover:bg-[#244a6e] text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 bg-[#1a3a5c] px-4 py-2.5 rounded-lg">
            <Calendar className="w-5 h-5 text-sky-400" />
            <span className="text-white font-medium text-base">{currentMonth}</span>
          </div>
          <button onClick={() => navigateMonth(1)} className="p-2.5 rounded-lg bg-[#1a3a5c] hover:bg-[#244a6e] text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400" />
        </div>
      ) : !report ? (
        <div className="text-center py-24 text-white/50 text-xl">暂无数据</div>
      ) : (
        <div className="space-y-10">

          {/* ══════�?🎯 月度目标板块 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🎯</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">月度目标</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {goalMetrics.map((g) => {
                const status = getStatus(g);
                const achieved = isAchieved(g);
                const prevDiff = g.prevMonth > 0 ? g.actual - g.prevMonth : 0;
                const prevPositive = g.inverse ? prevDiff < 0 : prevDiff > 0;

                return (
                  <div key={g.metric} className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${g.iconBg}`}>
                          <g.icon className={`w-6 h-6 ${g.iconColor}`} />
                        </div>
                        <span className="text-white/70 text-lg font-medium">{g.metric}</span>
                      </div>
                      <span className="text-2xl">{STATUS_LIGHT[status]}</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-4xl font-bold text-white mb-1">
                        {g.metric === '赔付总额' ? formatMoney(g.actual) : `${g.actual}${g.unit}`}
                      </p>
                      <p className="text-white/50 text-base mb-2">
                        目标：{g.metric === '赔付总额' ? formatMoney(g.target) : `${g.target}${g.unit}`}
                      </p>
                    </div>
                    {/* 上月对比 */}
                    {g.prevMonth > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-white/40 text-sm">上月 {g.metric === '赔付总额' ? formatMoney(g.prevMonth) : `${g.prevMonth}${g.unit}`}</span>
                        {prevDiff !== 0 && (
                          <span className={`text-sm font-medium flex items-center gap-1 ${prevPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {prevPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {Math.abs(prevDiff).toFixed(1)}{g.unit}
                          </span>
                        )}
                        {prevDiff === 0 && <span className="text-gray-400 text-sm">持平</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-white/40 text-sm mt-4 text-center">💡 目标值可在KPI管理中设�?/p>
          </section>

          {/* 分隔�?*/}
          <hr className="border-white/10" />

          {/* ══════�?🛤�?月度路径板块 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🛤�?/span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">月度路径</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 按四大板块分组展�?*/}
              {(['培训', '管理', '流程', '资源'] as const).map(groupType => {
                const actions = MOCK_PATH_ACTIONS.filter(a => a.type === groupType);
                const config = PATH_TYPE_CONFIG[groupType];
                const TypeIcon = config.icon;
                const totalCount = actions.reduce((s, a) => s + a.count, 0);

                return (
                  <div key={groupType} className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${config.bg}`}>
                          <TypeIcon className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{groupType}执行</h3>
                          <p className="text-white/40 text-sm">本月{totalCount}�?/p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${config.color} ${config.bg}`}>
                        {actions.length}�?
                      </span>
                    </div>
                    <div className="space-y-3">
                      {actions.map((action, idx) => (
                        <div key={idx} className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/80 text-base leading-relaxed mb-2">{action.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1.5">
                              {action.relatedMetrics.map(metric => (
                                <span key={metric} className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-white/50">
                                  📊 {metric}
                                </span>
                              ))}
                            </div>
                            <span className="text-white/30 text-sm">{action.count}�?/span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 分隔�?*/}
          <hr className="border-white/10" />

          {/* ══════�?📊 月度结果板块 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📊</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">月度结果</h2>
            </div>

            {/* 综合达标�?+ 趋势概览 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 综合达标�?*/}
              <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/70 text-lg font-medium">综合达标�?/span>
                  <span className="text-4xl font-bold text-sky-400">{achievementRate}%</span>
                </div>
                <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${achievementRate >= 80 ? 'bg-emerald-400' : achievementRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${achievementRate}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {resultMetrics.filter(isAchieved).length}项达�?
                  </span>
                  <span className="text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> {resultMetrics.filter(m => !isAchieved(m)).length}项未达标
                  </span>
                </div>
              </div>

              {/* 上月 vs 本月 */}
              <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-sky-400/10">
                    <TrendingUp className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">上月 vs 本月</h3>
                    <p className="text-white/30 text-sm">{report.prevMonth} �?{report.month}</p>
                  </div>
                </div>
                <ComparisonRow label="赔付总额" prev={report.comparison.monthOverMonth.refund.prev} current={report.comparison.monthOverMonth.refund.current} unit="�? invertColor />
                <ComparisonRow label="KPI达标�? prev={report.comparison.monthOverMonth.kpi.prev} current={report.comparison.monthOverMonth.kpi.current} unit="%" />
                <ComparisonRow label="质检均分" prev={report.comparison.monthOverMonth.quality.prev} current={report.comparison.monthOverMonth.quality.current} />
              </div>
            </div>

            {/* 目标vs实际对比卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {resultMetrics.map((m) => {
                const achieved = isAchieved(m);
                const progressPct = m.inverse
                  ? Math.max(0, Math.min(100, Math.round((1 - (m.actual - m.target) / m.target) * 100)))
                  : Math.max(0, Math.min(100, Math.round((m.actual / m.target) * 100)));

                return (
                  <div
                    key={m.metric}
                    className={`bg-[#0F2B46] border rounded-2xl p-5 ${achieved ? 'border-white/10' : 'border-red-400/30'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white/70 text-lg font-medium">{m.metric}</span>
                      {achieved ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-white">
                        {m.metric === '赔付总额' ? formatMoney(m.actual) : `${m.actual}${m.unit}`}
                      </span>
                      <span className="text-white/40 text-base">
                        / 目标 {m.metric === '赔付总额' ? formatMoney(m.target) : `${m.target}${m.unit}`}
                      </span>
                    </div>

                    {/* 进度�?*/}
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${achieved ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {achieved ? (
                      <span className="text-emerald-400/70 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> 已达�?
                      </span>
                    ) : (
                      <button
                        onClick={() => setExpandedReview(expandedReview === m.metric ? null : m.metric)}
                        className="flex items-center gap-2 text-red-400 text-base font-medium hover:text-red-300 transition-colors"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        ⚠️ 未达�?�?查看复盘
                        {expandedReview === m.metric ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    )}

                    {/* 8问复盘面�?*/}
                    {expandedReview === m.metric && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-white/60 text-base font-semibold mb-4">📋 8问复�?/p>
                        <div className="space-y-2.5">
                          {REVIEW_QUESTIONS.map((q, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-3.5">
                              <p className="text-white/60 text-base">{q}</p>
                              <p className="text-white/20 text-sm mt-1.5">点击填写...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 使用�?vs 现在 */}
            <div className="mt-6 bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-emerald-400/10">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">使用�?vs 现在</h3>
                  <p className="text-white/30 text-sm">
                    {report.comparison.beforeVsNow.hasBaseline
                      ? `${report.comparison.beforeVsNow.baselineMonth} �?${report.month}`
                      : '暂无基线数据'}
                  </p>
                </div>
              </div>
              {report.comparison.beforeVsNow.hasBaseline ? (
                <>
                  <ComparisonRow label="赔付总额" prev={report.comparison.beforeVsNow.refund.baseline} current={report.comparison.beforeVsNow.refund.current} unit="�? invertColor />
                  <ComparisonRow label="KPI达标�? prev={report.comparison.beforeVsNow.kpi.baseline} current={report.comparison.beforeVsNow.kpi.current} unit="%" />
                  <ComparisonRow label="质检均分" prev={report.comparison.beforeVsNow.quality.baseline} current={report.comparison.beforeVsNow.quality.current} />
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/30 text-base">使用一段时间后，系统将自动生成基线对比数据</p>
                </div>
              )}
            </div>
          </section>

          {/* 分隔�?*/}
          <hr className="border-white/10" />

          {/* ══════�?原有功能保留 ══════�?*/}

          {/* 赔付TOP3 */}
          <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-red-400/10">
                <DollarSign className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">赔付TOP3分类</h2>
            </div>
            {report.refund.canSeeDetail && report.refund.top3Categories.length > 0 ? (
              <div className="space-y-3">
                {report.refund.top3Categories.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between bg-red-400/5 border border-red-400/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-red-400/20 text-red-400 text-sm flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-white/80 text-lg">{cat.name}</span>
                    </div>
                    <span className="text-white font-semibold text-lg">{formatMoney(cat.amount)}</span>
                  </div>
                ))}
              </div>
            ) : !report.refund.canSeeDetail ? (
              <div className="flex items-center gap-2 py-3">
                <Lock className="w-4 h-4 text-white/30" />
                <p className="text-white/30 text-base">赔付详情请咨询管理员</p>
              </div>
            ) : (
              <p className="text-white/30 text-base">暂无赔付记录</p>
            )}
          </div>

          {/* AI价�?*/}
          <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-violet-400/10">
                <Bot className="w-6 h-6 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">AI价�?/h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-white/50 text-base mb-2">本月使用次数</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-white">{report.ai.creditsUsed}</span>
                  <span className="text-white/40 text-base pb-1">�?/span>
                </div>
              </div>
              <div>
                <p className="text-white/50 text-base mb-2">估算节省时长</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-violet-400">{report.ai.estHoursSaved}</span>
                  <span className="text-white/40 text-base pb-1">小时</span>
                </div>
              </div>
            </div>
            <div className="mt-4 bg-violet-400/5 border border-violet-400/20 rounded-lg p-4">
              <p className="text-violet-300/80 text-base leading-relaxed">
                AI急救站每次使用平均节省约3分钟人工查询时间，折合约 ¥{report.valueQuantification.aiSavingMoney} 人工成本
              </p>
            </div>
          </div>

          {/* 价值量化大�?*/}
          <div className="bg-gradient-to-r from-sky-900/40 to-violet-900/40 border border-sky-400/20 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="w-7 h-7 text-sky-400" />
              <h2 className="text-xl font-semibold text-white">价值量�?/h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <p className="text-white/50 text-base mb-2">AI替代人工时长</p>
                <p className="text-3xl font-bold text-violet-400">{report.valueQuantification.aiSavingHours}小时</p>
                <p className="text-white/30 text-sm mt-1">折算 ¥{report.valueQuantification.aiSavingMoney}</p>
              </div>
              <div className="text-center">
                <p className="text-white/50 text-base mb-2">赔付环比下降</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {report.valueQuantification.refundSavedAmount > 0 ? formatMoney(report.valueQuantification.refundSavedAmount) : '�?}
                </p>
                <p className="text-white/30 text-sm mt-1">相比上月节省</p>
              </div>
              <div className="text-center">
                <p className="text-white/50 text-base mb-2">总计节省</p>
                <p className="text-3xl font-bold text-sky-400">{formatMoney(report.valueQuantification.totalSaved)}</p>
                <p className="text-white/30 text-sm mt-1">AI + 赔付下降</p>
              </div>
            </div>
            <div className="text-center pt-6 border-t border-sky-400/20">
              <p className="text-white/50 text-base mb-2">本月系统为您节省�?/p>
              <p className="text-5xl md:text-6xl font-bold text-sky-400 mb-2">
                {formatMoney(report.valueQuantification.totalSaved)}
              </p>
              <p className="text-white/40 text-sm">
                = AI替代 {report.valueQuantification.aiSavingHours}小时 × ¥{report.valueQuantification.hourlyRate}/小时
                {report.valueQuantification.refundSavedAmount > 0 && ` + 赔付环比下降 ${formatMoney(report.valueQuantification.refundSavedAmount)}`}
              </p>
            </div>
          </div>

          {/* ══════�?📌 下月方向 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">📌</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">下月方向</h2>
            </div>
            <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
              <div className="space-y-4">
                {/* 基于未达标指标的建议 */}
                {resultMetrics
                  .filter(m => !isAchieved(m))
                  .slice(0, 3)
                  .map(m => (
                    <div key={m.metric} className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-white/80 text-lg leading-relaxed">
                        <span className="font-semibold">{m.metric}</span>
                        {' '}未达标（实际 {m.metric === '赔付总额' ? formatMoney(m.actual) : `${m.actual}${m.unit}`}，目�?{m.metric === '赔付总额' ? formatMoney(m.target) : `${m.target}${m.unit}`}），下月建议重点改善�?
                      </p>
                    </div>
                  ))}
                {/* 基于API建议的补�?*/}
                {report.suggestions.map((s, i) => (
                  <div key={`sug-${i}`} className="flex items-start gap-4">
                    <Lightbulb className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-white/80 text-lg leading-relaxed">{s}</p>
                  </div>
                ))}
                {/* 全达标情�?*/}
                {resultMetrics.every(isAchieved) && report.suggestions.length === 0 && (
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-white/80 text-lg leading-relaxed">本月各项指标均达标，下月建议维持现有节奏，可尝试挑战更高目标�?/p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Summary bar */}
          <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-white/50 text-base">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <span>数据更新�?{currentMonth} · 基于已有业务数据自动生成</span>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await authFetch('/api/monthly-report', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ company_id: profile?.companyId, report_month: currentMonth }),
                    });
                    if (res.ok) {
                      setHistoryMsg('报告已保�?);
                    } else {
                      setHistoryMsg('保存失败');
                    }
                  } catch { setHistoryMsg('保存失败'); }
                  setTimeout(() => setHistoryMsg(''), 3000);
                }}
                className="px-4 py-1.5 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 保存报告
              </button>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="text-white/40 text-sm">赔付</p>
                <p className="text-white font-semibold text-base">{formatMoney(report.refund.total)}</p>
              </div>
              <div className="text-center">
                <p className="text-white/40 text-sm">KPI</p>
                <p className={`font-semibold text-base ${report.team.kpiAchieveRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {report.team.kpiAchieveRate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/40 text-sm">质检</p>
                <p className={`font-semibold text-base ${report.team.avgQualityScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {report.team.avgQualityScore}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/40 text-sm">AI节省</p>
                <p className="text-violet-400 font-semibold text-base">{report.ai.estHoursSaved}h</p>
              </div>
              <div className="text-center">
                <p className="text-white/40 text-sm">总节�?/p>
                <p className="text-sky-400 font-semibold text-base">{formatMoney(report.valueQuantification.totalSaved)}</p>
              </div>
            </div>
          </div>

          {/* History Reports */}
          {historyReports.length > 0 && (
            <section className="mt-6 bg-[#0a1f35] border border-white/10 rounded-2xl p-6">
              <h3 className="text-white/90 text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-400" /> 历史报告
              </h3>
              <div className="space-y-3">
                {historyReports.map((hr) => (
                  <div key={hr.report_month} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/90 font-medium">{hr.report_month}</span>
                      <span className="text-white/40 text-xs">{new Date(hr.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {hr.summary && Object.entries(hr.summary).slice(0, 8).map(([k, v]) => (
                        <div key={k} className="text-white/60">
                          <span className="text-white/40">{k}: </span>
                          <span className="text-white/80">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {historyMsg && (
            <div className="mt-4 text-center text-sm text-sky-400">{historyMsg}</div>
          )}

        </div>
      )}
    </div>
  );
}
