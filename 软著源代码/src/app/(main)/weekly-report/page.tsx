'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import { TrendingUp, AlertTriangle, Zap, Lightbulb, Calendar, Mail, Download, FileSpreadsheet, Info, Target, Route, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface WeeklyReportData { id: string; weekStart: string; weekEnd: string; totalLoss: number; lossChangePercent: number | null; anomalyCount: number; anomalyDetails: { keyword: string; count: number }[]; aiSavingMinutes: number; aiUsageCount: number; suggestions: string | null; isRead: boolean }

/* ─── 复盘8�?─── */
const REVIEW_QUESTIONS = [
  '1. 这个指标未达标的核心原因是什么？',
  '2. 是偶发还是系统性问题？',
  '3. 哪个环节贡献了最大偏差？',
  '4. 有没有提前预警信号被忽略了？',
  '5. 当前措施是否有效缩小了偏差？',
  '6. 是否需要调整目标值？',
  '7. 下周最需要改变的一个动作是什么？',
  '8. 谁负责跟进？什么时间复查？',
];

/* ─── Mock: 周度资金管控目标 ─── */
const MOCK_GOALS = [
  { metric: '周赔付额', target: 3000, unit: '�?, inverse: true },
  { metric: '客诉�?, target: 2.0, unit: '%', inverse: true },
  { metric: '退款率', target: 3.0, unit: '%', inverse: true },
  { metric: 'AI提效时长', target: 120, unit: '分钟', inverse: false },
];

/* ─── Mock: 资金路径数据 ─── */
const MOCK_PATHS = [
  { type: '审批', description: '大额退款审批流程优化，缩短审批时长�?小时�?, relatedMetrics: ['周赔付额', '退款率'], status: '已完�? as const },
  { type: '培训', description: '客服退款话术培训，减少不必要退�?, relatedMetrics: ['退款率', '客诉�?], status: '已完�? as const },
  { type: '流程', description: '建立异常赔付预警机制，超500元自动标�?, relatedMetrics: ['周赔付额'], status: '进行�? as const },
  { type: '调整', description: '物流破损赔付标准下调，需提供照片凭证', relatedMetrics: ['周赔付额', '退款率'], status: '进行�? as const },
  { type: '异常', description: '本周发现3笔异常大额赔付，已标记排�?, relatedMetrics: ['周赔付额'], status: '已标�? as const },
  { type: '审批', description: '7天无理由退货审核加严，需确认商品完好', relatedMetrics: ['退款率'], status: '已完�? as const },
];

/* ─── Mock: 结果数据 ─── */
const MOCK_RESULTS = [
  { metric: '周赔付额', target: 3000, actual: 3580, unit: '�?, inverse: true },
  { metric: '客诉�?, target: 2.0, actual: 1.8, unit: '%', inverse: true },
  { metric: '退款率', target: 3.0, actual: 3.5, unit: '%', inverse: true },
  { metric: 'AI提效时长', target: 120, actual: 140, unit: '分钟', inverse: false },
];

/* ─── Mock: 构成占比 ─── */
const MOCK_COMPOSITION = [
  { category: '物流破损', amount: 1200, ratio: '33.5%', change: -5 },
  { category: '7天无理由', amount: 980, ratio: '27.4%', change: 2 },
  { category: '质量问题', amount: 760, ratio: '21.2%', change: -1 },
  { category: '安装售后', amount: 420, ratio: '11.7%', change: 0 },
  { category: '其他', amount: 220, ratio: '6.2%', change: -3 },
];

/* ─── 工具函数 ─── */
function isAchieved(target: number, actual: number, inverse: boolean) {
  return inverse ? actual <= target : actual >= target;
}

function getStatus(target: number, actual: number, inverse: boolean) {
  const achieved = isAchieved(target, actual, inverse);
  if (achieved) return 'green' as const;
  const ratio = inverse ? target / actual : actual / target;
  if (ratio >= 0.8) return 'yellow' as const;
  return 'red' as const;
}

const STATUS_LIGHT = { green: '🟢', yellow: '🟡', red: '🔴' };
const STATUS_BG = { green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200', red: 'bg-red-50 border-red-200' };
const STATUS_TEXT = { green: 'text-green-700', yellow: 'text-yellow-700', red: 'text-red-700' };

const PATH_COLORS: Record<string, { bg: string; text: string }> = {
  '审批': { bg: 'bg-blue-100', text: 'text-blue-800' },
  '培训': { bg: 'bg-purple-100', text: 'text-purple-800' },
  '流程': { bg: 'bg-sky-100', text: 'text-sky-800' },
  '异常': { bg: 'bg-red-100', text: 'text-red-800' },
  '调整': { bg: 'bg-amber-100', text: 'text-amber-800' },
};

const PATH_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  '已完�?: { bg: 'bg-green-100', text: 'text-green-700' },
  '进行�?: { bg: 'bg-blue-100', text: 'text-blue-700' },
  '已标�?: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

export default function WeeklyReportPage() {
  const { profile, authFetch } = useAuth();
  const [reports, setReports] = useState<WeeklyReportData[]>([]);
  const [currentReport, setCurrentReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  if (profile?.role !== 'enterprise_admin') {
    return <PermissionLocked title="资金周报" description="此功能仅对旗舰版老板开�? />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/weekly-report?company_id=${companyId}`);
      const json = await res.json();
      if (json.data) {
        const list = json.data.reports || [];
        setReports(list);
        if (list.length > 0) setCurrentReport(list[0]);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── 指标统计 ─── */
  const achievedCount = MOCK_RESULTS.filter(r => isAchieved(r.target, r.actual, r.inverse)).length;
  const achieveRate = Math.round((achievedCount / MOCK_RESULTS.length) * 100);
  const failedMetrics = MOCK_RESULTS.filter(r => !isAchieved(r.target, r.actual, r.inverse));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-6">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          资金周报
        </h1>

        {/* 说明引导 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <Info className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-base text-blue-800 space-y-1">
              <p className="font-medium">资金周报是什么？</p>
              <p>每周自动汇总售后亏损总额、高危异常赔付明细、AI替代人工时长，并给出下周风控优化建议�?/p>
              <p className="text-blue-600">点击「生成本周报」即可查看本周数据。也可下载模板填写后导入�?/p>
            </div>
          </div>
        </div>

        {/* 周选择�?+ 操作按钮 */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar className="w-6 h-6 text-gray-400" />
            <select className="border rounded-lg px-4 py-2.5 flex-1 text-base" value={currentReport?.id || ''} onChange={e => {
              const r = reports.find(r => r.id === e.target.value);
              setCurrentReport(r || null);
            }}>
              {reports.map(r => <option key={r.id} value={r.id}>{r.weekStart} ~ {r.weekEnd}</option>)}
            </select>
            <button onClick={async () => {
              await authFetch('/api/weekly-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', company_id: companyId }) });
              loadData();
            }} className="bg-blue-800 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-900 text-base">生成本周�?/button>
            <button onClick={async () => {
              try {
                const XLSX = await import('xlsx');
                const headers = ['周起始日', '周结束日', '售后亏损总额', '环比变化(%)', '异常赔付笔数', 'AI使用次数', 'AI节省时长(分钟)', '风控建议'];
                const exampleRow = ['2025-01-06', '2025-01-12', '3580', '-12.5', '3', '28', '140', '重点关注退货原因集中在家具破损'];
                const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, '资金周报模板');
                XLSX.writeFile(wb, '资金周报模板.xlsx');
              } catch { alert('下载模板失败'); }
            }} className="border border-blue-800 text-blue-800 px-4 py-2.5 rounded-lg font-medium hover:bg-blue-50 flex items-center gap-1 text-base">
              <Download className="w-5 h-5" />下载模板
            </button>
            <label className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-1 cursor-pointer text-base">
              <FileSpreadsheet className="w-5 h-5" />导入表格
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const XLSX = await import('xlsx');
                  const data = await file.arrayBuffer();
                  const wb = XLSX.read(data);
                  const ws = wb.Sheets[wb.SheetNames[0]];
                  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
                  if (rows.length > 0) {
                    const r = rows[0];
                    const fakeReport: WeeklyReportData = {
                      id: 'imported',
                      weekStart: r['周起始日'] || '',
                      weekEnd: r['周结束日'] || '',
                      totalLoss: Number(r['售后亏损总额']) || 0,
                      lossChangePercent: r['环比变化(%)'] ? Number(r['环比变化(%)']) : null,
                      anomalyCount: Number(r['异常赔付笔数']) || 0,
                      anomalyDetails: [],
                      aiUsageCount: Number(r['AI使用次数']) || 0,
                      aiSavingMinutes: Number(r['AI节省时长(分钟)']) || 0,
                      suggestions: r['风控建议'] || null,
                      isRead: false,
                    };
                    setCurrentReport(fakeReport);
                  }
                } catch { alert('导入失败，请检查文件格�?); }
                e.target.value = '';
              }} />
            </label>
          </div>
        </div>

        {loading ? <div className="text-center py-20 text-gray-400 text-lg">加载�?..</div> : (
          currentReport ? (
            <div className="space-y-0">

              {/* ══════════════�?🎯 本周目标 ══════════════�?*/}
              <div className="py-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
                  <span className="text-3xl">🎯</span> 本周目标
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {MOCK_GOALS.map((g) => {
                    const result = MOCK_RESULTS.find(r => r.metric === g.metric);
                    const actual = result?.actual ?? 0;
                    const status = result ? getStatus(g.target, actual, g.inverse) : 'yellow';
                    return (
                      <div key={g.metric} className={`rounded-xl border-2 p-5 ${STATUS_BG[status]}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold text-gray-800">{g.metric}</span>
                          <span className="text-2xl">{STATUS_LIGHT[status]}</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {g.target}{g.unit}
                        </div>
                        <div className={`text-base mt-1 ${STATUS_TEXT[status]}`}>
                          {status === 'green' ? '�?达标' : status === 'yellow' ? '⚠️ 接近' : '�?未达�?}
                          {result && <span className="ml-1">（实�?{actual}{g.unit}�?/span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-base text-gray-500 mt-3">💡 目标值可在KPI管理中设�?/p>
              </div>

              <hr className="border-gray-200" />

              {/* ══════════════�?🛤�?本周路径 ══════════════�?*/}
              <div className="py-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
                  <span className="text-3xl">🛤�?/span> 本周路径
                </h2>
                <div className="space-y-3">
                  {MOCK_PATHS.map((p, i) => {
                    const color = PATH_COLORS[p.type] || PATH_COLORS['调整'];
                    const statusStyle = PATH_STATUS_STYLE[p.status] || PATH_STATUS_STYLE['进行�?];
                    return (
                      <div key={i} className="flex items-start gap-4 bg-white rounded-xl border p-4">
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          {i < MOCK_PATHS.length - 1 && <div className="w-0.5 h-8 bg-blue-200 mt-1" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${color.bg} ${color.text}`}>{p.type}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>{p.status}</span>
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

              {/* ══════════════�?📊 本周结果 ══════════════�?*/}
              <div className="py-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
                  <span className="text-3xl">📊</span> 本周结果
                </h2>

                {/* 达标率总览 */}
                <div className="bg-white rounded-xl border p-5 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold">综合达标�?/span>
                    <span className="text-2xl font-bold text-blue-800">{achieveRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${achieveRate}%` }} />
                  </div>
                  <div className="flex gap-4 mt-2 text-base">
                    <span className="text-green-700 font-bold">�?达标 {achievedCount}�?/span>
                    <span className="text-red-700 font-bold">�?未达�?{MOCK_RESULTS.length - achievedCount}�?/span>
                  </div>
                </div>

                {/* 目标vs实际对比 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {MOCK_RESULTS.map((r) => {
                    const status = getStatus(r.target, r.actual, r.inverse);
                    const achieved = isAchieved(r.target, r.actual, r.inverse);
                    const ratio = r.inverse
                      ? Math.min(100, Math.round((r.target / r.actual) * 100))
                      : Math.min(100, Math.round((r.actual / r.target) * 100));
                    return (
                      <div key={r.metric} className={`rounded-xl border-2 p-5 ${STATUS_BG[status]}`}>
                        <div className="text-lg font-bold text-gray-800 mb-2">{r.metric}</div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-3xl font-bold text-gray-900">{r.actual}{r.unit}</span>
                        </div>
                        <div className="text-base text-gray-500">目标 {r.target}{r.unit}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div className={`h-2.5 rounded-full ${achieved ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${ratio}%` }} />
                        </div>
                        <div className={`text-base mt-1 font-bold ${STATUS_TEXT[status]}`}>
                          {achieved ? '�?达标' : '�?未达�?} ({ratio}%)
                        </div>
                        {!achieved && (
                          <button onClick={() => setExpandedReview(expandedReview === r.metric ? null : r.metric)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 text-base font-bold mt-2">
                            ⚠️ 未达�?�?查看复盘
                            {expandedReview === r.metric ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        {expandedReview === r.metric && (
                          <div className="mt-3 p-4 bg-white rounded-lg border space-y-2">
                            <div className="text-base font-bold text-gray-800 mb-2">📋 8问复盘：{r.metric}</div>
                            {REVIEW_QUESTIONS.map((q, qi) => (
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

                {/* 实际亏损数据 - 保留原有 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3"><TrendingUp className="w-5 h-5 text-red-500" />本周售后亏损总额</h3>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold text-red-700">¥{Number(currentReport.totalLoss).toLocaleString()}</span>
                      {currentReport.lossChangePercent !== null && (
                        <span className={`text-lg font-bold flex items-center gap-1 ${Number(currentReport.lossChangePercent) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(currentReport.lossChangePercent) <= 0 ? '�? : '�?}{Math.abs(Number(currentReport.lossChangePercent)).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-orange-500" />高危异常赔付</h3>
                    <div className="text-4xl font-bold text-orange-700 mb-2">{currentReport.anomalyCount}�?/div>
                    {Array.isArray(currentReport.anomalyDetails) && currentReport.anomalyDetails.length > 0 ? (
                      <div className="space-y-1">
                        {currentReport.anomalyDetails.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-base">
                            <span className="text-gray-700">{d.keyword}</span>
                            <span className="font-bold text-orange-600">{d.count}�?/span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-gray-400 text-base">本周无异�?/p>}
                  </div>
                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3"><Zap className="w-5 h-5 text-purple-500" />AI替代人工时长</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div><div className="text-base text-gray-500">AI使用次数</div><div className="text-3xl font-bold text-purple-700">{currentReport.aiUsageCount}�?/div></div>
                      <div><div className="text-base text-gray-500">估算节省时长</div><div className="text-3xl font-bold text-green-700">{currentReport.aiSavingMinutes}分钟</div></div>
                    </div>
                  </div>
                </div>

                {/* 构成占比 */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-bold mb-4">📊 亏损构成占比</h3>
                  <div className="space-y-3">
                    {MOCK_COMPOSITION.map((c) => (
                      <div key={c.category} className="flex items-center gap-3">
                        <span className="text-base font-bold text-gray-800 w-24">{c.category}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                          <div className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2" style={{ width: c.ratio }}>
                            <span className="text-xs text-white font-bold">{c.ratio}</span>
                          </div>
                        </div>
                        <span className="text-base font-bold text-gray-700 w-20 text-right">¥{c.amount.toLocaleString()}</span>
                        <span className={`text-base font-bold ${c.change > 0 ? 'text-red-600' : c.change < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {c.change > 0 ? `�?{c.change}` : c.change < 0 ? `�?{Math.abs(c.change)}` : '�?}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* ══════════════�?📌 下周风控建议 ══════════════�?*/}
              <div className="py-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                  <span className="text-3xl">📌</span> 下周风控建议
                </h2>
                {failedMetrics.length > 0 ? (
                  <div className="space-y-3">
                    {failedMetrics.map(m => (
                      <div key={m.metric} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-amber-800">⚠️ {m.metric}未达�?/span>
                          <span className="text-base text-amber-600">实际 {m.actual}{m.unit} vs 目标 {m.target}{m.unit}</span>
                        </div>
                        <p className="text-base text-amber-700">
                          建议重点排查{m.metric}偏高的根因，制定针对性改善方案，下周目标将{m.inverse ? '下调管控红线' : '提升目标�?}�?
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-lg font-bold text-green-700">�?本周所有指标达标！下周可以挑战更高的目标值�?/p>
                  </div>
                )}
                {currentReport.suggestions && (
                  <div className="mt-4 bg-white rounded-xl border p-5">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3"><Lightbulb className="w-5 h-5 text-yellow-500" />AI风控建议</h3>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{currentReport.suggestions}</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="space-y-6">
              {/* 示例数据预览 - 保留原有 */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-600">示例周报预览</span>
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">生成后显示真实数�?/span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border p-4">
                    <div className="text-base text-gray-500 mb-1">本周售后亏损总额</div>
                    <div className="text-2xl font-bold text-red-700">¥3,580</div>
                    <div className="text-sm text-green-600 mt-1">�?2.5% 较上�?/div>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="text-base text-gray-500 mb-1">高危异常赔付</div>
                    <div className="text-2xl font-bold text-orange-700">3�?/div>
                    <div className="text-sm text-gray-400 mt-1">物流破损×2, 7天无理由×1</div>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="text-base text-gray-500 mb-1">AI节省时长</div>
                    <div className="text-2xl font-bold text-purple-700">140分钟</div>
                    <div className="text-sm text-gray-400 mt-1">AI使用28�?/div>
                  </div>
                </div>
                <div className="mt-4 bg-white rounded-lg border p-4">
                  <div className="text-base text-gray-500 mb-1">下周风控建议</div>
                  <p className="text-gray-700 text-base">重点关注退货原因集中在物流破损，建议更换包装方案；异常赔付3笔均为大额退款，需核实是否涉及售后处理规范问题�?/p>
                </div>
              </div>
              <div className="text-center">
                <button onClick={async () => {
                  await authFetch('/api/weekly-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', company_id: companyId }) });
                  loadData();
                }} className="bg-blue-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-900 text-lg">生成本周�?/button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
