'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { markOnboardingDay } from '@/lib/onboarding-helpers';
import { Button } from '@/components/ui/button';
import { PageHint } from '@/components/page-hint';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import {
  ClipboardEdit, TrendingUp, AlertTriangle, History, Upload, FileSpreadsheet, Loader2, ArrowLeft,
  ShieldCheck, Info, FileDown, Pencil, Lightbulb, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import Link from 'next/link';
import { toast } from 'sonner';
import { PermissionLocked } from '@/components/permission-locked';
import { DataSecurityBadge } from '@/components/data-security-badge';

/* ─── 类型 ─── */
interface CostRecord {
  id: string;
  record_date: string;
  total_cost: number;
  work_order_count: number | null;
  refund_count: number | null;
  note: string | null;
  created_at: string;
}
interface CostAlert {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface CostStats {
  today: number | null;
  yesterday_change_percent: number | null;
  month_total: number | null;
  month_avg: number | null;
}
interface ControlDataPoint {
  month: string;
  value: number;
  ucl: number;
  lcl: number;
  mean: number;
  isAnomaly: boolean;
}
interface CostAlertReview {
  id: string;
  company_id: string;
  alert_date: string;
  reason_category: string;
  reason_desc: string | null;
  prevention: string | null;
  created_by: string | null;
  created_at: string;
}

/* ─── 原因分类 ─── */
const REASON_CATEGORIES = [
  '产品质量问题',
  '物流破损',
  '客服误判',
  '季节性波�?,
  '促销活动',
  '其他',
] as const;
interface ControlAlert {
  type: string;
  month: string;
  value: number;
  threshold: number;
  message: string;
  contribution: string;
}
interface ControlChartResponse {
  method: 'control_chart' | 'fixed_threshold';
  dataPoints: Record<string, ControlDataPoint[]>;
  alerts: ControlAlert[];
  dataSufficient: boolean;
}

const COST_FIELD_LABELS: Record<string, string> = {
  total_revenue: '收入',
  total_expense: '总支�?,
  purchase_total: '进货成本',
  ad_total: '广告投放',
  shipping_pack_total: '快递包�?,
  salary_total: '人员工资',
  after_sales_total: '售后赔付',
  returns_total: '退货损�?,
};

/* ══════════════�?三维框架 Mock 数据 & 工具 ══════════════�?*/
const REVIEW_QUESTIONS_3D = [
  '1. 触警的根本原因是什么？',
  '2. 是偶发还是系统性问题？',
  '3. 预警阈值是否设置合理？',
  '4. 有没有提前预警信号被忽略�?,
  '5. 排查和响应速度是否达标�?,
  '6. 处理措施是否有效防止了复发？',
  '7. 是否需要调整管控红线？',
  '8. 谁负责跟进？什么时间复查？',
];
const MOCK_ALERT_GOALS = [
  { metric: '日赔付上�?, target: 500, unit: '�?, inverse: true },
  { metric: '月赔付上�?, target: 12000, unit: '�?, inverse: true },
  { metric: '环比涨幅红线', target: 30, unit: '%', inverse: true },
  { metric: '退款率红线', target: 3.5, unit: '%', inverse: true },
];
const MOCK_ALERT_PATHS = [
  { type: '发现', description: '系统自动检测到赔付环比上涨35%，触发红色预�?, relatedMetrics: ['环比涨幅红线', '月赔付上�?], status: '自动' as const },
  { type: '排查', description: '运营主管排查原因：大促期间物流破损率上升导致赔付增加', relatedMetrics: ['日赔付上�?, '退款率红线'], status: '人工' as const },
  { type: '处理', description: '紧急联系物流方更换包装，破损件赔偿方案调整为换货优�?, relatedMetrics: ['日赔付上�?], status: '执行�? as const },
  { type: '处理', description: '退款审核加严，需提供破损照片+物流签收确认', relatedMetrics: ['退款率红线'], status: '已落�? as const },
  { type: '预防', description: '建立物流破损日监控表，日破损率超2%自动预警', relatedMetrics: ['环比涨幅红线'], status: '规划�? as const },
];
const MOCK_ALERT_RESULTS = [
  { metric: '日赔付上�?, target: 500, actual: 620, unit: '�?, inverse: true },
  { metric: '月赔付上�?, target: 12000, actual: 9800, unit: '�?, inverse: true },
  { metric: '环比涨幅红线', target: 30, actual: 35, unit: '%', inverse: true },
  { metric: '退款率红线', target: 3.5, actual: 3.2, unit: '%', inverse: true },
];
function isAchieved3D(target: number, actual: number, inverse: boolean) { return inverse ? actual <= target : actual >= target; }
function getStatus3D(target: number, actual: number, inverse: boolean) {
  if (isAchieved3D(target, actual, inverse)) return 'green' as const;
  const ratio = inverse ? target / actual : actual / target;
  return ratio >= 0.8 ? 'yellow' as const : 'red' as const;
}
const STATUS_LIGHT = { green: '🟢', yellow: '🟡', red: '🔴' };
const STATUS_BG = { green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200', red: 'bg-red-50 border-red-200' };
const STATUS_TEXT = { green: 'text-green-700', yellow: 'text-yellow-700', red: 'text-red-700' };
const PATH_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '发现': { bg: 'bg-red-100', text: 'text-red-800' },
  '排查': { bg: 'bg-amber-100', text: 'text-amber-800' },
  '处理': { bg: 'bg-blue-100', text: 'text-blue-800' },
  '预防': { bg: 'bg-green-100', text: 'text-green-800' },
};
const PATH_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '自动': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '人工': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '执行�?: { bg: 'bg-blue-100', text: 'text-blue-700' },
  '已落�?: { bg: 'bg-green-100', text: 'text-green-700' },
  '规划�?: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function CostAlertPage() {

  const { profile, authFetch } = useAuth();

  // Permission guard - Hooks must come before any conditional returns
  const role = profile?.role || 'staff';
  const companyPlan = profile?.companyPlan || 'basic';
  const isEnterprise = companyPlan === 'enterprise' || role === 'admin';

  /* ─── 三维框架：复盘展开状�?─── */
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  /* ─── 成本数据状�?─── */
  const [costRecords, setCostRecords] = useState<CostRecord[]>([]);
  const [costAlerts, setCostAlerts] = useState<CostAlert[]>([]);
  const [costStats, setCostStats] = useState<CostStats | null>(null);
  const [costTodayRecord, setCostTodayRecord] = useState<CostRecord | null>(null);
  const [costDate, setCostDate] = useState(new Date().toISOString().slice(0, 10));
  const [costAmount, setCostAmount] = useState('');
  const [costWorkOrders, setCostWorkOrders] = useState('');
  const [costRefunds, setCostRefunds] = useState('');
  const [costNote, setCostNote] = useState('');
  const [costSubmitting, setCostSubmitting] = useState(false);

  /* ─── 批量导入状�?─── */
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchResults, setBatchResults] = useState<Array<{ line: number; date: string; amount: string; status: 'ok' | 'error'; msg: string }>>([]);
  const [batchImporting, setBatchImporting] = useState(false);

  /* ─── 智能预警状�?旗舰�? ─── */
  const [controlData, setControlData] = useState<ControlChartResponse | null>(null);
  const [controlLoading, setControlLoading] = useState(false);
  const [selectedField, setSelectedField] = useState<string>('total_expense');
  const [exportingCda, setExportingCda] = useState(false);

  // ─── 预警复盘 ───
  const [reviews, setReviews] = useState<CostAlertReview[]>([]);
  const [reviewModal, setReviewModal] = useState<{
    date: string;
    reasonCategory: string;
    reasonDesc: string;
    prevention: string;
  } | null>(null);
  const [reviewCategory, setReviewCategory] = useState<string>('');
  const [reviewDesc, setReviewDesc] = useState('');
  const [reviewPrevention, setReviewPrevention] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewCollapsed, setReviewCollapsed] = useState(false);

  /* ─── 导出CDA分析报告 ─── */
  const handleExportCda = async () => {
    setExportingCda(true);
    try {
      const res = await authFetch('/api/finance/cda-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'docx' }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: '导出失败' }));
        toast.error(json.error || '导出失败');
        setExportingCda(false);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename\*?=(?:UTF-8'')?(.+)/);
      a.download = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'CDA分析报告.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('CDA分析报告导出成功');
    } catch (err) {
      toast.error('导出失败，请重试');
    } finally {
      setExportingCda(false);
    }
  };

  /* ─── 获取成本数据 ─── */
  const fetchCostData = useCallback(async () => {
    if (!profile?.companyId) return;
    try {
      const res = await authFetch(`/api/cost-records?companyId=${profile.companyId}`);
      const json = await res.json();
      if (!res.ok) {
        console.error('[cost-alert] GET /api/cost-records failed:', res.status, json);
        toast.error(json.error || '获取成本数据失败');
        return;
      }
      if (json.records) {
        setCostRecords(json.records || []);
        setCostStats(json.stats || null);
        setCostAlerts(json.alerts || []);
        const today = new Date().toISOString().slice(0, 10);
        const existing = (json.records || []).find((r: CostRecord) => r.record_date === today);
        if (existing) {
          setCostTodayRecord(existing);
          setCostAmount(String(existing.total_cost));
          setCostWorkOrders(existing.work_order_count != null ? String(existing.work_order_count) : '');
          setCostRefunds(existing.refund_count != null ? String(existing.refund_count) : '');
          setCostNote(existing.note || '');
        } else {
          setCostTodayRecord(null);
          setCostAmount('');
          setCostWorkOrders('');
          setCostRefunds('');
          setCostNote('');
        }
      }
    } catch (err) {
      console.error('[cost-alert] fetchCostData error:', err);
    }
  }, [profile?.companyId, authFetch]);

  /* ─── 获取智能预警数据(旗舰�? ─── */
  const fetchControlData = useCallback(async () => {
    if (!isEnterprise) return;
    setControlLoading(true);
    try {
      const res = await authFetch('/api/finance/cost-alert');
      if (res.ok) {
        const json = await res.json();
        setControlData(json as ControlChartResponse);
      }
    } catch (err) {
      console.error('[cost-alert] fetchControlData error:', err);
    } finally {
      setControlLoading(false);
    }
  }, [authFetch, isEnterprise]);

  useEffect(() => { fetchCostData(); }, [fetchCostData]);
  useEffect(() => { if (isEnterprise) fetchControlData(); }, [fetchControlData, isEnterprise]);

  /* ─── 获取预警复盘 ─── */
  const fetchReviews = useCallback(async () => {
    if (!profile?.companyId) return;
    try {
      const res = await authFetch('/api/cost-alert-reviews');
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : (json as Record<string, unknown>)?.data;
        setReviews(Array.isArray(data) ? data as CostAlertReview[] : []);
      }
    } catch { /* ignore */ }
  }, [profile?.companyId, authFetch]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  /* ─── 提交成本数据 ─── */
  const handleSubmitCost = async () => {
    if (!profile?.companyId || !costDate || !costAmount) return;
    setCostSubmitting(true);
    try {
      const res = await authFetch('/api/cost-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.companyId,
          record_date: costDate,
          total_cost: parseFloat(costAmount),
          work_order_count: costWorkOrders ? parseInt(costWorkOrders) : null,
          refund_count: costRefunds ? parseInt(costRefunds) : null,
          note: costNote || null,
          created_by: profile.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('[cost-alert] POST /api/cost-records failed:', res.status, json);
        toast.error(json.error || '录入失败');
        return;
      }
      if (json.success) {
        // Day5: 开启售后成本预�?�?完成
        markOnboardingDay(authFetch, 5);
        toast.success(costTodayRecord ? '成本数据已更�? : '成本数据已录�?);
        if (json.alert_triggered) {
          toast.warning(json.alert_message || '⚠️ 赔付环比大幅上涨，请注意检�?);
        }
        await fetchCostData();
      } else {
        toast.error(json.error || '录入失败');
      }
    } catch (err) {
      console.error('[cost-alert] handleSubmitCost error:', err);
      toast.error('网络错误，请重试');
    } finally {
      setCostSubmitting(false);
    }
  };

  /* ─── 批量导入成本数据 ─── */
  const handleBatchImport = async () => {
    if (!profile?.companyId || !batchText.trim()) return;
    setBatchImporting(true);
    setBatchResults([]);

    const lines = batchText.trim().split('\n').filter(l => l.trim());
    const results: Array<{ line: number; date: string; amount: string; status: 'ok' | 'error'; msg: string }> = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (i === 0 && (cols[0]?.includes('日期') || cols[0]?.toLowerCase()?.includes('date'))) {
        continue;
      }
      const dateStr = cols[0]?.trim();
      const amountStr = cols[1]?.trim();
      const workOrdersStr = cols[2]?.trim();
      const refundsStr = cols[3]?.trim();
      const noteStr = cols[4]?.trim();

      if (!dateStr || !dateRegex.test(dateStr)) {
        results.push({ line: i + 1, date: dateStr || '', amount: amountStr || '', status: 'error', msg: '日期格式错误，需YYYY-MM-DD' });
        continue;
      }
      const amount = parseFloat(amountStr);
      if (!amountStr || isNaN(amount) || amount < 0) {
        results.push({ line: i + 1, date: dateStr, amount: amountStr || '', status: 'error', msg: '金额格式错误' });
        continue;
      }

      try {
        const res = await authFetch('/api/cost-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: profile.companyId,
            record_date: dateStr,
            total_cost: amount,
            work_order_count: workOrdersStr ? parseInt(workOrdersStr) : null,
            refund_count: refundsStr ? parseInt(refundsStr) : null,
            note: noteStr || null,
            created_by: profile.id,
          }),
        });
        const json = await res.json();
        if (json.success) {
          results.push({ line: i + 1, date: dateStr, amount: amountStr, status: 'ok', msg: '导入成功' });
        } else {
          results.push({ line: i + 1, date: dateStr, amount: amountStr, status: 'error', msg: json.error || '导入失败' });
        }
      } catch {
        results.push({ line: i + 1, date: dateStr, amount: amountStr, status: 'error', msg: '网络错误' });
      }
    }

    setBatchResults(results);
    setBatchImporting(false);

    const okCount = results.filter(r => r.status === 'ok').length;
    const errCount = results.filter(r => r.status === 'error').length;
    if (okCount > 0) {
      toast.success(`成功导入 ${okCount} 条记�?{errCount > 0 ? `�?{errCount} 条失败` : ''}`);
      fetchCostData();
    } else if (errCount > 0) {
      toast.error(`全部 ${errCount} 条导入失败，请检查格式`);
    }
  };

  // Permission guard - after all hooks
  if (!profile) return null;
  const lockedMsg = (role === 'staff' || role === 'personal_user')
    ? '解锁专业版即可使用成本预警功�?
    : null;
  if (lockedMsg) {
    return <PermissionLocked title="成本预警" description={lockedMsg} />;
  }

  // 智能预警图表数据
  const chartData = controlData?.dataPoints[selectedField] || [];
  const hasAnomaly = controlData?.alerts && controlData.alerts.length > 0;

  /* ─── 三维框架指标统计 ─── */
  const achievedCount = MOCK_ALERT_RESULTS.filter(r => isAchieved3D(r.target, r.actual, r.inverse)).length;
  const achieveRate = Math.round((achievedCount / MOCK_ALERT_RESULTS.length) * 100);
  const failedMetrics = MOCK_ALERT_RESULTS.filter(r => !isAchieved3D(r.target, r.actual, r.inverse));

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <Link href="/" className="text-muted-foreground hover:text-blue-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">成本预警</h1>
            {isEnterprise && (
              <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="w-3 h-3" />
                智能预警
              </span>
            )}
          </div>
          <PageHint text="花超了马上知道——超出预算自动提醒，不等到月底才发现�? />
          <DataSecurityBadge />
        </div>
        {isEnterprise && (
          <button onClick={handleExportCda} disabled={exportingCda}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-md transition-all">
            {exportingCda ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            导出CDA分析报告
          </button>
        )}
      </div>

      {/* ══════════════�?🎯 预警目标（管控红线） ══════════════�?*/}
      <div className="py-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <span className="text-3xl">🎯</span> 预警目标
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MOCK_ALERT_GOALS.map((g) => {
            const result = MOCK_ALERT_RESULTS.find(r => r.metric === g.metric);
            const actual = result?.actual ?? 0;
            const status = result ? getStatus3D(g.target, actual, g.inverse) : 'yellow';
            return (
              <div key={g.metric} className={`rounded-xl border-2 p-5 ${STATUS_BG[status]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-800">{g.metric}</span>
                  <span className="text-2xl">{STATUS_LIGHT[status]}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{g.target}{g.unit}</div>
                <div className={`text-base mt-1 ${STATUS_TEXT[status]}`}>
                  {status === 'green' ? '�?达标' : status === 'yellow' ? '⚠️ 接近' : '�?超标'}
                  {result && <span className="ml-1">（实�?{actual}{g.unit}�?/span>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-base text-gray-500 mt-3">💡 管控红线可在经营工具箱中配置</p>
      </div>

      <hr className="border-gray-200" />

      {/* ══════════════�?🛤�?异常处理路径 ══════════════�?*/}
      <div className="py-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <span className="text-3xl">🛤�?/span> 异常处理路径
        </h2>
        <div className="space-y-3">
          {MOCK_ALERT_PATHS.map((p, i) => {
            const color = PATH_TYPE_COLORS[p.type] || PATH_TYPE_COLORS['排查'];
            const statusColor = PATH_STATUS_COLORS[p.status] || PATH_STATUS_COLORS['执行�?];
            return (
              <div key={i} className="flex items-start gap-4 bg-white rounded-xl border p-4">
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-3 h-3 rounded-full ${p.type === '发现' ? 'bg-red-500' : p.type === '排查' ? 'bg-amber-500' : p.type === '处理' ? 'bg-blue-500' : 'bg-green-500'}`} />
                  {i < MOCK_ALERT_PATHS.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${color.bg} ${color.text}`}>{p.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>{p.status}</span>
                  </div>
                  <p className="text-base text-gray-800">{p.description}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
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

      {/* ══════════════�?📊 预警结果 ══════════════�?*/}
      <div className="py-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <span className="text-3xl">📊</span> 预警结果
        </h2>

        {/* 达标率总览 */}
        <div className="bg-white rounded-xl border p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold">管控达标�?/span>
            <span className="text-2xl font-bold text-blue-800">{achieveRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${achieveRate}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-base">
            <span className="text-green-700 font-bold">�?达标 {achievedCount}�?/span>
            <span className="text-red-700 font-bold">�?超标 {MOCK_ALERT_RESULTS.length - achievedCount}�?/span>
          </div>
        </div>

        {/* 目标vs实际对比 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {MOCK_ALERT_RESULTS.map((r) => {
            const status = getStatus3D(r.target, r.actual, r.inverse);
            const achieved = isAchieved3D(r.target, r.actual, r.inverse);
            const ratio = r.inverse
              ? Math.min(100, Math.round((r.target / r.actual) * 100))
              : Math.min(100, Math.round((r.actual / r.target) * 100));
            return (
              <div key={r.metric} className={`rounded-xl border-2 p-5 ${STATUS_BG[status]}`}>
                <div className="text-lg font-bold text-gray-800 mb-2">{r.metric}</div>
                <div className="text-3xl font-bold text-gray-900">{r.actual}{r.unit}</div>
                <div className="text-base text-gray-500">红线 {r.target}{r.unit}</div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div className={`h-2.5 rounded-full ${achieved ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${ratio}%` }} />
                </div>
                <div className={`text-base mt-1 font-bold ${STATUS_TEXT[status]}`}>
                  {achieved ? '�?达标' : '�?超标'} ({ratio}%)
                </div>
                {!achieved && (
                  <button onClick={() => setExpandedReview(expandedReview === r.metric ? null : r.metric)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 text-base font-bold mt-2">
                    ⚠️ 超标 �?查看复盘
                    {expandedReview === r.metric ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
                {expandedReview === r.metric && (
                  <div className="mt-3 p-4 bg-white rounded-lg border space-y-2">
                    <div className="text-base font-bold text-gray-800 mb-2">📋 8问复盘：{r.metric}</div>
                    {REVIEW_QUESTIONS_3D.map((q, qi) => (
                      <div key={qi} className="text-base text-gray-700">
                        <span className="font-medium">{q}</span>
                        <div className="text-sm text-gray-400 mt-0.5">待填�?..</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 触警统计 */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-xl border p-5 text-center">
            <div className="text-base text-gray-500 mb-1">本月触警次数</div>
            <div className="text-4xl font-bold text-red-700">3�?/div>
          </div>
          <div className="bg-white rounded-xl border p-5 text-center">
            <div className="text-base text-gray-500 mb-1">已处�?/div>
            <div className="text-4xl font-bold text-green-700">2�?/div>
          </div>
          <div className="bg-white rounded-xl border p-5 text-center">
            <div className="text-base text-gray-500 mb-1">复发�?/div>
            <div className="text-4xl font-bold text-amber-700">33%</div>
          </div>
        </div>

        {/* 处理结果详情 */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-bold mb-4">📊 触警处理结果</h3>
          <div className="space-y-3">
            {[
              { date: '5�?8�?, reason: '物流破损率飙�?, result: '已处�?, prevention: '更换包装方案' },
              { date: '5�?5�?, reason: '促销退款激�?, result: '已处�?, prevention: '退款审核加�? },
              { date: '5�?0�?, reason: '物流破损率飙�?, result: '复发', prevention: '需升级物流合作�? },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${item.result === '复发' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <span className="text-base font-bold text-gray-700 w-20">{item.date}</span>
                <span className="text-base text-gray-800 flex-1">{item.reason}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.result === '复发' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.result}</span>
                <span className="text-base text-gray-500">{item.prevention}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* 首次使用引导 */}
      {costRecords.length === 0 && (
        <div className="p-5 bg-white border-2 border-dashed border-blue-300 rounded-xl">
          <h3 className="text-base font-bold text-gray-900 mb-3">首次使用�?步搞定成本录�?/h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm font-medium text-gray-900">下载导入模板</p>
                <p className="text-xs text-gray-500">包含表头和示例行，照着填就�?/p>
                <button onClick={() => {
                  const tsv = '日期\t金额\t工单数\t退款数\t备注\n2025-01-15\t580\t3\t1\t大促期间售后增加\n2025-01-16\t320\t2\t0\t正常水平';
                  const blob = new Blob([tsv], { type: 'text/plain;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = '成本录入模板.txt'; a.click();
                  URL.revokeObjectURL(url);
                }} className="mt-1 inline-flex items-center gap-1 text-xs text-[#2B7DE9] hover:underline font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> 下载模板
                </button>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm font-medium text-gray-900">填入你的数据</p>
                <p className="text-xs text-gray-500">每天一行：日期、金额、工单数、退款数</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">3</span>
              <div>
                <p className="text-sm font-medium text-gray-900">一键导�?/p>
                <p className="text-xs text-gray-500">点击下方「批量导入」按钮，粘贴或上传填好的数据</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 旗舰版专属：控制图异常检�?════════ */}
      {isEnterprise && (
        <div className="space-y-4">
          {/* 数据不足提示 */}
          {controlData && !controlData.dataSufficient && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
              <div className="text-sm text-sky-800">
                <span className="font-medium">数据积累�?/span>，当前使用固定阈值预警（环比增长超过30%报警）。录�?个月以上数据后自动切换为智能预警�?
              </div>
            </div>
          )}

          {/* 异常告警列表 */}
          {hasAnomaly && (
            <div className="rounded-xl shadow-md border border-red-200 bg-red-50/50 p-5">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                异常告警
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-600 text-white rounded-full">
                  {controlData!.alerts.length}
                </span>
              </h3>
              <div className="space-y-2">
                {controlData!.alerts.slice(0, 8).map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-lg border border-red-100 bg-white p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-800">{alert.type}异常</div>
                      <div className="text-xs text-red-600 mt-0.5">{alert.message}</div>
                      <div className="text-xs text-gray-500 mt-0.5">归因：{alert.contribution}</div>
                    </div>
                  </div>
                ))}
                {controlData!.alerts.length > 8 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    还有 {controlData!.alerts.length - 8} 条告�?..
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 控制�?*/}
          <div className="rounded-xl shadow-md border border-blue-100 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                成本控制�?
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  controlData?.method === 'control_chart'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {controlData?.method === 'control_chart' ? '智能预警' : '固定阈�?}
                </span>
              </h3>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
              >
                {Object.entries(COST_FIELD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {controlLoading ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                加载�?..
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 13, borderRadius: 8 }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        value: COST_FIELD_LABELS[selectedField] || '实际�?,
                        ucl: 'UCL(上控制线)',
                        lcl: 'LCL(下控制线)',
                        mean: '均�?,
                      };
                      return [`¥${value.toLocaleString()}`, labels[name] || name];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="line"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  {controlData?.method === 'control_chart' && (
                    <>
                      <ReferenceLine y={chartData[0]?.ucl} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'UCL', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                      <ReferenceLine y={chartData[0]?.lcl} stroke="#3b82f6" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'LCL', position: 'right', fontSize: 10, fill: '#3b82f6' }} />
                    </>
                  )}
                  <Line type="monotone" dataKey="mean" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="均�? />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1e3a5f"
                    strokeWidth={2.5}
                    name={COST_FIELD_LABELS[selectedField] || '实际�?}
                    dot={(props: Record<string, unknown>) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: ControlDataPoint };
                      if (payload?.isAnomaly) {
                        return (
                          <circle key={`dot-${payload.month}`} cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                        );
                      }
                      return (
                        <circle key={`dot-${payload.month}`} cx={cx} cy={cy} r={3} fill="#38bdf8" stroke="#fff" strokeWidth={1} />
                      );
                    }}
                    activeDot={{ r: 6, stroke: '#1e3a5f', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                暂无数据，请先在经营工具箱中录入月度数据
              </div>
            )}
          </div>
        </div>
      )}

      {/* 今日概览 5卡片 */}
      {(() => {
        let avgCostPerOrder: string = '�?;
        try {
          const saved = localStorage.getItem('business-tools-public-costs');
          if (saved) {
            const data = JSON.parse(saved);
            const monthlyOrders = Number(data.orderQuantity) || 0;
            const dailyOrders = monthlyOrders / 30;
            const monthTotal = costStats?.month_total;
            if (dailyOrders > 0 && monthTotal != null) {
              avgCostPerOrder = `¥${(monthTotal / dailyOrders).toFixed(2)}`;
            }
          }
        } catch { /* ignore */ }
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="rounded-xl shadow-md border border-blue-100 bg-gradient-to-br from-red-50 to-white p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-xs text-muted-foreground mb-1">今日赔付金额</div>
              <div className="text-3xl font-bold text-red-700">
                {costStats?.today != null ? `¥${costStats.today.toLocaleString()}` : '�?}
              </div>
            </div>
            <div className="rounded-xl shadow-md border border-blue-100 bg-gradient-to-br from-slate-50 to-white p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-xs text-muted-foreground mb-1">环比变化</div>
              <div className={`text-3xl font-bold ${costStats?.yesterday_change_percent != null ? (costStats.yesterday_change_percent >= 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}>
                {costStats?.yesterday_change_percent != null
                  ? `${costStats.yesterday_change_percent >= 0 ? '�? : '�?}${Math.abs(costStats.yesterday_change_percent)}%`
                  : '�?}
              </div>
            </div>
            <div className="rounded-xl shadow-md border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-xs text-muted-foreground mb-1">本月累计赔付</div>
              <div className="text-3xl font-bold text-blue-950">
                {costStats?.month_total != null ? `¥${costStats.month_total.toLocaleString()}` : '�?}
              </div>
            </div>
            <div className="rounded-xl shadow-md border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-xs text-muted-foreground mb-1">本月日均赔付</div>
              <div className="text-3xl font-bold text-blue-700">
                {costStats?.month_avg != null ? `¥${costStats.month_avg.toLocaleString()}` : '�?}
              </div>
            </div>
            <div className="rounded-xl shadow-md border border-blue-100 bg-gradient-to-br from-sky-50 to-white p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-xs text-muted-foreground mb-1">单均售后成本</div>
              <div className="text-3xl font-bold text-sky-600">{avgCostPerOrder}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">月累计÷日均订单量</div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 数据录入 */}
        <div className="rounded-xl shadow-md border border-blue-100 bg-white p-6 space-y-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardEdit className="w-5 h-5 text-sky-400" />
            售后成本录入
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-xs h-7 gap-1 border-[#0F2B46] text-[#0F2B46] hover:bg-[#0F2B46] hover:text-white active:scale-95 transition-all duration-200"
              onClick={() => { setShowBatchImport(true); setBatchText(''); setBatchResults([]); }}
            >
              <Upload className="w-3.5 h-3.5" />
              批量导入
            </Button>
          </h3>
          <div>
            <label className="block text-xs font-medium mb-1">日期 <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={costDate}
              max={new Date().toISOString().slice(0, 10)}
              min={new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)}
              onChange={(e) => setCostDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">赔付总额（元�?span className="text-red-500">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costAmount}
              onChange={(e) => setCostAmount(e.target.value)}
              placeholder="请输入今日售后赔付总金�?
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">工单数量（选填�?/label>
              <input
                type="number"
                min="0"
                value={costWorkOrders}
                onChange={(e) => setCostWorkOrders(e.target.value)}
                placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">退款订单数（选填�?/label>
              <input
                type="number"
                min="0"
                value={costRefunds}
                onChange={(e) => setCostRefunds(e.target.value)}
                placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">备注说明（选填，最�?00字）</label>
            <textarea
              value={costNote}
              onChange={(e) => setCostNote(e.target.value.slice(0, 200))}
              className="w-full border rounded-lg p-3 text-sm h-16 resize-none focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all duration-200"
              placeholder="今日赔付原因备注..."
            />
            <div className="text-xs text-right text-muted-foreground mt-0.5">{costNote.length}/200</div>
          </div>
          <Button
            onClick={handleSubmitCost}
            disabled={costSubmitting || !costAmount || !costDate}
            className="w-full bg-blue-900 hover:bg-blue-950 active:scale-95 text-white transition-all duration-200"
          >
            {costSubmitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />提交�?/> : costTodayRecord ? '更新' : '录入'}
          </Button>
        </div>

        {/* 30天趋势图 */}
        <div className="rounded-xl shadow-md border border-blue-100 bg-white p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            �?0天赔付趋�?
          </h3>
          {costRecords.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={costRecords.map(r => ({
                date: r.record_date.slice(5),
                赔付金额: r.total_cost,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`¥${v}`, '赔付金额']} />
                <Line type="monotone" dataKey="赔付金额" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3, fill: '#38bdf8' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">暂无数据，录入后展示趋势</div>
          )}
        </div>
      </div>

      {/* 预警记录列表 */}
      {costAlerts.length > 0 && (
        <div className="rounded-xl shadow-md border border-blue-100 bg-white p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            预警记录
          </h3>
          <div className="space-y-3">
            {costAlerts.map(alert => (
              <div key={alert.id} className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-red-800">{alert.title}</div>
                    <div className="text-xs text-red-600 mt-0.5">{alert.content}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString('zh-CN')}</div>
                  </div>
                </div>
                {/* 已有复盘记录 */}
                {reviews.find(r => r.alert_date === alert.created_at.slice(0, 10)) ? (
                  <div className="mt-3 ml-7 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-xs font-medium text-blue-800 mb-1">复盘记录</div>
                    <div className="text-xs text-blue-700">原因：{reviews.find(r => r.alert_date === alert.created_at.slice(0, 10))!.reason_category}</div>
                    {reviews.find(r => r.alert_date === alert.created_at.slice(0, 10))!.reason_desc && (
                      <div className="text-xs text-blue-600 mt-0.5">{reviews.find(r => r.alert_date === alert.created_at.slice(0, 10))!.reason_desc}</div>
                    )}
                    {reviews.find(r => r.alert_date === alert.created_at.slice(0, 10))!.prevention && (
                      <div className="text-xs text-green-700 mt-1">预防方案：{reviews.find(r => r.alert_date === alert.created_at.slice(0, 10))!.prevention}</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 ml-7">
                    <button
                      type="button"
                      onClick={() => setReviewModal({ date: alert.created_at.slice(0, 10), reasonCategory: '', reasonDesc: '', prevention: '' })}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Pencil className="w-3 h-3" />
                      记录原因
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {costRecords.length > 0 && (
        <div className="rounded-xl shadow-md border border-blue-100 bg-white p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-gray-500" />
            历史记录
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">日期</th>
                  <th className="pb-2 pr-4">赔付金额</th>
                  <th className="pb-2 pr-4">工单�?/th>
                  <th className="pb-2 pr-4">退款数</th>
                  <th className="pb-2">备注</th>
                </tr>
              </thead>
              <tbody>
                {costRecords.slice().reverse().slice(0, 30).map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-mono text-xs">{r.record_date}</td>
                    <td className="py-2 pr-4 font-semibold text-red-600">¥{r.total_cost.toLocaleString()}</td>
                    <td className="py-2 pr-4">{r.work_order_count ?? '�?}</td>
                    <td className="py-2 pr-4">{r.refund_count ?? '�?}</td>
                    <td className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">{r.note || '�?}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════ 预警复盘 ════════ */}
      {role === 'enterprise_admin' || role === 'enterprise_manager' ? (
        <div className="mt-6 bg-white rounded-xl border shadow-sm p-5">
          <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            预警复盘
            <span className="text-xs font-normal text-muted-foreground">最�?个月已复盘的预警记录</span>
          </h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">暂无复盘记录，触发预警后可记录原因和预防方案</p>
          ) : (
            <div className="mt-3 space-y-3">
              {/* 高频原因提示 */}
              {(() => {
                const catCount: Record<string, number> = {};
                (Array.isArray(reviews) ? reviews : []).forEach(r => { catCount[r.reason_category] = (catCount[r.reason_category] || 0) + 1; });
                const highFreq = Object.entries(catCount).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
                return highFreq.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800">
                      ⚠️ 高频原因预警：{highFreq.map(([cat, c]) => `�?{cat}」已出现${c}次`).join('�?)}，建议重点关�?
                    </p>
                  </div>
                ) : null;
              })()}
              {/* 复盘记录列表 */}
              {reviews.map(review => (
                <div key={review.id} className="border rounded-lg p-3 hover:bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">{new Date(review.alert_date).toLocaleDateString('zh-CN')}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{review.reason_category}</span>
                  </div>
                  {review.reason_desc && (
                    <p className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">原因�?/span>{review.reason_desc}
                    </p>
                  )}
                  {review.prevention && (
                    <p className="text-sm text-green-700">
                      <span className="font-medium">预防方案�?/span>{review.prevention}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ════════ 批量导入成本数据 Dialog ════════ */}
      <Dialog open={showBatchImport} onOpenChange={setShowBatchImport}>
        <DialogContent className="max-w-lg animate-fade-in-scale">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-sky-400" />
              批量导入成本数据
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p className="font-medium">从Excel复制数据粘贴到下方，列用Tab分隔�?/p>
              <p className="text-muted-foreground">格式：日�?| 金额 | 工单�?| 退款数 | 备注</p>
              <div className="mt-2 font-mono bg-background rounded p-2 border">
                <p>2025-07-01{'\t'}350.00{'\t'}5{'\t'}1{'\t'}安装破损赔付</p>
                <p>2025-07-02{'\t'}120.50{'\t'}3{'\t'}0{'\t'}物流损坏</p>
                <p>2025-07-03{'\t'}800.00{'\t'}8{'\t'}2</p>
              </div>
            </div>

            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="从Excel选中多行数据 �?Ctrl+C复制 �?在此Ctrl+V粘贴"
              className="w-full border rounded-lg p-3 text-sm h-40 font-mono resize-none focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all duration-200"
            />

            {batchResults.length > 0 && (
              <div className="rounded-lg border max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground">
                      <th className="py-1.5 px-2 text-left">�?/th>
                      <th className="py-1.5 px-2 text-left">日期</th>
                      <th className="py-1.5 px-2 text-left">金额</th>
                      <th className="py-1.5 px-2 text-left">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((r, idx) => (
                      <tr key={idx} className={`border-b last:border-0 ${r.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        <td className="py-1 px-2">{r.line}</td>
                        <td className="py-1 px-2 font-mono">{r.date}</td>
                        <td className="py-1 px-2">{r.amount}</td>
                        <td className="py-1 px-2">{r.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchImport(false)} disabled={batchImporting}>
              关闭
            </Button>
            <Button
              onClick={handleBatchImport}
              disabled={batchImporting || !batchText.trim()}
              className="bg-blue-900 hover:bg-blue-950 active:scale-95 text-white transition-all duration-200"
            >
              {batchImporting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />导入�?..</> : <><Upload className="w-4 h-4 mr-1" />导入</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 复盘弹窗 ===== */}
      {reviewModal && (
        <Dialog open onOpenChange={() => setReviewModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>记录预警原因 �?{reviewModal.date}</DialogTitle>
              <DialogDescription>记录原因和预防方案，帮助团队避免同类问题</DialogDescription>
            </DialogHeader>
            <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">原因分类</label>
                <select
                  value={reviewModal.reasonCategory}
                  onChange={e => setReviewModal(prev => prev ? { ...prev, reasonCategory: e.target.value } : null)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {REASON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">原因描述</label>
                <textarea
                  value={reviewModal.reasonDesc}
                  onChange={e => setReviewModal(prev => prev ? { ...prev, reasonDesc: e.target.value } : null)}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none"
                  placeholder="描述触发预警的具体原�?.."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">预防方案</label>
                <textarea
                  value={reviewModal.prevention}
                  onChange={e => setReviewModal(prev => prev ? { ...prev, prevention: e.target.value } : null)}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none"
                  placeholder="下次如何避免同类问题..."
                />
              </div>
            </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewModal(null)}>取消</Button>
              <Button
                onClick={async () => {
                  if (!reviewModal.reasonCategory) return;
                  try {
                    const res = await authFetch('/api/cost-alert-reviews', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        alertDate: reviewModal.date,
                        reasonCategory: reviewModal.reasonCategory,
                        reasonDesc: reviewModal.reasonDesc,
                        prevention: reviewModal.prevention,
                      }),
                    });
                    if (res.ok) {
                      setReviewModal(null);
                      await fetchReviews();
                    }
                  } catch { /* ignore */ }
                }}
                disabled={!reviewModal.reasonCategory}
                className="bg-blue-900 hover:bg-blue-950 text-white"
              >
                保存复盘
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
