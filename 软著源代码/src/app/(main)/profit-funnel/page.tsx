'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import { Filter, Plus, ArrowUpDown, TrendingDown, TrendingUp, DollarSign, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface ProfitRecord { id: string; productName: string; sku: string | null; sellPrice: number; costPrice: number; afterSaleLoss: number; netProfit: number; profitLevel: string; refundCount: number; refundRate: number }

const levelStyles: Record<string, { bg: string; text: string }> = {
  '暴利': { bg: 'bg-green-100', text: 'text-green-800' },
  '平利': { bg: 'bg-blue-100', text: 'text-blue-800' },
  '保本': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  '亏损': { bg: 'bg-red-100', text: 'text-red-800' },
};

/* ─── 复盘8�?─── */
const REVIEW_QUESTIONS = [
  '1. 这个单品亏损的核心原因是什么？',
  '2. 是偶发还是系统性问题？',
  '3. 售后损耗主要发生在哪个环节�?,
  '4. 退换货原因是否可以预防�?,
  '5. 定价策略是否需要调整？',
  '6. 供应链成本是否有优化空间�?,
  '7. 下月最需要改变的一个动作是什么？',
  '8. 谁负责跟进？什么时间复查？',
];

/* ─── Mock: 单品盈利目标 ─── */
const MOCK_PROFIT_GOALS = [
  { metric: '单品平均净利率', target: 25, unit: '%', inverse: false },
  { metric: '售后损耗率红线', target: 8, unit: '%', inverse: true },
  { metric: '退款率红线', target: 3, unit: '%', inverse: true },
  { metric: '暴利品占比目�?, target: 40, unit: '%', inverse: false },
];

/* ─── Mock: 品类经营路径 ─── */
const MOCK_PROFIT_PATHS = [
  { type: '选品', description: '本月新增3款高毛利智能马桶盖，替代低毛利型�?, relatedMetrics: ['单品平均净利率', '暴利品占比目�?], status: '已完�? as const },
  { type: '定价', description: '亏损品提�?-10%，暴利品保持现有价格竞争�?, relatedMetrics: ['单品平均净利率'], status: '已完�? as const },
  { type: '品控', description: '加强发货前质检，减少运输破损导致的退换货', relatedMetrics: ['售后损耗率红线', '退款率红线'], status: '进行�? as const },
  { type: '售后', description: '优化售后话术，引导换货优先于退�?, relatedMetrics: ['退款率红线'], status: '进行�? as const },
  { type: '供应�?, description: '与核心供应商谈判降价3%，降低进货成�?, relatedMetrics: ['单品平均净利率'], status: '规划�? as const },
  { type: '异常', description: '某款花洒退款率异常偏高(8.2%)，已标记重点排查', relatedMetrics: ['退款率红线', '售后损耗率红线'], status: '已标�? as const },
];

/* ─── Mock: 漏斗数据 ─── */
const MOCK_FUNNEL = [
  { stage: '销售出�?, value: 100, unit: '%' },
  { stage: '签收确认', value: 95, unit: '%' },
  { stage: '售后触发', value: 12, unit: '%' },
  { stage: '退换货', value: 6, unit: '%' },
  { stage: '净利保�?, value: 78, unit: '%' },
];

/* ─── Mock: 结果数据 ─── */
const MOCK_PROFIT_RESULTS = [
  { metric: '单品平均净利率', target: 25, actual: 22, unit: '%', inverse: false },
  { metric: '售后损耗率红线', target: 8, actual: 9.5, unit: '%', inverse: true },
  { metric: '退款率红线', target: 3, actual: 2.8, unit: '%', inverse: true },
  { metric: '暴利品占比目�?, target: 40, actual: 35, unit: '%', inverse: false },
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
  '选品': { bg: 'bg-green-100', text: 'text-green-800' },
  '定价': { bg: 'bg-blue-100', text: 'text-blue-800' },
  '品控': { bg: 'bg-purple-100', text: 'text-purple-800' },
  '售后': { bg: 'bg-sky-100', text: 'text-sky-800' },
  '供应�?: { bg: 'bg-amber-100', text: 'text-amber-800' },
  '异常': { bg: 'bg-red-100', text: 'text-red-800' },
};
const PATH_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  '已完�?: { bg: 'bg-green-100', text: 'text-green-700' },
  '进行�?: { bg: 'bg-blue-100', text: 'text-blue-700' },
  '已标�?: { bg: 'bg-amber-100', text: 'text-amber-700' },
  '规划�?: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function ProfitFunnelPage() {
  const { profile, authFetch } = useAuth();
  const [records, setRecords] = useState<ProfitRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ productName: '', sku: '', sellPrice: 0, costPrice: 0, afterSaleLoss: 0 });
  const [sortBy, setSortBy] = useState<'netProfit' | 'afterSaleLoss' | 'refundRate'>('netProfit');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  if (profile?.role !== 'enterprise_admin') {
    return <PermissionLocked title="单品盈利损耗漏�? description="此功能仅对旗舰版老板开�? />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/profit-funnel?company_id=${companyId}`);
      const json = await res.json();
      if (json.data) {
        setRecords(json.data.records || []);
        if (json.data.aiInsight) setAiInsight(json.data.aiInsight);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = records
    .filter(r => filterLevel === 'all' || r.profitLevel === filterLevel)
    .sort((a, b) => {
      if (sortBy === 'netProfit') return a.netProfit - b.netProfit;
      if (sortBy === 'afterSaleLoss') return b.afterSaleLoss - a.afterSaleLoss;
      return b.refundRate - a.refundRate;
    });

  const totalLoss = records.reduce((s, r) => s + Number(r.afterSaleLoss), 0);
  const totalProfit = records.reduce((s, r) => s + Number(r.netProfit), 0);

  /* ─── 指标统计 ─── */
  const achievedCount = MOCK_PROFIT_RESULTS.filter(r => isAchieved(r.target, r.actual, r.inverse)).length;
  const achieveRate = Math.round((achievedCount / MOCK_PROFIT_RESULTS.length) * 100);
  const failedMetrics = MOCK_PROFIT_RESULTS.filter(r => !isAchieved(r.target, r.actual, r.inverse));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-6">
          <DollarSign className="w-8 h-8 text-green-600" />
          单品盈利损耗漏�?
        </h1>

        {loading ? <div className="text-center py-20 text-gray-400 text-lg">加载�?..</div> : (
          <div className="space-y-0">

            {/* ══════════════�?🎯 单品盈利目标 ══════════════�?*/}
            <div className="py-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
                <span className="text-3xl">🎯</span> 盈利目标
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {MOCK_PROFIT_GOALS.map((g) => {
                  const result = MOCK_PROFIT_RESULTS.find(r => r.metric === g.metric);
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

            {/* ══════════════�?🛤�?品类经营路径 ══════════════�?*/}
            <div className="py-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
                <span className="text-3xl">🛤�?/span> 经营路径
              </h2>
              <div className="space-y-3">
                {MOCK_PROFIT_PATHS.map((p, i) => {
                  const color = PATH_COLORS[p.type] || PATH_COLORS['异常'];
                  const statusStyle = PATH_STATUS_STYLE[p.status] || PATH_STATUS_STYLE['进行�?];
                  return (
                    <div key={i} className="flex items-start gap-4 bg-white rounded-xl border p-4">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        {i < MOCK_PROFIT_PATHS.length - 1 && <div className="w-0.5 h-8 bg-green-200 mt-1" />}
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

            {/* ══════════════�?📊 盈利结果 ══════════════�?*/}
            <div className="py-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
                <span className="text-3xl">📊</span> 盈利结果
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
                  <span className="text-red-700 font-bold">�?未达�?{MOCK_PROFIT_RESULTS.length - achievedCount}�?/span>
                </div>
              </div>

              {/* 目标vs实际对比 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {MOCK_PROFIT_RESULTS.map((r) => {
                  const status = getStatus(r.target, r.actual, r.inverse);
                  const achieved = isAchieved(r.target, r.actual, r.inverse);
                  const ratio = r.inverse
                    ? Math.min(100, Math.round((r.target / r.actual) * 100))
                    : Math.min(100, Math.round((r.actual / r.target) * 100));
                  return (
                    <div key={r.metric} className={`rounded-xl border-2 p-5 ${STATUS_BG[status]}`}>
                      <div className="text-lg font-bold text-gray-800 mb-2">{r.metric}</div>
                      <div className="text-3xl font-bold text-gray-900">{r.actual}{r.unit}</div>
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

              {/* 概览卡片 - 保留原有 */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-white rounded-xl border p-5 text-center">
                  <div className="text-base text-gray-500 mb-1">产品总数</div>
                  <div className="text-3xl font-bold text-gray-900">{records.length}</div>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 p-5 text-center">
                  <div className="text-base text-red-600 mb-1">售后损耗总额</div>
                  <div className="text-3xl font-bold text-red-700">¥{totalLoss.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
                  <div className="text-base text-green-600 mb-1">真实净利总额</div>
                  <div className="text-3xl font-bold text-green-700">¥{totalProfit.toLocaleString()}</div>
                </div>
              </div>

              {/* 漏斗数据 */}
              <div className="bg-white rounded-xl border p-6 mb-5">
                <h3 className="text-lg font-bold mb-4">📊 盈利漏斗</h3>
                <div className="space-y-3">
                  {MOCK_FUNNEL.map((f, i) => {
                    const widthPercent = f.value;
                    const barColor = i === 0 ? 'bg-blue-500' : i === MOCK_FUNNEL.length - 1 ? (f.value >= 80 ? 'bg-green-500' : 'bg-red-500') : 'bg-sky-400';
                    return (
                      <div key={f.stage} className="flex items-center gap-3">
                        <span className="text-base font-bold text-gray-800 w-24">{f.stage}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
                          <div className={`${barColor} h-8 rounded-full flex items-center justify-end pr-3 transition-all`} style={{ width: `${widthPercent}%` }}>
                            <span className="text-sm text-white font-bold">{f.value}{f.unit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* ══════════════�?📌 下月重点 ══════════════�?*/}
            <div className="py-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                <span className="text-3xl">📌</span> 下月重点
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
                        建议重点排查{m.metric}偏低的根因，制定针对性改善方案，下月目标将{m.inverse ? '收紧红线' : '提升目标�?}�?
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-lg font-bold text-green-700">�?所有指标达标！下月可以挑战更高的盈利目标�?/p>
                </div>
              )}
            </div>

            <hr className="border-gray-200" />

            {/* ══════════════�?保留原有功能：产品列�?══════════════�?*/}
            <div className="py-6">
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">产品列表</h2>
                  <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-900">
                    <Plus className="w-4 h-4" />录入产品
                  </button>
                </div>
                {showAdd && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="产品名称" className="border rounded-lg px-3 py-2" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} />
                      <input placeholder="SKU(选填)" className="border rounded-lg px-3 py-2" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-xs text-gray-500">售价</label><input type="number" className="w-full border rounded-lg px-3 py-2" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: Number(e.target.value) })} /></div>
                      <div><label className="text-xs text-gray-500">进货成本</label><input type="number" className="w-full border rounded-lg px-3 py-2" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: Number(e.target.value) })} /></div>
                      <div><label className="text-xs text-gray-500">售后损�?/label><input type="number" className="w-full border rounded-lg px-3 py-2" value={form.afterSaleLoss} onChange={e => setForm({ ...form, afterSaleLoss: Number(e.target.value) })} /></div>
                    </div>
                    <button onClick={async () => {
                      await authFetch('/api/profit-funnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_product', company_id: companyId, ...form }) });
                      setShowAdd(false); setForm({ productName: '', sku: '', sellPrice: 0, costPrice: 0, afterSaleLoss: 0 }); loadData();
                    }} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-900">保存</button>
                  </div>
                )}

                {/* 筛选排�?*/}
                <div className="flex gap-3 mb-4">
                  <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-gray-400" />
                    <select className="border rounded-lg px-3 py-1.5 text-sm" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                      <option value="all">全部层级</option><option value="暴利">暴利</option><option value="平利">平利</option><option value="保本">保本</option><option value="亏损">亏损</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4 text-gray-400" />
                    <select className="border rounded-lg px-3 py-1.5 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as 'netProfit' | 'afterSaleLoss' | 'refundRate')}>
                      <option value="netProfit">按净利排�?/option><option value="afterSaleLoss">按损耗排�?/option><option value="refundRate">按退款率排序</option>
                    </select>
                  </div>
                </div>

                {/* 产品表格 */}
                {filtered.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-200 text-gray-500">
                        <th className="text-left py-2 px-2">产品</th><th className="text-right py-2 px-2">售价</th><th className="text-right py-2 px-2">成本</th><th className="text-right py-2 px-2">售后损�?/th><th className="text-right py-2 px-2">真实净�?/th><th className="text-center py-2 px-2">层级</th><th className="text-right py-2 px-2">退款率</th>
                      </tr></thead>
                      <tbody>
                        {filtered.map(r => {
                          const lvl = levelStyles[r.profitLevel] || levelStyles['保本'];
                          return (
                            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-2 font-medium">{r.productName}{r.sku && <span className="text-xs text-gray-400 ml-1">({r.sku})</span>}</td>
                              <td className="py-2 px-2 text-right">¥{Number(r.sellPrice).toLocaleString()}</td>
                              <td className="py-2 px-2 text-right">¥{Number(r.costPrice).toLocaleString()}</td>
                              <td className="py-2 px-2 text-right text-red-600">¥{Number(r.afterSaleLoss).toLocaleString()}</td>
                              <td className={`py-2 px-2 text-right font-bold ${Number(r.netProfit) >= 0 ? 'text-green-700' : 'text-red-700'}`}>¥{Number(r.netProfit).toLocaleString()}</td>
                              <td className="py-2 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lvl.bg} ${lvl.text}`}>{r.profitLevel}</span></td>
                              <td className="py-2 px-2 text-right">{Number(r.refundRate).toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-gray-400 text-center py-8">暂无产品数据，点击上�?录入产品"开�?/p>}
              </div>

              {/* AI分析 - 保留原有 */}
              <div className="bg-white rounded-xl border p-5 mt-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-purple-600" />AI分析</h2>
                {aiInsight ? <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{aiInsight}</div> : (
                  <div className="text-center py-8">
                    <button onClick={async () => {
                      const res = await authFetch(`/api/profit-funnel?company_id=${companyId}&ai=true`);
                      const json = await res.json();
                      if (json.data?.aiInsight) setAiInsight(json.data.aiInsight);
                    }} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2 mx-auto"><Sparkles className="w-5 h-5" />生成AI分析</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
