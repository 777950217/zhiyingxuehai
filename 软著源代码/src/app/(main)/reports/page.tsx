'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText, TrendingUp, AlertTriangle, CheckCircle, Info,
  BarChart3, Loader2, RefreshCw, ChevronRight, FileDown, Printer,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from 'recharts';
import { PermissionLocked } from '@/components/permission-locked';

/* ─── 类型 ─── */
interface Insight {
  type: 'warning' | 'good' | 'trend';
  text: string;
}

interface Report {
  id: string;
  company_id: string;
  type: string;
  title: string;
  period_start: string;
  period_end: string;
  summary: string;
  data: Record<string, unknown>;
  insights: Insight[];
  created_at: string;
}

type TabType = 'cost_weekly' | 'quality_weekly' | 'workorder_weekly' | 'ai_monthly';

const TABS: Array<{ key: TabType; label: string; icon: React.ReactNode; staffVisible: boolean }> = [
  { key: 'cost_weekly', label: '成本周报', icon: <FileText className="h-4 w-4" />, staffVisible: false },
  { key: 'quality_weekly', label: '质检周报', icon: <BarChart3 className="h-4 w-4" />, staffVisible: false },
  { key: 'workorder_weekly', label: '工单周报', icon: <FileText className="h-4 w-4" />, staffVisible: false },
  { key: 'ai_monthly', label: 'AI月报', icon: <TrendingUp className="h-4 w-4" />, staffVisible: true },
];

const CHART_COLORS = ['#0ea5e9', '#2563eb', '#7dd3fc', '#1d4ed8', '#38bdf8'];

const INSIGHT_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  warning: { bg: 'bg-red-50', border: 'border-l-4 border-red-400', icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
  good: { bg: 'bg-emerald-50', border: 'border-l-4 border-emerald-400', icon: <CheckCircle className="h-4 w-4 text-emerald-500" /> },
  trend: { bg: 'bg-sky-50', border: 'border-l-4 border-sky-400', icon: <Info className="h-4 w-4 text-sky-500" /> },
};

export default function ReportsPage() {
  const { profile, authFetch } = useAuth();
  const role = profile?.role || 'staff';
  const isStaff = role === 'staff' || role === 'personal_user';
  const companyId = profile?.companyId || '';

  const [activeTab, setActiveTab] = useState<TabType>('cost_weekly');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // 导出相关状�?
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'latest' | 'custom'>('all');
  const [exportTypes, setExportTypes] = useState<Record<string, boolean>>({
    cost_weekly: true, quality_weekly: true, workorder_weekly: true, ai_monthly: true,
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReports = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/reports/list?company_id=${companyId}&type=${activeTab}`);
      const json = await res.json();
      if (json.data) {
        setReports(json.data);
        setSelectedReport(json.data[0] || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [companyId, activeTab, authFetch]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await authFetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, company_id: companyId }),
      });
      await fetchReports();
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  /* ─── 导出逻辑 ─── */
  const getExportReportIds = (): string[] => {
    const filtered = reports.filter(r => exportTypes[r.type]);
    if (exportScope === 'all') return filtered.map(r => r.id);
    if (exportScope === 'latest') {
      // 每种类型取最新一�?
      const latest = new Map<string, Report>();
      for (const r of filtered) {
        const existing = latest.get(r.type);
        if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
          latest.set(r.type, r);
        }
      }
      return Array.from(latest.values()).map(r => r.id);
    }
    return filtered.map(r => r.id); // custom same as all for now
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const ids = getExportReportIds();
      if (ids.length === 0) { setExporting(false); return; }
      const res = await authFetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'xlsx', report_ids: ids, company_id: companyId }),
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `职盈学海_数据报告_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    // HTML 打印方案：创建隐藏打印区域，调用 window.print()
    const printArea = printRef.current;
    if (!printArea) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>职盈学海数据报告</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 40px; }
          h1 { font-size: 24px; color: #1e3a5f; border-bottom: 2px solid #0ea5e9; padding-bottom: 8px; }
          h2 { font-size: 18px; color: #1e3a5f; margin-top: 24px; }
          h3 { font-size: 14px; color: #475569; }
          .cover { text-align: center; padding: 60px 0 40px; }
          .cover h1 { font-size: 32px; border: none; }
          .cover p { color: #64748b; font-size: 14px; margin-top: 8px; }
          .report-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
          .insight { padding: 8px 12px; border-radius: 4px; margin: 4px 0; font-size: 13px; }
          .insight-warning { background: #fef2f2; border-left: 3px solid #f87171; }
          .insight-good { background: #f0fdf4; border-left: 3px solid #4ade80; }
          .insight-trend { background: #f0f9ff; border-left: 3px solid #38bdf8; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="cover">
          <h1>职盈学海 数据报告</h1>
          <p>${profile?.displayName || '企业'} · ${new Date().toLocaleDateString('zh-CN')}</p>
        </div>
        ${buildPrintContent(reports.filter(r => exportTypes[r.type]), exportScope)}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
    setExportOpen(false);
  };

  const handleExport = () => {
    if (exportFormat === 'pdf') {
      handleExportPDF();
    } else {
      handleExportExcel();
    }
  };

  // 权限：staff只能看AI月报
  if (isStaff && activeTab !== 'ai_monthly') {
    // 不切换tab，直接显示锁�?
    return (
      <div className="p-6 animate-fade-in-up">
        <PermissionLocked
          title="数据报告"
          description="升级至主管版即可解锁完整报告功能，包含成本周报、质检周报、工单周报等"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">数据报告</h1>
          <p className="text-sm text-slate-500 mt-1">自动生成业务洞察，辅助管理决�?/p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setExportOpen(true)}
            className="border-blue-800 text-blue-800 hover:bg-blue-50"
          >
            <FileDown className="h-4 w-4 mr-2" />
            导出报告
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white"
          >
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            生成报告
          </Button>
        </div>
      </div>

      {/* Tab�?*/}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {TABS.filter(t => !isStaff || t.staffVisible).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedReport(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-900 text-white'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-900" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>暂无报告，点�?生成报告"创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：报告内�?*/}
          <div className="lg:col-span-2 space-y-6">
            {selectedReport ? (
              <>
                {/* 报告摘要卡片 */}
                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-sky-400">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-blue-900">{selectedReport.title}</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {selectedReport.period_start} ~ {selectedReport.period_end}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(selectedReport.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="mt-4 text-slate-700 leading-relaxed">{selectedReport.summary}</p>
                </div>

                {/* 图表区域 */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-sm font-semibold text-blue-900 mb-4">数据趋势</h3>
                  <ReportChart type={activeTab} data={selectedReport.data} />
                </div>

                {/* 洞察列表 */}
                {selectedReport.insights && selectedReport.insights.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-4">关键洞察</h3>
                    <div className="space-y-3">
                      {selectedReport.insights.map((insight, i) => {
                        const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.trend;
                        return (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} ${style.border}`}>
                            {style.icon}
                            <span className="text-sm text-slate-700">{insight.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-10 text-center text-slate-400">
                选择一份报告查看详�?
              </div>
            )}
          </div>

          {/* 右侧：历史报告列�?*/}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500">历史报告</h3>
            {reports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedReport?.id === r.id
                    ? 'border-sky-400 bg-sky-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow'
                }`}
              >
                <p className="text-sm font-medium text-blue-900 truncate">{r.title}</p>
                <p className="text-xs text-slate-500 mt-1">{r.period_start} ~ {r.period_end}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 隐藏打印区域（PDF用） */}
      <div ref={printRef} className="hidden" />

      {/* 导出弹窗 */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-900">导出报告</DialogTitle>
          </DialogHeader>

          <DialogBody>
          <div className="space-y-5 py-2">
            {/* 导出范围 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">导出范围</p>
              <div className="space-y-2">
                {([['all', '导出所有报�?], ['latest', '导出最近一期报�?], ['custom', '自选报�?]] as const).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === val}
                      onChange={() => setExportScope(val)}
                      className="accent-blue-900"
                    />
                    <span className="text-sm text-slate-600">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 报告类型筛�?*/}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">报告类型</p>
              <div className="grid grid-cols-2 gap-2">
                {TABS.map(tab => (
                  <label key={tab.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={exportTypes[tab.key]}
                      onCheckedChange={(checked) => setExportTypes(prev => ({ ...prev, [tab.key]: !!checked }))}
                    />
                    <span className="text-sm text-slate-600">{tab.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 导出格式 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">导出格式</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportFormat"
                    checked={exportFormat === 'pdf'}
                    onChange={() => setExportFormat('pdf')}
                    className="accent-blue-900"
                  />
                  <Printer className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">PDF（打印另存）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportFormat"
                    checked={exportFormat === 'xlsx'}
                    onChange={() => setExportFormat('xlsx')}
                    className="accent-blue-900"
                  />
                  <FileDown className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Excel</span>
                </label>
              </div>
              {exportFormat === 'pdf' && (
                <p className="text-xs text-slate-400 mt-1">点击导出后将在新窗口打开打印预览，选择"另存为PDF"即可保存</p>
              )}
            </div>
          </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)} className="border-slate-300">取消</Button>
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white"
            >
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── PDF 打印内容生成 ─── */
function buildPrintContent(reports: Report[], scope: string): string {
  const typeNames: Record<string, string> = {
    cost_weekly: '成本周报', quality_weekly: '质检周报',
    workorder_weekly: '工单周报', ai_monthly: 'AI月报',
  };
  const filtered = scope === 'latest'
    ? (() => {
        const latest = new Map<string, Report>();
        for (const r of reports) {
          const existing = latest.get(r.type);
          if (!existing || new Date(r.created_at) > new Date(existing.created_at)) latest.set(r.type, r);
        }
        return Array.from(latest.values());
      })()
    : reports;

  if (filtered.length === 0) return '<p style="text-align:center;color:#94a3b8;">暂无报告数据</p>';

  return filtered.map(r => {
    const insights = (r.insights || []) as Insight[];
    const insightHtml = insights.map(ins => {
      const cls = ins.type === 'warning' ? 'insight-warning' : ins.type === 'good' ? 'insight-good' : 'insight-trend';
      const tag = ins.type === 'warning' ? '�?预警' : ins.type === 'good' ? '�?正面' : '�?趋势';
      return `<div class="insight ${cls}"><strong>${tag}</strong> ${ins.text}</div>`;
    }).join('');

    // 展平 data 为表�?
    const dataRows = flattenDataForPrint(r.data || {});
    const dataHtml = dataRows.length > 0
      ? `<table><tr><th>指标</th><th>�?/th></tr>${dataRows.map(d => `<tr><td>${d.key}</td><td>${d.value}</td></tr>`).join('')}</table>`
      : '';

    return `
      <div class="report-card">
        <h2>${r.title}</h2>
        <p style="color:#64748b;font-size:13px;">${r.period_start} ~ ${r.period_end} · ${typeNames[r.type] || r.type}</p>
        ${r.summary ? `<p style="margin:12px 0;padding:10px;background:#f0f9ff;border-radius:6px;font-size:14px;">💡 ${r.summary}</p>` : ''}
        ${insightHtml ? `<h3>洞察</h3>${insightHtml}` : ''}
        ${dataHtml ? `<h3>原始数据</h3>${dataHtml}` : ''}
      </div>
    `;
  }).join('');
}

function flattenDataForPrint(obj: Record<string, unknown>, prefix = ''): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flattenDataForPrint(v as Record<string, unknown>, fullKey));
    } else if (Array.isArray(v)) {
      rows.push({ key: fullKey, value: v.length > 0 ? JSON.stringify(v[0]) + (v.length > 1 ? ` ...�?{v.length}条` : '') : '[]' });
    } else {
      rows.push({ key: fullKey, value: String(v ?? '') });
    }
  }
  return rows;
}

/* ─── 图表子组�?─── */
function ReportChart({ type, data }: { type: TabType; data: Record<string, unknown> }) {
  if (!data) return <div className="text-center text-slate-400 py-8">暂无图表数据</div>;

  switch (type) {
    case 'cost_weekly':
      return <CostChart data={data} />;
    case 'quality_weekly':
      return <QualityChart data={data} />;
    case 'workorder_weekly':
      return <WorkorderChart data={data} />;
    case 'ai_monthly':
      return <AiChart data={data} />;
    default:
      return null;
  }
}

/* 成本周报图表 */
function CostChart({ data }: { data: Record<string, unknown> }) {
  const dailyData = (data.dailyData || []) as Array<{ date: string; cost: number; workOrders: number }>;
  const thisTotal = Number(data.thisTotal || 0);
  const lastTotal = Number(data.lastTotal || 0);
  const costChange = Number(data.costChange || 0);
  const refundRate = Number(data.refundRate || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="本周成本" value={`¥${thisTotal.toFixed(2)}`} change={costChange} />
        <StatCard label="上周成本" value={`¥${lastTotal.toFixed(2)}`} />
        <StatCard label="退款率" value={`${refundRate}%`} />
      </div>
      {dailyData.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="cost" stroke="#0ea5e9" strokeWidth={2} name="成本(¥)" />
            <Line type="monotone" dataKey="workOrders" stroke="#2563eb" strokeWidth={2} name="工单�? />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* 质检周报图表 */
function QualityChart({ data }: { data: Record<string, unknown> }) {
  const radarData = (data.radarData || []) as Array<{ dimension: string; score: number; fullMark: number }>;
  const dailyData = (data.dailyData || []) as Array<{ date: string; avg: number }>;
  const totalAvg = Number(data.totalAvg || 0);
  const count = Number(data.count || 0);
  const weakest = (data.weakest as string) || '-';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="质检均分" value={`${totalAvg}`} />
        <StatCard label="质检次数" value={`${count}`} />
        <StatCard label="最弱项" value={weakest} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {radarData.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Radar name="得分" dataKey="score" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        )}
        {dailyData.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={2} name="日均�? />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* 工单周报图表 */
function WorkorderChart({ data }: { data: Record<string, unknown> }) {
  const dailyData = (data.dailyData || []) as Array<{ date: string; created: number; completed: number }>;
  const categoryDist = (data.categoryDist || []) as Array<{ name: string; value: number }>;
  const total = Number(data.total || 0);
  const completionRate = Number(data.completionRate || 0);
  const pending = Number(data.pending || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="总工�? value={`${total}`} />
        <StatCard label="完成�? value={`${completionRate}%`} />
        <StatCard label="待处�? value={`${pending}`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dailyData.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="created" fill="#0ea5e9" name="新建" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="#2563eb" name="完成" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {categoryDist.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {categoryDist.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* AI月报图表 */
function AiChart({ data }: { data: Record<string, unknown> }) {
  const dailyData = (data.dailyData || []) as Array<{ date: string; count: number }>;
  const topQueries = (data.topQueries || []) as Array<{ query: string; count: number }>;
  const categoryDist = (data.categoryDist || []) as Array<{ name: string; value: number }>;
  const thisCount = Number(data.thisCount || 0);
  const helpfulRate = Number(data.helpfulRate || 0);
  const usageChange = Number(data.usageChange || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="本月使用" value={`${thisCount}次`} change={usageChange} />
        <StatCard label="有用�? value={`${helpfulRate}%`} />
        <StatCard label="环比变化" value={`${usageChange > 0 ? '+' : ''}${usageChange}%`} />
      </div>
      {dailyData.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#0ea5e9" name="使用次数" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {topQueries.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">高频问题 TOP{topQueries.length}</h4>
          <div className="space-y-2">
            {topQueries.map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${i < 3 ? 'bg-blue-900' : 'bg-slate-400'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-slate-700 truncate">{q.query}</span>
                <span className="text-slate-500">{q.count}�?/span>
              </div>
            ))}
          </div>
        </div>
      )}
      {categoryDist.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {categoryDist.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* 统计卡片 */
function StatCard({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="bg-blue-50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-blue-900">{value}</p>
      {change !== undefined && change !== 0 && (
        <p className={`text-xs mt-0.5 ${change > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
          {change > 0 ? '�? : '�?} {Math.abs(change)}%
        </p>
      )}
    </div>
  );
}
