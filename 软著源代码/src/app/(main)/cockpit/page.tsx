'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import {
  TrendingDown, TrendingUp, AlertTriangle, Filter, DollarSign,
  ShieldAlert, ChevronDown, ChevronUp, Clock, CheckCircle2,
  XCircle, Plus, Settings, Eye, BarChart3, PieChart, ArrowUpDown
} from 'lucide-react';

// AI分析4维度展示组件
function AIAnalysisCard({ data }: { data: { overview: string; plainTalk: string; problem: string; action: string } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-blue-800 font-semibold text-sm w-full text-left">
        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">AI分析</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 text-sm">
          <div><span className="text-blue-700 font-semibold">概览�?/span>{data.overview}</div>
          <div><span className="text-blue-700 font-semibold">大白话解读：</span>{data.plainTalk}</div>
          <div><span className="text-red-700 font-semibold">问题定位�?/span>{data.problem}</div>
          <div><span className="text-green-700 font-semibold">行动建议�?/span>{data.action}</div>
        </div>
      )}
    </div>
  );
}

// 大数字卡�?
function BigNumberCard({ label, value, unit, change, icon: Icon }: {
  label: string; value: string | number; unit?: string; change?: number; icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-blue-700" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-gray-500 text-sm">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
          {change !== undefined && change !== 0 && (
            <span className={`text-sm font-medium ml-2 ${change > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {change > 0 ? '�? : '�?}{Math.abs(change)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

type TabKey = 'loss-perspective' | 'cost-compare' | 'anomaly' | 'profit-funnel' | 'approval' | 'weekly-report';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'loss-perspective', label: '售后亏损透视', icon: TrendingDown },
  { key: 'cost-compare', label: '降本对比', icon: BarChart3 },
  { key: 'anomaly', label: '异常红警', icon: AlertTriangle },
  { key: 'profit-funnel', label: '单品盈利损�?, icon: Filter },
  { key: 'approval', label: '赔付审批�?, icon: ShieldAlert },
  { key: 'weekly-report', label: '资金周报', icon: DollarSign },
];

export default function CockpitPage() {
  const { profile, authFetch } = useAuth();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab = (searchParams?.get('tab') as TabKey) || 'loss-perspective';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  // 权限检查：�?ent_admin 可访�?
  if (profile?.role !== 'enterprise_admin') {
    return <PermissionLocked title="旗舰版驾驶舱" description="驾驶舱仅对旗舰版老板开放，请开通后使用" />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/cockpit?company_id=${companyId}&module=${activeTab}`);
      const json = await res.json();
      if (json.data) {
        setData(prev => ({ ...prev, [activeTab]: json.data }));
      }
    } catch (err) {
      console.error('[cockpit] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, activeTab, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-blue-800" />
            旗舰版驾驶舱
          </h1>
          <p className="text-gray-500 mt-1">老板专属数据看板，资金一目了�?/p>
        </div>

        {/* Tab导航 */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-800 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 内容�?*/}
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载�?..</div>
        ) : (
          <div>
            {activeTab === 'loss-perspective' && <LossPerspectiveView data={data['loss-perspective'] as Record<string, unknown>} />}
            {activeTab === 'cost-compare' && <CostCompareView data={data['cost-compare'] as Record<string, unknown>} companyId={companyId} />}
            {activeTab === 'anomaly' && <AnomalyAlertView data={data['anomaly'] as Record<string, unknown>} />}
            {activeTab === 'profit-funnel' && <ProfitFunnelView data={data['profit-funnel'] as Record<string, unknown>} companyId={companyId} />}
            {activeTab === 'approval' && <ApprovalView data={data['approval'] as Record<string, unknown>} companyId={companyId} />}
            {activeTab === 'weekly-report' && <WeeklyReportView data={data['weekly-report'] as Record<string, unknown>} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 1. 售后亏损透视 ─── */
function LossPerspectiveView({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return <div className="text-center py-10 text-gray-400">暂无数据</div>;

  const totalLoss = Number(data.totalLoss || 0);
  const changePercent = Number(data.changePercent || 0);
  const topLossItems = (data.topLossItems as Array<{ name: string; amount: number }>) || [];
  const categoryBreakdown = (data.categoryBreakdown as Array<{ name: string; value: number }>) || [];
  const trendData = (data.trendData as Array<{ month: string; total: number }>) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigNumberCard label="本月赔付总额" value={`¥${totalLoss.toFixed(2)}`} change={changePercent} icon={DollarSign} />
        <BigNumberCard label="亏损笔数" value={topLossItems.length} unit="�? icon={TrendingDown} />
        <BigNumberCard label="环比变化" value={`${changePercent > 0 ? '+' : ''}${changePercent}%`} icon={changePercent > 0 ? TrendingUp : TrendingDown} />
      </div>

      {/* SKU TOP10 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-4">SKU TOP10 亏损排行</h3>
        {topLossItems.length > 0 ? (
          <div className="space-y-2">
            {topLossItems.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {i + 1}
                  </span>
                  <span className="text-gray-800 font-medium">{item.name}</span>
                </div>
                <span className="text-red-600 font-bold">¥{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">暂无亏损记录</p>
        )}

        <AIAnalysisCard data={{
          overview: `本月售后赔付总额¥${totalLoss.toFixed(2)}�?{changePercent > 0 ? '环比上升' : '环比下降'}${Math.abs(changePercent)}%`,
          plainTalk: changePercent > 0 ? '这个月赔的钱比上个月多，需要重点关注哪里在漏钱' : '这个月赔付金额有所减少，说明管控措施有�?,
          problem: topLossItems.length > 0 ? `${topLossItems[0]?.name}亏损最高，需要优先处理` : '暂无明确亏损产品',
          action: '建议对TOP3亏损产品进行根因分析，制定针对性改进方�?,
        }} />
      </div>

      {/* 亏损分类占比 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-4">亏损分类占比</h3>
        <div className="space-y-3">
          {categoryBreakdown.map((cat, i) => {
            const total = categoryBreakdown.reduce((s, c) => s + c.value, 0);
            const percent = total > 0 ? Math.round(cat.value / total * 100) : 0;
            const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-gray-400'];
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{cat.name}</span>
                  <span className="text-gray-600">¥{cat.value} ({percent}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={`${colors[i % colors.length]} h-3 rounded-full`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 月度趋势 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-4">月度趋势</h3>
        <div className="flex items-end gap-2 h-40">
          {trendData.map((d, i) => {
            const maxVal = Math.max(...trendData.map(t => t.total), 1);
            const h = Math.max(8, (d.total / maxVal) * 130);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">¥{d.total}</span>
                <div className="w-full bg-blue-600 rounded-t" style={{ height: h }} />
                <span className="text-xs text-gray-400">{d.month.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── 2. 降本对比 ─── */
function CostCompareView({ data, companyId }: { data: Record<string, unknown> | undefined; companyId: string }) {
  const [showBaselineForm, setShowBaselineForm] = useState(false);
  const [baselineForm, setBaselineForm] = useState({ compRate: '', refundRate: '', responseTime: '', satisfaction: '', systemFee: '' });

  if (!data) return <div className="text-center py-10 text-gray-400">暂无数据</div>;

  const baseline = data.baseline as Record<string, number>;
  const current = data.current as Record<string, number>;
  const hasBaseline = data.hasBaseline as boolean;

  const metrics = [
    { label: '赔付�?, baselineKey: 'compensationRate', currentKey: 'compensationRate', unit: '%', lower: true },
    { label: '退款率', baselineKey: 'refundRate', currentKey: 'refundRate', unit: '%', lower: true },
    { label: '响应时长', baselineKey: 'responseTime', currentKey: 'responseTime', unit: '分钟', lower: true },
    { label: '满意�?, baselineKey: 'satisfaction', currentKey: 'satisfaction', unit: '%', lower: false },
  ];

  return (
    <div className="space-y-6">
      {!hasBaseline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-yellow-800 font-medium">请先录入上线前基线数据，才能看到降本对比效果</p>
          <button onClick={() => setShowBaselineForm(!showBaselineForm)} className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700">
            {showBaselineForm ? '收起' : '录入基线数据'}
          </button>
        </div>
      )}

      {showBaselineForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-bold mb-4">录入上线前基线数�?/h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-600">基线赔付�?%)</label><input className="w-full border rounded-lg px-3 py-2 mt-1" value={baselineForm.compRate} onChange={e => setBaselineForm({ ...baselineForm, compRate: e.target.value })} /></div>
            <div><label className="text-sm text-gray-600">基线退款率(%)</label><input className="w-full border rounded-lg px-3 py-2 mt-1" value={baselineForm.refundRate} onChange={e => setBaselineForm({ ...baselineForm, refundRate: e.target.value })} /></div>
            <div><label className="text-sm text-gray-600">基线响应时长(分钟)</label><input className="w-full border rounded-lg px-3 py-2 mt-1" value={baselineForm.responseTime} onChange={e => setBaselineForm({ ...baselineForm, responseTime: e.target.value })} /></div>
            <div><label className="text-sm text-gray-600">基线满意�?%)</label><input className="w-full border rounded-lg px-3 py-2 mt-1" value={baselineForm.satisfaction} onChange={e => setBaselineForm({ ...baselineForm, satisfaction: e.target.value })} /></div>
            <div><label className="text-sm text-gray-600">系统月费(�?</label><input className="w-full border rounded-lg px-3 py-2 mt-1" value={baselineForm.systemFee} onChange={e => setBaselineForm({ ...baselineForm, systemFee: e.target.value })} /></div>
          </div>
          <button onClick={async () => {
            await fetch('/api/cost-baseline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: companyId, ...baselineForm }) });
            setShowBaselineForm(false);
            window.location.reload();
          }} className="mt-4 bg-blue-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-900">保存基线数据</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => {
          const bVal = baseline?.[m.baselineKey as keyof typeof baseline] || 0;
          const cVal = current?.[m.currentKey as keyof typeof current] || 0;
          const diff = cVal - bVal;
          const isGood = m.lower ? diff < 0 : diff > 0;
          return (
            <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500 text-sm mb-2">{m.label}</div>
              <div className="flex items-center justify-between">
                <div><span className="text-xs text-gray-400">上线�?/span><div className="text-lg font-bold">{bVal}{m.unit}</div></div>
                <div className="text-gray-300">�?/div>
                <div className="text-right"><span className="text-xs text-gray-400">当前</span><div className={`text-lg font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>{cVal}{m.unit}</div></div>
              </div>
              {bVal > 0 && <div className={`text-xs mt-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>{isGood ? '�? : '�?}{Math.abs(diff).toFixed(1)}{m.unit}</div>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigNumberCard label="月省金额" value={`¥${data.monthlySaving || 0}`} icon={TrendingDown} />
        <BigNumberCard label="系统月费" value={`¥${data.systemFee || 299}`} icon={DollarSign} />
        <BigNumberCard label="回本周期" value={data.roiMonths ? `${data.roiMonths}个月` : '计算�?..'} icon={Clock} />
      </div>

      <AIAnalysisCard data={{
        overview: `使用系统后赔付率下降，月省金额�?{data.monthlySaving || 0}`,
        plainTalk: data.monthlySaving && Number(data.monthlySaving) > 0 ? '系统帮你省下的钱，已经够覆盖费用�? : '还需要更多时间积累数据来评估降本效果',
        problem: Number(data.monthlySaving) < Number(data.systemFee) ? '目前节省金额还不够覆盖系统费�? : '降本效果良好',
        action: '继续优化售后流程，重点降低赔付率，效果会更明�?,
      }} />

      <div className="mt-4 text-right">
        <Link href="/work-orders" className="text-sm text-sky-600 hover:text-sky-700 inline-flex items-center gap-1">
          查看工单 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─── 3. 异常红警 ─── */
function AnomalyAlertView({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return <div className="text-center py-10 text-gray-400">暂无数据</div>;

  const anomalies = (data.anomalies as Array<Record<string, unknown>>) || [];
  const summary = (data.summary as Record<string, number>) || {};
  const approvalTraces = (data.approvalTraces as Array<Record<string, unknown>>) || [];

  const levelColors: Record<string, string> = {
    '黄色预警': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    '红色严重': 'bg-red-100 text-red-800 border-red-300',
    '黑色紧�?: 'bg-gray-900 text-white border-gray-900',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">{summary.yellow || 0}</div>
          <div className="text-sm text-yellow-600 mt-1">黄色预警</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{summary.red || 0}</div>
          <div className="text-sm text-red-600 mt-1">红色严重</div>
        </div>
        <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{summary.black || 0}</div>
          <div className="text-sm text-gray-700 mt-1">黑色紧�?/div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-4">异常赔付明细</h3>
        {anomalies.length > 0 ? (
          <div className="space-y-3">
            {anomalies.map((a, i) => (
              <div key={i} className={`rounded-lg border p-4 ${levelColors[a.level as string] || 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-bold">{a.title as string}</span>
                  </div>
                  <span className="text-sm font-medium">{a.level as string}</span>
                </div>
                <p className="text-sm mt-1 opacity-80">{a.detail as string}</p>
                {String(a.trace) && <p className="text-xs mt-1 opacity-60">溯源: {String(a.trace)}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">当前无异常赔付记�?/p>
        )}

        <AIAnalysisCard data={{
          overview: `共检测到${anomalies.length}条异常记录，其中紧�?{summary.black || 0}条`,
          plainTalk: anomalies.length > 0 ? '有些赔付不正常，需要老板亲自过问' : '目前一切正常，没有异常赔付',
          problem: summary.black && summary.black > 0 ? '存在黑色紧急级别异常，需要立即处�? : '异常等级在可控范围内',
          action: '建议对紧急异常逐笔核查，完善审批流程，堵住漏洞',
        }} />
      </div>

      {/* 审批溯源 */}
      {approvalTraces.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-4">审批溯源</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-gray-500"><th className="text-left py-2 px-2">金额</th><th className="text-left py-2 px-2">状�?/th><th className="text-left py-2 px-2">提交�?/th><th className="text-left py-2 px-2">审批�?/th><th className="text-left py-2 px-2">时间</th></tr></thead>
              <tbody>
                {approvalTraces.map((t, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-2 font-medium">¥{Number(t.amount || 0).toFixed(2)}</td>
                    <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      t.status === 'approved' ? 'bg-green-100 text-green-700' :
                      t.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{t.status as string}</span></td>
                    <td className="py-2 px-2">{(t.submittedBy as string)?.slice(0, 8) || '-'}</td>
                    <td className="py-2 px-2">{(t.approvedBy as string)?.slice(0, 8) || '-'}</td>
                    <td className="py-2 px-2 text-gray-400">{(t.createdAt as string)?.split('T')[0] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-right">
        <Link href="/cost-alert" className="text-sm text-sky-600 hover:text-sky-700 inline-flex items-center gap-1">
          查看详情 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─── 4. 单品盈利损耗漏�?─── */
function ProfitFunnelView({ data, companyId }: { data: Record<string, unknown> | undefined; companyId: string }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ productName: '', sku: '', sellPrice: '', costPrice: '', afterSaleLoss: '' });

  if (!data) return <div className="text-center py-10 text-gray-400">暂无数据</div>;

  const products = (data.products as Array<Record<string, unknown>>) || [];
  const distribution = (data.distribution as Record<string, number>) || {};

  const levelColors: Record<string, string> = {
    '暴利': 'bg-green-100 text-green-800',
    '平利': 'bg-blue-100 text-blue-800',
    '保本': 'bg-yellow-100 text-yellow-800',
    '亏损': 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      {/* 分布统计 */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(distribution).map(([level, count]) => (
          <div key={level} className={`rounded-xl border p-4 text-center ${levelColors[level] || 'bg-gray-100'}`}>
            <div className="text-2xl font-bold">{count as number}</div>
            <div className="text-sm mt-1">{level}</div>
          </div>
        ))}
      </div>

      {/* 添加产品 */}
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(!showAddForm)} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-900">
          <Plus className="w-4 h-4" />添加产品
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input placeholder="产品名称" className="border rounded-lg px-3 py-2" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} />
            <input placeholder="SKU(选填)" className="border rounded-lg px-3 py-2" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            <input placeholder="售价" type="number" className="border rounded-lg px-3 py-2" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} />
            <input placeholder="进货成本" type="number" className="border rounded-lg px-3 py-2" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
            <input placeholder="售后损�? type="number" className="border rounded-lg px-3 py-2" value={form.afterSaleLoss} onChange={e => setForm({ ...form, afterSaleLoss: e.target.value })} />
          </div>
          <button onClick={async () => {
            await fetch('/api/profit-funnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'upsert', company_id: companyId, ...form }) });
            setShowAddForm(false); setForm({ productName: '', sku: '', sellPrice: '', costPrice: '', afterSaleLoss: '' });
            window.location.reload();
          }} className="mt-3 bg-blue-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-900">保存</button>
        </div>
      )}

      {/* 产品列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b text-gray-600">
            <th className="text-left py-3 px-4">产品</th>
            <th className="text-right py-3 px-4">售价</th>
            <th className="text-right py-3 px-4">成本</th>
            <th className="text-right py-3 px-4">售后损�?/th>
            <th className="text-right py-3 px-4">净�?/th>
            <th className="text-right py-3 px-4">利润�?/th>
            <th className="text-center py-3 px-4">等级</th>
          </tr></thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{p.productName as string}</td>
                <td className="py-3 px-4 text-right">¥{Number(p.sellPrice || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right">¥{Number(p.costPrice || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-red-600">¥{Number(p.afterSaleLoss || 0).toFixed(2)}</td>
                <td className={`py-3 px-4 text-right font-bold ${Number(p.netProfit) > 0 ? 'text-green-600' : 'text-red-600'}`}>¥{Number(p.netProfit || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right">{Number(p.profitRate || 0).toFixed(1)}%</td>
                <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${levelColors[p.profitLevel as string] || ''}`}>{p.profitLevel as string}</span></td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">暂无产品数据，点击上�?添加产品"录入</td></tr>}
          </tbody>
        </table>
      </div>

      <AIAnalysisCard data={{
        overview: `�?{products.length}个产品，亏损产品${distribution['亏损'] || 0}个`,
        plainTalk: distribution['亏损'] && distribution['亏损'] > 0 ? '有几个产品在亏钱，卖得越多亏得越�? : '目前产品都还在赚钱，但要注意售后损�?,
        problem: distribution['亏损'] && distribution['亏损'] > 0 ? `${distribution['亏损']}个产品处于亏损状态，售后损耗是主要原因` : '暂无亏损产品',
        action: '重点管控亏损产品售后环节，考虑调整定价或优化产品质�?,
      }} />
      <div className="mt-4 text-right">
        <Link href="/approval" className="text-sm text-sky-600 hover:text-sky-700 inline-flex items-center gap-1">
          查看赔付审批 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─── 5. 赔付审批�?─── */
function ApprovalView({ data, companyId }: { data: Record<string, unknown> | undefined; companyId: string }) {
  const [showThresholdForm, setShowThresholdForm] = useState(false);

  if (!data) return <div className="text-center py-10 text-gray-400">暂无数据</div>;

  const threshold = data.threshold as { managerLimit: number; bossLimit: number; bossPlusNote: boolean };
  const flows = (data.flows as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-6">
      {/* 审批阈值配�?*/}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">审批阈值配�?/h3>
          <button onClick={() => setShowThresholdForm(!showThresholdForm)} className="text-blue-700 text-sm font-medium flex items-center gap-1">
            <Settings className="w-4 h-4" />配置
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-sm text-blue-600">主管可批</div>
            <div className="text-xl font-bold text-blue-800">≤¥{threshold?.managerLimit || 500}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-sm text-orange-600">需老板�?/div>
            <div className="text-xl font-bold text-orange-800">¥{threshold?.managerLimit || 500}-¥{threshold?.bossLimit || 2000}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-sm text-red-600">老板+备注</div>
            <div className="text-xl font-bold text-red-800">&gt;¥{threshold?.bossLimit || 2000}</div>
          </div>
        </div>
      </div>

      {/* 审批列表 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-4">审批记录（不可删除，仅可查看�?/h3>
        {flows.length > 0 ? (
          <div className="space-y-3">
            {flows.map((f) => (
              <div key={f.id as string} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      f.status === 'approved' || f.status === 'auto_approved' ? 'bg-green-100 text-green-700' :
                      f.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {f.status === 'auto_approved' ? '自动通过' : (f.status as string) === 'approved' ? '已通过' : (f.status as string) === 'rejected' ? '已拒�? : '待审�?}
                    </span>
                    <span className="font-bold text-gray-900">¥{Number(f.amount || 0).toFixed(2)}</span>
                  </div>
                  <span className="text-sm text-gray-400">{(f.createdAt as string)?.split('T')[0]}</span>
                </div>
                {String(f.reason) && <p className="text-sm text-gray-600 mt-2">原因: {String(f.reason)}</p>}
                {String(f.approvedBy) && <p className="text-xs text-gray-400 mt-1">审批�? {String(f.approvedBy).slice(0, 8)} | 审批时间: {String(f.approvedAt)?.split('T')[0]}</p>}
                {String(f.rejectReason) && <p className="text-xs text-red-600 mt-1">拒绝原因: {String(f.rejectReason)}</p>}

                {/* 审批操作 */}
                {f.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={async () => {
                      await fetch('/api/approval', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, action: 'approve', approved_by: 'boss' }) });
                      window.location.reload();
                    }} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />通过
                    </button>
                    <button onClick={async () => {
                      const reason = prompt('请输入拒绝原�?');
                      if (!reason) return;
                      await fetch('/api/approval', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, action: 'reject', approved_by: 'boss', reject_reason: reason }) });
                      window.location.reload();
                    }} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />拒绝
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">暂无审批记录</p>
        )}
      </div>
    </div>
  );
}

/* ─── 6. 资金周报 ─── */
function WeeklyReportView({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return <div className="text-center py-10 text-gray-400">暂无数据</div>;

  return (
    <div className="space-y-6">
      <div className="bg-blue-800 text-white rounded-xl p-6">
        <h3 className="text-lg font-bold mb-1">本周资金周报</h3>
        <p className="text-blue-200 text-sm">{data.weekStart as string} ~ {data.weekEnd as string}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BigNumberCard label="本周售后亏损总额" value={`¥${Number(data.totalLoss || 0).toFixed(2)}`} change={Number(data.lossChangePercent || 0)} icon={DollarSign} />
        <BigNumberCard label="AI替代人工时长" value={`${data.aiSavingMinutes || 0}`} unit="分钟" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" />高危异常赔付</h4>
          <p className="text-gray-600">本周异常赔付{data.anomalyCount as number || 0}�?/p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" />AI使用统计</h4>
          <p className="text-gray-600">AI急救站使用{data.aiUsageCount as number || 0}次，估算节省{data.aiSavingMinutes as number || 0}分钟</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-bold text-gray-900 mb-3">下周风控优化建议</h4>
        <p className="text-gray-700">{(data.suggestions as string) || '暂无建议'}</p>
      </div>
    </div>
  );
}
