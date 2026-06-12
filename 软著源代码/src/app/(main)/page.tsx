'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataSecurityBadge } from '@/components/data-security-badge';
import { OnboardingGuide as OnboardingGuideCard } from '@/components/onboarding-guide';
import { AhaMomentGuide } from '@/components/aha-moment-guide';
import { IndustryProfileBanner } from '@/components/industry-profile-banner';
import { ConsultDialog } from '@/components/consult-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, Headphones, TrendingUp, Activity, Shield, Zap, MessageSquare, Flame,
  AlertTriangle, Plus, Download, FileText, Edit2, X, Calendar, BarChart3, Clock, ChevronLeft, ChevronRight, Brain, Target, Sparkles, Newspaper, Bell,
  AlertCircle, CheckCircle2, Info,
  ClipboardList, ShieldAlert, ClipboardCheck, ClipboardEdit, Ticket, BookOpen, Swords, Crown, DollarSign, RotateCcw, Store, Sun, Lightbulb
} from 'lucide-react';
import LazyLineChart from '@/components/lazy-line-chart';

interface DashboardStats {
  companies: { total: number; active: number; expired: number };
  users: { total: number; admin: number; enterprise_admin: number; enterprise_manager: number; staff: number };
  agents: { total: number; 在职: number; 离职: number; 试用: number };
}

interface KPIRecord {
  id: string;
  company_id: string;
  user_id: string;
  period: string;
  metrics_data?: Record<string, number | string>;
  record_date: string;
  created_at: string;
  updated_at: string;
}

interface UsageStats {
  aiUsageCount: number;
  weeklyUsageCount: number;
  yesterdayCount: number;
  topCategories: { name: string; count: number }[];
  scriptUsageRate: string;
}

const KPI_METRICS = [
  { key: 'response_time', label: '平均响应时长(�?', placeholder: '如：28' },
  { key: 'conversion_rate', label: '转化�?%)', placeholder: '如：8.7' },
  { key: 'complaint_count', label: '客诉�?�?', placeholder: '如：3' },
  { key: 'satisfaction_score', label: '客户满意�?�?', placeholder: '如：4.6' },
  { key: 'avg_order_value', label: '客单�?�?', placeholder: '如：2800' },
  { key: 'daily_consultations', label: '日咨询量(�?', placeholder: '如：120' },
];

interface TodayNotification {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; badge: string }> = {
  industry_trend: { icon: '📈', label: '行业趋势', color: 'text-blue-600 bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  platform_rule: { icon: '📋', label: '规则变动', color: 'text-sky-400 bg-sky-50', badge: 'bg-sky-100 text-sky-700' },
  daily_case: { icon: '🎯', label: '今日场景', color: 'text-green-600 bg-green-50', badge: 'bg-green-100 text-green-700' },
  product_update: { icon: '🔔', label: '产品更新', color: 'text-gray-600 bg-gray-50', badge: 'bg-gray-100 text-gray-700' },
  review: { icon: '📊', label: '复盘提醒', color: 'text-purple-600 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  work_order: { icon: '🔧', label: '工单提醒', color: 'text-blue-700 bg-slate-50', badge: 'bg-blue-100 text-blue-900' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, authFetch } = useAuth();
  const role = profile?.role;
  const companyPlan = profile?.companyPlan;
  const isPersonal = role === 'personal_user';
  const isStaff = role === 'staff';
  const isEnterprise = role === 'admin' || role === 'enterprise_admin';
  const isManager = role === 'enterprise_manager';
  const isProManager = isManager && companyPlan === 'pro';
  const isEnterpriseManager = isManager && companyPlan === 'enterprise';
  const canViewGlobalStats = role === 'enterprise_admin';
  const canManageKPI = role === 'enterprise_admin' || role === 'enterprise_manager';

  // Admin role goes directly to admin dashboard
  useEffect(() => {
    if (role === 'admin') {
      router.replace('/admin');
    }
  }, [role, router]);

  // All hooks must be declared before any conditional returns (React rules of hooks)
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayNotifications, setTodayNotifications] = useState<TodayNotification[]>([]);
  const [loading, setLoading] = useState(!isPersonal && !isStaff);
  const [kpiRecords, setKpiRecords] = useState<KPIRecord[]>([]);
  const [kpiLoading, setKpiLoading] = useState(!isPersonal && !isStaff);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KPIRecord | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryMetrics, setEntryMetrics] = useState<Record<string, string>>({});
  const [financeData, setFinanceData] = useState<{
    pnl: { income: number; expense: number; profit: number };
    refund: { rate: number; amount: number; change: number; hasData: boolean };
    profitTrend: { month: string; profit: number }[];
    costAlert: { currentAfterSaleCost: number; change: number; isOverBudget: boolean; budgetLimit: number; hasData: boolean };
    hasData: boolean;
  } | null>(null);
  const [teamComparison, setTeamComparison] = useState<{
    id: string; name: string; workOrderCount: number; kpiRate: number; qaScore: number;
  }[]>([]);
  const [savingEntry, setSavingEntry] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<{ count: number; totalFee: number }>({ count: 0, totalFee: 0 });
  const statsFetchedRef = useRef(false);
  const kpiFetchedRef = useRef(false);
  const [todoSummary, setTodoSummary] = useState<{
    workOrders: { total: number; overdue: number };
    platformRules: number;
    highPriorityCases: number;
    reviews: number;
    dailyCostNotRecorded: boolean;
    hasAnyTodo: boolean;
  } | null>(null);
  const [todoLoading, setTodoLoading] = useState(!isPersonal && !isStaff);
  const [dailyBriefing, setDailyBriefing] = useState<{
    yesterdayLoss: number; lossChange: number; pendingApproval: number;
    aiSavingHours: number; totalSaved: number; pushTime: string;
  } | null>(null);

  // Redirect personal_user to /learning-path and staff to /my-workspace
  useEffect(() => {
    if (isPersonal) {
      router.replace('/growth-dashboard');
    } else if (isStaff) {
      router.replace('/my-workspace');
    }
  }, [isPersonal, isStaff, router]);

  // Fetch dashboard stats (enterprise users only)
  useEffect(() => {
    if (isPersonal || isStaff) return;
    if (statsFetchedRef.current) return;
    const url = profile?.companyId ? `/api/dashboard?companyId=${profile.companyId}` : '/api/dashboard';
    authFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStats(data);
        if (data?.usageStats) {
          setUsageStats(data.usageStats);
        }
        setLoading(false);
        statsFetchedRef.current = true;
      })
      .catch(() => setLoading(false));
  }, [profile?.companyId, isPersonal, isStaff, authFetch]);

  // Fetch finance overview (admin only)
  useEffect(() => {
    if (isPersonal || isStaff) return;
    if (!profile?.companyId || role !== 'enterprise_admin') return;
    authFetch('/api/finance/overview')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setFinanceData(data); })
      .catch(() => {});
  }, [profile?.companyId, role, isPersonal, isStaff, authFetch]);

  // Fetch team comparison (admin only)
  useEffect(() => {
    if (isPersonal || isStaff) return;
    if (!profile?.companyId || role !== 'enterprise_admin') return;
    authFetch('/api/finance/team-comparison')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.teams) setTeamComparison(data.teams); })
      .catch(() => {});
  }, [profile?.companyId, role, isPersonal, isStaff, authFetch]);

  // Fetch cost alert anomaly data (flagship/admin only)
  const [costAlertAnomaly, setCostAlertAnomaly] = useState<{method: string; alertsCount: number; latestAlert: string | null} | null>(null);
  const [insights, setInsights] = useState<Array<{id: string; insight_type: string; title: string; summary: string; priority: string; is_read: boolean; created_at: string}>>([]);
  useEffect(() => {
    if (isPersonal || isStaff || !profile?.companyId) return;
    authFetch('/api/insights?limit=3&is_read=false')
      .then(res => res.ok ? res.json() : { insights: [] })
      .then(data => { if (data.insights) setInsights(data.insights); })
      .catch(() => {});
  }, [profile?.companyId, role]);
  const [staffLossStats, setStaffLossStats] = useState<{staff_caused_refund_total: number; staff_caused_count: number; total_refund_total: number; staff_caused_rate: number; prev_staff_caused_refund_total: number; prev_staff_caused_rate: number} | null>(null);
  const [monthlyValue, setMonthlyValue] = useState<{ai_queries: number; quality_change: string; guides_created: number; knowledge_added: number; cost_saved: string} | null>(null);
  useEffect(() => {
    if (isPersonal || isStaff || !profile?.companyId) return;
    authFetch('/api/monthly-report')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.summary) setMonthlyValue(data.summary); })
      .catch(() => {});
  }, [profile?.companyId, role, isPersonal, isStaff, authFetch]);
  const [consultOpen, setConsultOpen] = useState(false);
  useEffect(() => {
    if (isPersonal || isStaff) return;
    if (!profile?.companyId || role !== 'enterprise_admin') return;
    authFetch('/api/finance/cost-alert')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setCostAlertAnomaly({
            method: data.method,
            alertsCount: data.alerts?.length || 0,
            latestAlert: data.alerts?.[0]?.message || null,
          });
        }
      })
      .catch(() => {});
  }, [profile?.companyId, role, isPersonal, isStaff, authFetch]);

  // Fetch staff loss stats for boss/manager dashboard
  useEffect(() => {
    if (isPersonal || isStaff) return;
    if (!profile?.companyId) return;
    if (role !== 'enterprise_admin' && role !== 'enterprise_manager') return;
    authFetch('/api/customer-records?action=stats')
      .then(res => res.json())
      .then(data => {
        if (data.data) setStaffLossStats(data.data);
      })
      .catch(() => {});
  }, [profile?.companyId, role, isPersonal, isStaff, authFetch]);

  // Fetch daily briefing for ent_admin
  useEffect(() => {
    if (role !== 'enterprise_admin' || !profile?.companyId) return;
    authFetch(`/api/daily-briefing?company_id=${profile.companyId}`)
      .then(res => res.json())
      .then(data => { if (data.data) setDailyBriefing(data.data); })
      .catch(() => {});
  }, [profile?.companyId, role, authFetch]);

  // Read platform info from localStorage (client only)
  useEffect(() => {
    try {
      const platforms = JSON.parse(localStorage.getItem('business-tools-platforms') || '[]');
      if (Array.isArray(platforms) && platforms.length > 0) {
        const totalFee = platforms.reduce((sum: number, p: {monthlySales?: number; rate?: number}) => sum + ((p.monthlySales || 0) * (p.rate || 0) / 100), 0);
        setPlatformInfo({ count: platforms.length, totalFee });
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch today's notifications
  useEffect(() => {
    if (isPersonal || isStaff) return;
    if (!profile?.companyId) return;
    authFetch('/api/notifications?today=true&limit=4')
      .then(res => res.json())
      .then(data => {
        if (data.data) setTodayNotifications(data.data);
      })
      .catch(() => {});
  }, [profile?.companyId, isPersonal, isStaff, authFetch]);

  // Fetch todo summary
  useEffect(() => {
    if (isPersonal || isStaff) return;
    const fetchTodoSummary = async () => {
      setTodoLoading(true);
      try {
        const res = await authFetch('/api/dashboard/todo-summary?companyId=' + (profile?.companyId || ''));
        const data = await res.json();
        if (!data.error) setTodoSummary(data);
      } catch (e) {
        console.error('获取待办摘要失败', e);
      } finally {
        setTodoLoading(false);
      }
    };
    if (profile?.companyId) fetchTodoSummary();
    else setTodoLoading(false);
  }, [profile?.companyId, isPersonal, isStaff, authFetch]);

  // Fetch KPI records
  useEffect(() => {
    if (isPersonal || isStaff) return;
    if (!profile?.companyId || kpiFetchedRef.current) return;
    kpiFetchedRef.current = true;
    fetchKPIRecords();
  }, [profile?.companyId, isPersonal, isStaff]);

  const fetchKPIRecords = async () => {
    if (!profile?.companyId) return;
    try {
      const res = await authFetch(`/api/kpi-data?companyId=${profile.companyId}`);
      if (res.ok) {
        const data = await res.json();
        setKpiRecords(data.data || []);
      }
    } catch { /* ignore */ } finally {
      setKpiLoading(false);
    }
  };

  // Compute KPI trends
  const kpiTrends = useMemo(() => {
    if (kpiRecords.length === 0) return null;
    const sorted = [...kpiRecords].sort((a, b) =>
      new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
    );
    const latest = sorted[0];
    const prev = sorted[1];
    return { latest, prev, total: sorted.length };
  }, [kpiRecords]);

  const handleSaveEntry = useCallback(async () => {
    if (!profile?.companyId || !profile?.id) return;
    setSavingEntry(true);
    try {
      const metricsData: Record<string, number | string> = {};
      for (const [key, value] of Object.entries(entryMetrics)) {
        if (value.trim()) {
          const num = parseFloat(value);
          metricsData[key] = isNaN(num) ? value : num;
        }
      }

      if (Object.keys(metricsData).length === 0) {
        setSavingEntry(false);
        return;
      }

      if (editingRecord) {
        await authFetch('/api/kpi-data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingRecord.id, metricsData }),
        });
      } else {
        await authFetch('/api/kpi-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: profile.companyId,
            userId: profile.id,
            recordDate: entryDate,
            metricsData,
            period: 'manual',
          }),
        });
      }
      await fetchKPIRecords();
      setShowEntryDialog(false);
      setEditingRecord(null);
      setEntryMetrics({});
    } catch { /* ignore */ } finally {
      setSavingEntry(false);
    }
  }, [profile, entryDate, entryMetrics, editingRecord]);

  const handleEditRecord = useCallback((record: KPIRecord) => {
    setEditingRecord(record);
    setEntryDate(record.record_date);
    const metrics: Record<string, string> = {};
    if (record.metrics_data) {
      for (const [key, value] of Object.entries(record.metrics_data)) {
        metrics[key] = String(value);
      }
    }
    setEntryMetrics(metrics);
    setShowEntryDialog(true);
  }, []);

  const handleExportExcel = useCallback(() => {
    if (kpiRecords.length === 0) return;
    const headers = ['日期', ...KPI_METRICS.map(m => m.label)];
    const rows = kpiRecords.map(r => {
      const row: string[] = [r.record_date];
      for (const m of KPI_METRICS) {
        row.push(r.metrics_data?.[m.key] !== undefined ? String(r.metrics_data[m.key]) : '');
      }
      return row;
    });
    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPI数据_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [kpiRecords]);

  const handleExportPDF = useCallback(() => {
    const content = kpiRecords.map(r => {
      let line = `日期�?{r.record_date}\n`;
      if (r.metrics_data) {
        for (const m of KPI_METRICS) {
          if (r.metrics_data[m.key] !== undefined) {
            line += `${m.label}�?{r.metrics_data[m.key]}\n`;
          }
        }
      }
      return line;
    }).join('\n---\n\n');

    const blob = new Blob([
      `职盈学海 - KPI数据报告\n`,
      `导出日期�?{new Date().toLocaleDateString()}\n\n`,
      content || '暂无数据'
    ], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPI报告_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [kpiRecords]);

  // Don't render dashboard for staff (they get redirected to /my-workspace)
  if (isStaff) return null;

  // Admin role is redirected to /admin via useEffect above
  if (role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">正在跳转到管理后�?..</p>
      </div>
    );
  }

  // ========== Personal User: Learning Center ==========
  if (isPersonal) {
    return (
      <>
      <div className="space-y-6 animate-fade-in-up bg-gray-50 min-h-screen">
        {/* 定位语横�?*/}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-800 rounded-xl p-3 text-center">
          <p className="text-sky-200 text-sm tracking-widest font-medium">
            <Sparkles className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            唯一专注电商客服管理的AI实战系统
            <Sparkles className="w-4 h-4 inline-block ml-1 -mt-0.5" />
          </p>
        </div>

        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">你好，{profile?.displayName || '同学'}</h2>
              <p className="text-sky-300 mt-1">今天继续学习，每天进步一点点</p>
            </div>
            <div className="text-5xl">📚</div>
          </div>
        </div>

        {/* Insights - 洞察推送卡�?*/}
        {insights.length > 0 && !isPersonal && !isStaff && (
          <div className="bg-white rounded-xl shadow-md border border-blue-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-xl font-semibold text-gray-800">
                {role === 'enterprise_admin' ? '经营洞察' : '管理洞察'}
              </h3>
              <a href="/insights" className="ml-auto text-sm text-sky-500 hover:underline">查看全部</a>
            </div>
            <div className="space-y-3">
              {insights.map((ins) => {
                const typeConfig: Record<string, {icon: string; color: string; label: string}> = {
                  quality_decline: { icon: '🔴', color: 'bg-red-50 text-red-700', label: '质检下滑' },
                  kpi_warning: { icon: '🔴', color: 'bg-red-50 text-red-700', label: 'KPI预警' },
                  compensation_spike: { icon: '🔴', color: 'bg-red-50 text-red-700', label: '赔付飙升' },
                  rule_change: { icon: '🟡', color: 'bg-amber-50 text-amber-700', label: '规则变动' },
                  incentive_trend: { icon: '🟡', color: 'bg-amber-50 text-amber-700', label: '激励趋�? },
                  learning_stagnation: { icon: '🔵', color: 'bg-blue-50 text-blue-700', label: '学习停滞' },
                  knowledge_expiry: { icon: '🟠', color: 'bg-orange-50 text-orange-700', label: '知识过期' },
                  knowledge_stagnation: { icon: '🟣', color: 'bg-purple-50 text-purple-700', label: '知识库停�? },
                };
                const cfg = typeConfig[ins.insight_type] || { icon: '🔔', color: 'bg-gray-50 text-gray-700', label: ins.insight_type };
                return (
                  <div key={ins.id} className="border rounded-lg p-3 hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-sm">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                          {!ins.is_read && <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />}
                          <span className="text-xs text-gray-400 ml-auto">{new Date(ins.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800">{ins.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ins.summary}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Value Card - 本月系统为你做了什�?*/}
        {monthlyValue && !isPersonal && !isStaff && (
          <div className="bg-white rounded-xl shadow-md border border-blue-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <h3 className="text-xl font-semibold text-gray-800">本月系统为你做了什�?/h3>
              <a href="/monthly-report" className="ml-auto text-sm text-sky-500 hover:underline">查看完整报告</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{monthlyValue.ai_queries || 0}</div>
                <div className="text-xs text-blue-600 mt-1">AI使用次数</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{monthlyValue.quality_change || '-'}</div>
                <div className="text-xs text-green-600 mt-1">质检变化</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{monthlyValue.cost_saved || '-'}</div>
                <div className="text-xs text-amber-600 mt-1">预估节省</div>
              </div>
            </div>
          </div>
        )}

        {/* Learning Progress - Personal: learning path, Enterprise: onboarding */}
        <div data-guide="learning-section" className="bg-white rounded-xl shadow-md border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-sky-400" />
            <h3 className="text-xl font-semibold text-gray-800">
              {isPersonal ? '学习进度' : (role === 'enterprise_admin' ? '45天学习进�? : '7天学习进�?)}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">完成�?/span>
              <span className="font-medium text-blue-900">
                {isPersonal ? (() => {
                  try {
                    const progress = JSON.parse(localStorage.getItem(`learning-path-progress_${profile?.id || ''}`) || localStorage.getItem('learning-path-progress') || '{}');
                    const completed = Object.values(progress).filter(Boolean).length;
                    return `${completed}/25`;
                  } catch { return '0/25'; }
                })() : (() => {
                  try {
                    const tasks = JSON.parse(localStorage.getItem('onboarding_tasks') || '[]');
                    const done = tasks.filter((t: { completed: boolean }) => t.completed).length;
                    const total = role === 'enterprise_admin' ? 45 : 7;
                    return `${done}/${total}`;
                  } catch { return `0/${role === 'enterprise_admin' ? 45 : 7}`; }
                })()}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-sky-400 to-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${isPersonal ? (() => {
                  try {
                    const progress = JSON.parse(localStorage.getItem(`learning-path-progress_${profile?.id || ''}`) || localStorage.getItem('learning-path-progress') || '{}');
                    const completed = Object.values(progress).filter(Boolean).length;
                    return Math.round((completed / 25) * 100);
                  } catch { return 0; }
                })() : (() => {
                  try {
                    const tasks = JSON.parse(localStorage.getItem('onboarding_tasks') || '[]');
                    const done = tasks.filter((t: { completed: boolean }) => t.completed).length;
                    const total = role === 'enterprise_admin' ? 45 : 7;
                    return Math.round((done / total) * 100);
                  } catch { return 0; }
                })()}%` }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(isPersonal ? '/learning-path' : '/onboarding-flow')}
              className="w-full border-blue-200 text-blue-900 hover:bg-blue-50"
            >
              继续学习
            </Button>
          </div>
        </div>

        {/* AI Tool Shortcuts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">AI工具</h3>
          <div data-guide="tools-section" className="grid gap-4 md:grid-cols-3">
            <button
              data-guide="ai-assistant"
              onClick={() => router.push('/ai-assistant')}
              className="bg-white rounded-xl shadow-md border border-blue-100 p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-red-500" />
                </div>
                <h4 className="font-semibold text-gray-800">AI急救�?/h4>
              </div>
              <p className="text-sm text-gray-500">遇到问题，即时解�?/p>
              <span className="text-xs text-sky-400 group-hover:underline mt-2 inline-block">立即使用 �?/span>
            </button>
            <button
              onClick={() => router.push('/practice')}
              className="bg-white rounded-xl shadow-md border border-blue-100 p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-800">话术练兵�?/h4>
              </div>
              <p className="text-sm text-gray-500">每天练一练，话术自然�?/p>
              <span className="text-xs text-sky-400 group-hover:underline mt-2 inline-block">开始练�?�?/span>
            </button>
            <button
              data-guide="knowledge-entry"
              onClick={() => router.push(isPersonal ? '/knowledge-notes' : '/knowledge-qa')}
              className="bg-white rounded-xl shadow-md border border-blue-100 p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  {isPersonal ? <BookOpen className="w-5 h-5 text-blue-600" /> : <Brain className="w-5 h-5 text-blue-600" />}
                </div>
                <h4 className="font-semibold text-gray-800">{isPersonal ? '知识笔记' : '产品百科'}</h4>
              </div>
              <p className="text-sm text-gray-500">{isPersonal ? '记录心得，积累经�? : '查产品知识，一搜就�?}</p>
              <span className="text-xs text-sky-400 group-hover:underline mt-2 inline-block">{isPersonal ? '开始记�?�? : '开始查�?�?}</span>
            </button>
          </div>
        </div>

        {/* Today's Practice */}
        {(() => {
          const DAILY_SCENES = [
            { label: '客户说水压低', desc: '客户反馈花洒出水不均匀' },
            { label: '投诉安装师傅态度�?, desc: '要求换人并赔�? },
            { label: '马桶冲水无力', desc: '客户要求退�? },
            { label: '要求赠送配�?, desc: '否则给差�? },
            { label: '签收后发现破�?, desc: '要求全额退�? },
            { label: '保修期外维修', desc: '要求免费维修' },
            { label: '催促发货', desc: '再不发货就取消订�? },
            { label: '质疑产品材质', desc: '与描述不�? },
          ];
          const today = new Date();
          const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
          const scene = DAILY_SCENES[seed % DAILY_SCENES.length];
          return (
            <div className="bg-white rounded-xl shadow-md border border-blue-100 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Target className="w-5 h-5 text-sky-400" />
                    <h3 className="text-lg font-semibold text-gray-800">今日一�?/h3>
                  </div>
                  <p className="text-base text-gray-700 font-medium">{scene.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{scene.desc}</p>
                </div>
                <Button size="sm" onClick={() => router.push('/practice')} className="shrink-0 bg-blue-900 hover:bg-blue-950 text-white">
                  开始练�?
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Learning Resources */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">学习资源</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={() => router.push('/templates')}
              className="bg-white rounded-xl shadow-md border border-blue-100 p-5 text-left hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-sky-400" />
                <div>
                  <h4 className="font-medium text-gray-800">模板�?/h4>
                  <p className="text-xs text-gray-500">话术/SOP/台账模板</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => router.push('/help')}
              className="bg-white rounded-xl shadow-md border border-blue-100 p-5 text-left hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-sky-400" />
                <div>
                  <h4 className="font-medium text-gray-800">帮助中心</h4>
                  <p className="text-xs text-gray-500">使用指南与常见问�?/p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">解锁专业版或旗舰�?/h4>
              <p className="text-sm text-sky-600 mt-0.5">告别低效人工带教，整套成熟体系上线，自主研读自主练习，小白零门槛看懂吃�?/p>
            </div>
            <Button
              size="sm"
              onClick={() => setConsultOpen(true)}
              className="bg-blue-900 hover:bg-blue-950 text-white"
            >
              咨询开�?
            </Button>
          </div>
        </div>
      </div>
      <AhaMomentGuide />
    </>
  );
  }

  // ========== Enterprise User: Dashboard ==========
  return (
    <>
    <div className="space-y-6 animate-fade-in-up bg-gray-50 min-h-screen">
      {/* 定位语横�?*/}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-2.5 px-4 rounded-lg text-center">
        <span className="font-bold text-sm tracking-wide">唯一专注电商客服管理的AI实战系统</span>
      </div>
      <DataSecurityBadge />
      {/* 7天快速上手指�?*/}
      <OnboardingGuideCard
        guideKey="dashboard"
        steps={[
          { title: '查看数据概览', description: '首页展示核心运营数据' },
          { title: '进入管理功能', description: '侧边栏进入KPI、质检等管理页�? },
          { title: '使用AI急救�?, description: '遇到问题随时问AI' },
        ]}
      />
      {/* 行业档案引导弹窗 */}
      <IndustryProfileBanner />
      {/* 每日一练卡�?*/}
      {(() => {
        const DAILY_SCENES = [
          { label: '客户说水压低', desc: '客户反馈家里水压低，花洒出水不均匀，怀疑产品质量问�? },
          { label: '投诉安装师傅态度�?, desc: '客户投诉安装师傅态度差，要求换人并赔�? },
          { label: '马桶冲水无力', desc: '客户反馈智能马桶冲水无力，要求退�? },
          { label: '要求赠送配�?, desc: '客户要求赠送额外配件，否则给差�? },
          { label: '签收后发现破�?, desc: '客户签收后开箱发现产品破损，要求全额退�? },
          { label: '保修期外维修', desc: '产品已过保修期，客户要求免费维修' },
          { label: '催促发货', desc: '客户催促发货，表示再不发货就取消订单' },
          { label: '质疑产品材质', desc: '客户质疑产品材质与描述不符，要求解释' },
        ];
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        const scene = DAILY_SCENES[seed % DAILY_SCENES.length];
        return (
          <div className="bg-white rounded-xl shadow-md border border-blue-100 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="w-5 h-5 text-sky-400" />
                  <h3 className="text-xl font-semibold text-gray-800">今日一�?🎯</h3>
                </div>
                <p className="text-base text-gray-700 font-medium truncate">{scene.label}</p>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{scene.desc}</p>
              </div>
              <Button size="sm" onClick={() => router.push('/practice')} className="shrink-0 bg-blue-900 hover:bg-blue-950 hover:scale-105 transition-all text-white">
                开始练�?
              </Button>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">
            {isPersonal ? '学习中心' : (isEnterpriseManager || isEnterprise ? '45天系统自学�?5人团队管�? : '7天快速自学�?人团队管�?)}
          </h2>
          <p className="text-sm text-gray-500">
            {isPersonal ? '每天进步一点点' : (isEnterpriseManager || isEnterprise ? '45天跑通全链路管理体系' : '7天跑通质检、排班、基础KPI')}
          </p>
        </div>
        <div className="flex gap-2">
          {canManageKPI && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={kpiRecords.length === 0}>
                <Download className="w-3 h-3 mr-1" />导出Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={kpiRecords.length === 0}>
                <FileText className="w-3 h-3 mr-1" />导出PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 今日待办摘要 */}
      {/* 今日待办 - skeleton/data/empty 三�?*/}
      {todoLoading ? (
        <div className="mb-6 bg-gradient-to-r bg-white rounded-xl shadow-md border border-blue-100 p-5 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-blue-200 rounded" />
                    <div className="w-16 h-5 bg-blue-200 rounded" />
            <div className="w-20 h-5 bg-blue-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-blue-100 rounded-lg" />
            <div className="h-8 bg-blue-100 rounded-lg" />
          </div>
        </div>
      ) : todoSummary ? (
        <div className="mb-6 bg-gradient-to-r bg-white rounded-xl shadow-md border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-blue-900" />
            <h3 className="text-xl font-semibold text-gray-800">今日待办</h3>
          </div>
          {todoSummary.hasAnyTodo ? (
            <div className="space-y-2 text-sm">
              <button
                onClick={() => router.push('/work-orders')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">
                    {todoSummary.workOrders.total}条待处理工单
                    {todoSummary.workOrders.overdue > 0 && (
                      <span className="text-red-600 font-medium ml-1">，其中{todoSummary.workOrders.overdue}条已超时</span>
                    )}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              {todoSummary.platformRules > 0 && (
                <button
                  onClick={() => router.push('/notifications?tab=platform_rule')}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-sky-400" />
                    <span className="text-gray-700">{todoSummary.platformRules}条平台规则变�?/span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              )}
              {todoSummary.highPriorityCases > 0 && (
                <button
                  onClick={() => router.push('/notifications?tab=daily_case')}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-gray-700">{todoSummary.highPriorityCases}条高优售后案�?/span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              )}
              {todoSummary.reviews > 0 && (
                <button
                  onClick={() => router.push('/notifications?tab=review')}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">{todoSummary.reviews}条复盘提�?/span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              )}
              {todoSummary.dailyCostNotRecorded && (
                <button
                  onClick={() => router.push('/kpi?tab=cost')}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardEdit className="w-4 h-4 text-sky-400" />
                    <span className="text-gray-700">今日售后数据未录�?/span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">今日无待办，工作顺利 🎉</p>
          )}
        </div>
      ) : null}

      {/* Main Stats */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-xl border animate-pulse bg-muted" />)}
        </div>
      ) : stats ? (
        canViewGlobalStats ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="企业总数" value={stats.companies.total} subtitle={`活跃 ${stats.companies.active}`} icon={Building2} color="blue" />
            <StatCard title="用户总数" value={stats.users.total} subtitle={`管理�?${stats.users.enterprise_admin}`} icon={Users} color="green" />
            <StatCard title="客服人员" value={stats.agents.total} subtitle={`在职 ${stats.agents.在职}`} icon={Headphones} color="purple" />
            <StatCard title="活跃比例" value={stats.companies.total > 0 ? `${Math.round((stats.companies.active / stats.companies.total) * 100)}%` : '0%'} subtitle="企业活跃�? icon={TrendingUp} color="orange" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="客服人数" value={stats.agents.total} subtitle={`在职 ${stats.agents.在职}`} icon={Headphones} color="purple" />
            <StatCard title="今日AI使用" value={usageStats?.aiUsageCount ?? 0} subtitle="�? icon={Brain} color="blue" />
            <StatCard title="本周AI使用" value={usageStats?.weeklyUsageCount ?? 0} subtitle="�? icon={Zap} color="green" />
            <StatCard title="话术采用�? value={usageStats?.scriptUsageRate ?? '0%'} subtitle="推荐话术采纳比例" icon={MessageSquare} color="orange" />
          </div>
        )
      ) : null}

      {/* === 老板看板 (enterprise_admin only) === */}
      {isEnterprise && !isManager && (
        <div className="space-y-6">
          {/* 早安简报卡�?*/}
          {dailyBriefing && (
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-gray-900">早安简�?/h3>
                </div>
                <span className="text-xs text-gray-400">{dailyBriefing.pushTime}</span>
              </div>
              <div className="space-y-2 text-base">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-gray-700">昨天赔了 <span className="font-bold text-red-600">¥{dailyBriefing.yesterdayLoss.toLocaleString()}</span>�?
                    {dailyBriefing.lossChange > 0 ? (
                      <span className="text-red-500">比前天↑{dailyBriefing.lossChange}%</span>
                    ) : dailyBriefing.lossChange < 0 ? (
                      <span className="text-green-600">比前天↓{Math.abs(dailyBriefing.lossChange)}%</span>
                    ) : (
                      <span className="text-gray-500">与前天持�?/span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${dailyBriefing.pendingApproval > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  <span className="text-gray-700">
                    {dailyBriefing.pendingApproval > 0 ? (
                      <>�?<span className="font-bold text-red-600">{dailyBriefing.pendingApproval}</span> 笔异常赔付待审批</>
                    ) : (
                      <span className="text-green-600">无异常赔付待审批</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-gray-700">本月累计节省 <span className="font-bold text-blue-700">¥{dailyBriefing.totalSaved.toLocaleString()}</span>（AI替代{dailyBriefing.aiSavingHours}小时 × 25�?时）</span>
                </div>
              </div>
            </div>
          )}

          {/* 老板看板标题 */}
          <div className="rounded-xl shadow-md border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-800">老板看板</h3>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">旗舰版专�?/span>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push('/consultant')}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />专属顾问
                </Button>
              </div>
            </div>
          </div>

          {/* 财务概览 4卡片 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 卡片1: 月度盈亏 */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">月度盈亏</span>
              </div>
              {financeData && financeData.hasData ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">收入</span>
                    <span className="font-medium">¥{(financeData.pnl.income || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">支出</span>
                    <span className="font-medium">¥{(financeData.pnl.expense || 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">利润</span>
                    <span className={`font-bold ${(financeData.pnl.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ¥{(financeData.pnl.profit || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">暂无数据 📊</p>
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => router.push('/business-tools')}>
                    去录�?�?
                  </Button>
                </div>
              )}
              {financeData && financeData.hasData && (
                <Button size="sm" variant="ghost" className="mt-2 text-xs w-full" onClick={() => router.push('/business-tools')}>查看详情 �?/Button>
              )}
            </div>

            {/* 卡片2: 退款退货率 */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700">退款退货率</span>
              </div>
              {financeData && financeData.refund.hasData ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">退款退货率</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{financeData.refund.rate.toFixed(1)}%</span>
                      {financeData.refund.change !== 0 && (
                        <span className={`text-[10px] ${financeData.refund.change > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {financeData.refund.change > 0 ? '�? : '�?}{Math.abs(financeData.refund.change).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">退款退货金�?/span>
                    <span className="font-medium">¥{(financeData.refund.amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">暂无数据，请先在成本预警中录入售后赔付记�?/p>
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => router.push('/cost-alert')}>
                    去录�?�?
                  </Button>
                </div>
              )}
              {financeData && financeData.refund.hasData && (
                <Button size="sm" variant="ghost" className="mt-2 text-xs w-full" onClick={() => router.push('/business-tools')}>查看详情 �?/Button>
              )}
            </div>

            {/* 卡片3: 利润趋势 */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">利润趋势</span>
              </div>
              {financeData && financeData.profitTrend.length > 0 ? (
                <div className="h-24">
                  <LazyLineChart data={financeData.profitTrend} dataKey="profit" xKey="month" />
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">暂无趋势数据 📈</p>
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => router.push('/business-tools')}>
                    去录入月度数�?�?
                  </Button>
                </div>
              )}
              {financeData && financeData.profitTrend.length > 0 && (
                <Button size="sm" variant="ghost" className="mt-1 text-xs w-full" onClick={() => router.push('/business-tools')}>查看详情 �?/Button>
              )}
            </div>

            {/* 卡片4: 成本预警（旗舰版专属智能预警�?*/}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700">成本预警</span>
                <span className="ml-auto px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded">智能预警</span>
                {costAlertAnomaly && costAlertAnomaly.alertsCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded">{costAlertAnomaly.alertsCount}项异�?/span>
                )}
              </div>
              {financeData && financeData.costAlert.hasData ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">本月售后赔付</span>
                    <span className="font-medium">¥{(financeData.costAlert.currentAfterSaleCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">环比变化</span>
                    <span className={`font-medium ${financeData.costAlert.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {financeData.costAlert.change > 0 ? '+' : ''}{financeData.costAlert.change.toFixed(1)}%
                    </span>
                  </div>
                  {financeData.costAlert.isOverBudget && (
                    <div className="mt-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
                      ⚠️ 超预�?上限¥{financeData.costAlert.budgetLimit.toLocaleString()})
                    </div>
                  )}
                  {costAlertAnomaly && costAlertAnomaly.latestAlert && (
                    <div className="mt-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
                      {costAlertAnomaly.latestAlert}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">暂无预警数据 ⚠️</p>
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => router.push('/cost-alert')}>
                    去录�?�?
                  </Button>
                </div>
              )}
              {financeData && financeData.costAlert.hasData && (
                <Button size="sm" variant="ghost" className="mt-2 text-xs w-full" onClick={() => router.push('/cost-alert')}>查看详情 �?/Button>
              )}
            </div>
          </div>

          {/* 客服损失看板 (旗舰�?ent_admin 专属) */}
          {staffLossStats && (
            <div className="rounded-xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h4 className="text-base font-semibold text-gray-800">客服损失看板</h4>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">本月</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">¥{(staffLossStats.staff_caused_refund_total || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">客服失误退款金�?/p>
                  {staffLossStats.prev_staff_caused_refund_total > 0 && (
                    <p className={`text-[10px] mt-0.5 ${staffLossStats.staff_caused_refund_total > staffLossStats.prev_staff_caused_refund_total ? 'text-red-500' : 'text-green-500'}`}>
                      {staffLossStats.staff_caused_refund_total > staffLossStats.prev_staff_caused_refund_total ? '�? : '�?}较上�?
                      ¥{Math.abs(staffLossStats.staff_caused_refund_total - staffLossStats.prev_staff_caused_refund_total).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-600">{(staffLossStats.staff_caused_rate || 0).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">客服责任退款率</p>
                  {staffLossStats.prev_staff_caused_rate > 0 && (
                    <p className={`text-[10px] mt-0.5 ${staffLossStats.staff_caused_rate > staffLossStats.prev_staff_caused_rate ? 'text-red-500' : 'text-green-500'}`}>
                      {staffLossStats.staff_caused_rate > staffLossStats.prev_staff_caused_rate ? '�? : '�?}较上�?
                      {Math.abs(staffLossStats.staff_caused_rate - staffLossStats.prev_staff_caused_rate).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-700">{staffLossStats.staff_caused_count || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">客服失误工单�?/p>
                  <p className="text-[10px] text-gray-400 mt-0.5">总退款¥{(staffLossStats.total_refund_total || 0).toLocaleString()}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="mt-3 text-xs w-full" onClick={() => router.push('/customer-records?responsibility=staff_mistake')}>
                查看客服失误工单 �?
              </Button>
            </div>
          )}

          {/* 跨班组对�?+ 多店核算 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 跨班组对�?*/}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">跨班组对�?/span>
              </div>
              {teamComparison && teamComparison.length > 1 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-500 font-medium">班组</th>
                        <th className="text-right py-2 text-gray-500 font-medium">工单�?/th>
                        <th className="text-right py-2 text-gray-500 font-medium">KPI达标</th>
                        <th className="text-right py-2 text-gray-500 font-medium">质检均分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamComparison.map((t: { id: string; name: string; workOrderCount: number; kpiRate: number; qaScore: number }) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="py-2 font-medium text-gray-700">{t.name}</td>
                          <td className="text-right py-2">{t.workOrderCount}</td>
                          <td className="text-right py-2">
                            <span className={t.kpiRate >= 80 ? 'text-green-600' : t.kpiRate >= 60 ? 'text-amber-600' : 'text-red-600'}>
                              {t.kpiRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="text-right py-2">
                            <span className={t.qaScore >= 80 ? 'text-green-600' : t.qaScore >= 60 ? 'text-amber-600' : 'text-red-600'}>
                              {t.qaScore.toFixed(0)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    {teamComparison && teamComparison.length <= 1 ? '添加更多班组后可查看跨组对比' : '加载�?..'}
                  </p>
                  {teamComparison && teamComparison.length <= 1 && (
                    <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => router.push('/teams')}>
                      去管理班�?�?
                    </Button>
                  )}
                </div>
              )}
              <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => router.push('/teams')}>管理班组 �?/Button>
            </div>

            {/* 多店核算入口 */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">多店核算</span>
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">旗舰�?/span>
              </div>
              <div className="space-y-2">
                {platformInfo.count > 0 ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">已配置店�?/span>
                      <span className="font-medium">{platformInfo.count} �?/span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">月度平台扣点</span>
                      <span className="font-medium">¥{platformInfo.totalFee.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">点击配置店铺信息，核算各平台扣点</p>
                )}
              </div>
              <Button size="sm" variant="ghost" className="mt-2 text-xs w-full" onClick={() => router.push('/business-tools')}>配置店铺 �?/Button>
            </div>
          </div>
        </div>
      )}

      {/* === 主管工作台标�?(enterprise_manager) === */}
      {isManager && (
        <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-sky-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {isProManager ? '主管工作�?· 专业�? : '主管工作�?· 旗舰�?}
              </h3>
              <p className="text-xs text-gray-500">
                {isProManager
                  ? '单班组管�?· 质检10�?· KPI 8指标 · 模板5�?
                  : '多班组管�?· 质检/KPI/模板不限 · 深度管控'}
              </p>
            </div>
          </div>
          {isProManager && (
            <Link href="/contact" className="text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full hover:bg-sky-200 transition">
              咨询开通旗舰版解锁无限 �?
            </Link>
          )}
        </div>
      )}

      {/* 客服损失摘要 (专业�?旗舰�?ent_manager) */}
      {isManager && staffLossStats && (staffLossStats.staff_caused_refund_total > 0 || staffLossStats.staff_caused_count > 0) && (
        <div className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-gray-800">客服损失</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">本月</span>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-red-600">¥{(staffLossStats.staff_caused_refund_total || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">客服失误退�?/p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{(staffLossStats.staff_caused_rate || 0).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">客服责任退款率</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs ml-auto" onClick={() => router.push('/customer-records?responsibility=staff_mistake')}>
              查看详情 �?
            </Button>
          </div>
        </div>
      )}

      {/* KPI Overview Section */}
      <div className="rounded-xl shadow-md border border-blue-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-900" />
            <h3 className="text-xl font-semibold text-gray-800">KPI概览</h3>
          </div>
          {canManageKPI && (
            <Button
              size="sm"
              className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white"
              onClick={() => {
                setEditingRecord(null);
                setEntryDate(new Date().toISOString().split('T')[0]);
                setEntryMetrics({});
                setShowEntryDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />录入数据
            </Button>
          )}
        </div>
        <div className="p-4">
          {kpiLoading ? (
            <div className="h-40 animate-pulse bg-muted rounded-lg" />
          ) : kpiTrends ? (
            <div className="space-y-4">
              {/* Latest metrics cards */}
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                {KPI_METRICS.map(m => {
                  const latestVal = kpiTrends.latest?.metrics_data?.[m.key];
                  const prevVal = kpiTrends.prev?.metrics_data?.[m.key];
                  const trend = latestVal !== undefined && prevVal !== undefined
                    ? Number(latestVal) - Number(prevVal)
                    : null;
                  return (
                    <div key={m.key} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                      <p className="text-xl font-bold mt-1">{latestVal !== undefined ? latestVal : '--'}</p>
                      {trend !== null && trend !== 0 && (
                        <span className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {trend > 0 ? '�? : '�?} {Math.abs(trend)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Date info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                最近录入：{kpiTrends.latest?.record_date}（共{kpiTrends.total}条记录）
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground mb-3">暂无KPI数据</p>
              {canManageKPI && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRecord(null);
                    setEntryDate(new Date().toISOString().split('T')[0]);
                    setEntryMetrics({});
                    setShowEntryDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />录入第一条数�?
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Usage Stats Section */}
      {usageStats && (
        <div className="rounded-xl shadow-md border border-blue-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="p-4 border-b flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-900" />
            <h3 className="text-xl font-semibold text-gray-800">AI助手使用概览</h3>
          </div>
          <div className="p-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">今日AI解决问题�?/p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-2xl font-bold text-purple-600">{usageStats.aiUsageCount}</p>
                  {usageStats.yesterdayCount > 0 && usageStats.aiUsageCount !== usageStats.yesterdayCount && (
                    <span className={`text-xs font-medium mb-1 ${usageStats.aiUsageCount > usageStats.yesterdayCount ? 'text-green-500' : 'text-red-500'}`}>
                      {usageStats.aiUsageCount > usageStats.yesterdayCount ? '�? : '�?}{Math.abs(usageStats.aiUsageCount - usageStats.yesterdayCount)} vs昨日
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">本周AI使用次数</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{usageStats.weeklyUsageCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">话术采用�?/p>
                <p className="text-2xl font-bold mt-1 text-green-600">{usageStats.scriptUsageRate}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-2">高频问题TOP3</p>
                {usageStats.topCategories.length > 0 ? (
                  <div className="space-y-1">
                    {usageStats.topCategories.slice(0, 3).map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-sky-400' : 'bg-yellow-500'}`}>{idx + 1}</span>
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无数据</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Section */}
      {usageStats && (
        <div className="rounded-xl border bg-gradient-to-r bg-gradient-to-r from-blue-50 to-sky-50 shadow-md">
          <div className="p-4 border-b border-blue-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h3 className="text-xl font-semibold text-gray-800">智能洞察</h3>
          </div>
          <div className="p-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {usageStats.topCategories.length > 0 && (
                <InsightCard
                  icon="📊"
                  title={usageStats.topCategories[0].name + '问题最�?}
                  description={`本周${usageStats.topCategories[0].name}相关问题${usageStats.topCategories[0].count}次，建议学习相关判断链`}
                  href="/training"
                  color="orange"
                />
              )}
              {usageStats.topCategories.some(c => c.name.includes('质量')) && (
                <InsightCard
                  icon="📚"
                  title="建议完善知识�?
                  description="质量问题频发，完善产品知识库可提升AI诊断准确�?
                  href="/product-knowledge"
                  color="blue"
                />
              )}
              {usageStats.weeklyUsageCount < 3 && (
                <InsightCard
                  icon="🚀"
                  title="试试多问AI几个问题"
                  description="本周使用不足3次，AI用得越多越懂你的业务"
                  href="/ai-assistant"
                  color="green"
                />
              )}
              {usageStats.weeklyUsageCount >= 3 && usageStats.topCategories.length > 0 && !usageStats.topCategories.some(c => c.name.includes('质量')) && (
                <InsightCard
                  icon="💡"
                  title="使用趋势良好"
                  description={`本周已使�?{usageStats.weeklyUsageCount}次，继续加油！`}
                  href="/ai-assistant"
                  color="green"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's Digest */}
      {todayNotifications.length > 0 && (
        <div className="rounded-xl shadow-md border border-blue-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-900" />
              <h3 className="text-xl font-semibold text-gray-800">今日速�?/h3>
            </div>
            <button
              onClick={() => router.push('/notifications')}
              className="text-xs text-sky-400 hover:text-sky-500 font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="p-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {todayNotifications.map((n) => {
                const config = NOTIFICATION_TYPE_CONFIG[n.type] || NOTIFICATION_TYPE_CONFIG.industry_trend;
                return (
                  <button
                    key={n.id}
                    onClick={() => router.push('/notifications')}
                    className="shrink-0 w-64 rounded-lg border p-3 text-left hover:border-sky-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${config.badge}`}>
                        {config.icon} {config.label}
                      </span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </div>
                    <h4 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{n.title}</h4>
                    {n.summary && (
                      <p className="text-xs text-gray-600 line-clamp-1">{n.summary}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Records */}
      {canManageKPI && kpiRecords.length > 0 && (
        <div className="rounded-xl shadow-md border border-blue-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="p-4 border-b flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-gray-800">历史记录</h3>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {kpiRecords.slice(0, 20).map(record => (
              <div key={record.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{record.period}</Badge>
                    <span className="text-sm font-medium">{record.record_date}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {record.metrics_data && Object.entries(record.metrics_data).map(([key, value]) => {
                      const metric = KPI_METRICS.find(m => m.key === key);
                      return metric ? (
                        <span key={key} className="text-xs text-muted-foreground">
                          {metric.label}�?span className="font-medium text-gray-700">{value}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail sections */}
      {stats && canViewGlobalStats && (
        <div className="grid gap-6 md:grid-cols-2">
          <DetailCard title="企业状态分�? items={[
            { label: '活跃', value: stats.companies.active, total: stats.companies.total, color: 'bg-green-500' },
            { label: '过期', value: stats.companies.expired, total: stats.companies.total, color: 'bg-red-500' },
          ]} icon={Activity} />
          <DetailCard title="客服状态分�? items={[
            { label: '在职', value: stats.agents.在职, total: stats.agents.total, color: 'bg-green-500' },
            { label: '试用', value: stats.agents.试用, total: stats.agents.total, color: 'bg-yellow-500' },
            { label: '离职', value: stats.agents.离职, total: stats.agents.total, color: 'bg-gray-400' },
          ]} icon={Shield} />
        </div>
      )}

      {/* Data Entry Dialog */}
      {showEntryDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editingRecord ? '编辑KPI数据' : '录入KPI数据'}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => { setShowEntryDialog(false); setEditingRecord(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="px-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-medium mb-1">日期</label>
                <Input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>

              {KPI_METRICS.map(m => (
                <div key={m.key}>
                  <label className="block text-sm font-medium mb-1">{m.label}</label>
                  <Input
                    placeholder={m.placeholder}
                    value={entryMetrics[m.key] || ''}
                    onChange={(e) => setEntryMetrics(prev => ({ ...prev, [m.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="p-6 pt-4 shrink-0 border-t border-gray-100">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowEntryDialog(false); setEditingRecord(null); }}>
                  取消
                </Button>
                <Button
                  className="flex-1 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white transition-all duration-200"
                  onClick={handleSaveEntry}
                  disabled={savingEntry || Object.values(entryMetrics).every(v => !v.trim())}
                >
                  {savingEntry ? '保存�?..' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 版本标识 */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-2">
        {isEnterprise ? (
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">旗舰�?· 全量开�?/span>
        ) : (
          <Link href="/contact" className="text-xs font-medium text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1 rounded-full transition-colors">
            咨询开通旗舰版，解锁更多名额与深度管控 �?
          </Link>
        )}
      </div>
      <ConsultDialog open={consultOpen} onOpenChange={setConsultOpen} title="咨询开�? />
      <AhaMomentGuide />
    </div>
    </>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string; value: number | string; subtitle: string; icon: React.ElementType; color: string; trend?: number | null;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-blue-50 text-blue-900',
  };

  return (
    <div className="rounded-xl shadow-md border border-blue-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`rounded-lg p-2 ${colorMap[color] || colorMap.blue}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end gap-2 mt-3">
        <p className="text-3xl font-bold">{value}</p>
        {trend !== null && trend !== undefined && trend !== 0 && (
          <span className={`text-sm font-medium mb-1 flex items-center gap-0.5 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? '�? : '�?}{Math.abs(trend)}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function DetailCard({ title, items, icon: Icon }: {
  title: string; items: { label: string; value: number; total: number; color: string }[]; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl shadow-md border border-blue-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-blue-900" />
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ icon, title, description, href, color }: {
  icon: string; title: string; description: string; href: string; color: 'orange' | 'blue' | 'green';
}) {
  const router = useRouter();
  const colorMap = {
    orange: 'bg-sky-100 border-sky-200 hover:bg-sky-200',
    blue: 'bg-blue-100 border-blue-200 hover:bg-blue-150',
    green: 'bg-green-100 border-green-200 hover:bg-green-150',
  };
  const textColorMap = {
    orange: 'text-sky-800',
    blue: 'text-blue-800',
    green: 'text-green-800',
  };
  return (
    <button
      onClick={() => router.push(href)}
      className={`rounded-lg border p-4 text-left transition-colors ${colorMap[color]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className={`font-semibold text-sm ${textColorMap[color]}`}>{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
