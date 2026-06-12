'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import {
  TrendingUp, Save, Target, Route, BarChart3,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
  ArrowDown, ArrowUp, Minus, ShieldCheck, BookOpen, FileText, Zap, Wrench
} from 'lucide-react';

/* ══════�?类型定义 ══════�?*/
interface GoalMetric {
  metric: string;
  target: number;
  actual: number;
  unit: string;
  inverse?: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

interface MeasureItem {
  type: '审批�? | '培训' | '快捷�? | 'SOP' | '其他';
  description: string;
  relatedMetrics: string[];
  status: '已完�? | '进行�? | '未开�?;
}

interface CostSource {
  category: string;
  baselineAmount: number;
  currentAmount: number;
  savedAmount: number;
  savedPercent: number;
}

/* ══════�?Mock数据 ══════�?*/
const MOCK_GOALS: GoalMetric[] = [
  { metric: '赔付率降�?, target: 25, actual: 38, unit: '%', inverse: false, icon: Target, iconColor: 'text-sky-400', iconBg: 'bg-sky-400/10' },
  { metric: '退款率降幅', target: 25, actual: 20, unit: '%', inverse: false, icon: ShieldCheck, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-400/10' },
  { metric: '响应时长降幅', target: 30, actual: 45, unit: '%', inverse: false, icon: Zap, iconColor: 'text-amber-400', iconBg: 'bg-amber-400/10' },
  { metric: '满意度提�?, target: 15, actual: 12, unit: '%', inverse: false, icon: TrendingUp, iconColor: 'text-violet-400', iconBg: 'bg-violet-400/10' },
];

const MEASURE_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  '审批�?: { color: 'text-blue-300', bg: 'bg-blue-500/20', icon: ShieldCheck },
  '培训':   { color: 'text-emerald-300', bg: 'bg-emerald-500/20', icon: BookOpen },
  '快捷�?: { color: 'text-amber-300', bg: 'bg-amber-500/20', icon: Zap },
  'SOP':    { color: 'text-violet-300', bg: 'bg-violet-500/20', icon: FileText },
  '其他':   { color: 'text-gray-300', bg: 'bg-gray-500/20', icon: Wrench },
};

const MOCK_MEASURES: MeasureItem[] = [
  { type: '审批�?, description: '退款审批流程优化，减少人工审批环节', relatedMetrics: ['退款率降幅'], status: '已完�? },
  { type: 'SOP', description: '建立售后标准处理流程，统一赔付口径', relatedMetrics: ['赔付率降�?], status: '已完�? },
  { type: '培训', description: '新员工上岗前完成售后场景培训考核', relatedMetrics: ['满意度提�?, '响应时长降幅'], status: '进行�? },
  { type: '快捷�?, description: '配置常见问题快捷回复模板50�?, relatedMetrics: ['响应时长降幅'], status: '已完�? },
  { type: '审批�?, description: '大额赔付多级审核机制上线', relatedMetrics: ['赔付率降�?], status: '已完�? },
  { type: '培训', description: '每周质检案例复盘培训', relatedMetrics: ['满意度提�?], status: '进行�? },
  { type: '快捷�?, description: '物流异常场景话术模板升级', relatedMetrics: ['退款率降幅'], status: '未开�? },
  { type: 'SOP', description: '客诉升级处理流程文档�?, relatedMetrics: ['满意度提�?, '赔付率降�?], status: '进行�? },
];

const MOCK_COST_SOURCES: CostSource[] = [
  { category: '赔付成本', baselineAmount: 15000, currentAmount: 9300, savedAmount: 5700, savedPercent: 38 },
  { category: '退款损�?, baselineAmount: 12000, currentAmount: 9600, savedAmount: 2400, savedPercent: 20 },
  { category: '人力成本', baselineAmount: 8000, currentAmount: 4400, savedAmount: 3600, savedPercent: 45 },
  { category: '时间成本', baselineAmount: 5000, currentAmount: 2750, savedAmount: 2250, savedPercent: 45 },
  { category: '客诉成本', baselineAmount: 3000, currentAmount: 2200, savedAmount: 800, savedPercent: 27 },
];

const REVIEW_QUESTIONS = [
  '1. 这个指标未达标的主要原因是什么？',
  '2. 是否有外部因素影响了结果�?,
  '3. 已采取的措施中哪些效果不明显�?,
  '4. 团队执行中遇到了什么阻碍？',
  '5. 是否需要调整目标值？',
  '6. 下一步的具体改进行动是什么？',
  '7. 谁负责跟进改善？截止时间�?,
  '8. 如何确保改善措施能落地执行？',
];

/* ══════�?工具函数 ══════�?*/
const isAchieved = (m: { actual: number; target: number; inverse?: boolean }) =>
  m.inverse ? m.actual <= m.target : m.actual >= m.target;

const getStatus = (m: { actual: number; target: number; inverse?: boolean }) => {
  if (isAchieved(m)) return 'green';
  const ratio = m.inverse ? m.target / m.actual : m.actual / m.target;
  return ratio >= 0.8 ? 'yellow' : 'red';
};

const STATUS_LIGHT: Record<string, string> = { green: '🟢', yellow: '🟡', red: '🔴' };

const formatMoney = (n: number) => n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`;

const STATUS_BADGE: Record<string, { text: string; color: string }> = {
  '已完�?: { text: '已完�?, color: 'text-emerald-300 bg-emerald-500/20' },
  '进行�?: { text: '进行�?, color: 'text-amber-300 bg-amber-500/20' },
  '未开�?: { text: '未开�?, color: 'text-gray-400 bg-gray-500/20' },
};

export default function CostBaselinePage() {
  const { profile, authFetch } = useAuth();
  const [form, setForm] = useState({ compRate: '', refundRate: '', responseTime: '', satisfaction: '', systemFee: '299' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  if (profile?.role !== 'enterprise_admin') {
    return <PermissionLocked title="降本对比" description="此功能仅对旗舰版老板开�? />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/cockpit?company_id=${companyId}&module=cost-compare`);
      const json = await res.json();
      if (json.data?.baseline && json.data.hasBaseline) {
        const b = json.data.baseline as Record<string, number>;
        setForm({
          compRate: String(b.compensationRate || ''),
          refundRate: String(b.refundRate || ''),
          responseTime: String(b.responseTime || ''),
          satisfaction: String(b.satisfaction || ''),
          systemFee: String(b.systemFee || '299'),
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  /* 统计 */
  const achievementRate = Math.round(MOCK_GOALS.filter(isAchieved).length / MOCK_GOALS.length * 100);
  const totalSaved = MOCK_COST_SOURCES.reduce((s, c) => s + c.savedAmount, 0);
  const totalBaseline = MOCK_COST_SOURCES.reduce((s, c) => s + c.baselineAmount, 0);
  const totalCurrent = MOCK_COST_SOURCES.reduce((s, c) => s + c.currentAmount, 0);
  const overallSavedPercent = totalBaseline > 0 ? Math.round(totalSaved / totalBaseline * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <TrendingUp className="w-8 h-8 text-sky-400" />
          降本对比
        </h1>

        {loading ? (
          <div className="text-center py-20 text-white/40 text-lg">加载�?..</div>
        ) : (
          <div className="space-y-10">

            {/* ══════�?🎯 目标板块 ══════�?*/}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                <span className="text-3xl">🎯</span> 降本目标
              </h2>
              <p className="text-white/50 text-base mb-5">对比基期（上线前），各核心指标的目标降幅</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MOCK_GOALS.map((g) => {
                  const status = getStatus(g);
                  const achieved = isAchieved(g);
                  const Icon = g.icon;
                  return (
                    <div
                      key={g.metric}
                      className={`rounded-xl border p-5 ${achieved ? 'border-emerald-500/30 bg-emerald-500/5' : status === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${g.iconBg}`}>
                            <Icon className={`w-5 h-5 ${g.iconColor}`} />
                          </div>
                          <span className="text-lg font-semibold">{g.metric}</span>
                        </div>
                        <span className="text-2xl">{STATUS_LIGHT[status]}</span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-bold">{g.actual}</span>
                        <span className="text-white/50 text-lg">{g.unit}</span>
                      </div>
                      <div className="text-base text-white/50">
                        目标 ≥{g.target}{g.unit}
                        {!achieved && (
                          <span className="text-red-400 ml-2">
                            �?{g.target - g.actual}{g.unit}
                          </span>
                        )}
                      </div>
                      {/* 复盘入口 */}
                      {!achieved && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpandedReview(expandedReview === g.metric ? null : g.metric)}
                            className="text-red-400 hover:text-red-300 text-base font-medium flex items-center gap-1"
                          >
                            ⚠️ 未达�?�?查看复盘
                            {expandedReview === g.metric ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          {expandedReview === g.metric && (
                            <div className="mt-3 bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-2">
                              {REVIEW_QUESTIONS.map((q, i) => (
                                <div key={i} className="text-white/60 text-base flex items-start gap-2">
                                  <span className="text-white/30 mt-0.5 shrink-0">�?/span>
                                  <span>{q}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <hr className="border-gray-800" />

            {/* ══════�?🛤�?路径板块 ══════�?*/}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                <span className="text-3xl">🛤�?/span> 降本路径
              </h2>
              <p className="text-white/50 text-base mb-5">各类降本举措及执行情�?/p>

              {/* 举措统计 */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
                  <div className="text-3xl font-bold text-emerald-400">{MOCK_MEASURES.filter(m => m.status === '已完�?).length}</div>
                  <div className="text-white/50 text-base mt-1">已完�?/div>
                </div>
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
                  <div className="text-3xl font-bold text-amber-400">{MOCK_MEASURES.filter(m => m.status === '进行�?).length}</div>
                  <div className="text-white/50 text-base mt-1">进行�?/div>
                </div>
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
                  <div className="text-3xl font-bold text-gray-400">{MOCK_MEASURES.filter(m => m.status === '未开�?).length}</div>
                  <div className="text-white/50 text-base mt-1">未开�?/div>
                </div>
              </div>

              {/* 举措时间�?*/}
              <div className="space-y-3">
                {MOCK_MEASURES.map((m, idx) => {
                  const cfg = MEASURE_TYPE_CONFIG[m.type];
                  const TypeIcon = cfg.icon;
                  const badge = STATUS_BADGE[m.status];
                  return (
                    <div key={idx} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                      <div className="flex items-start gap-4">
                        {/* 时间线圆�?*/}
                        <div className="flex flex-col items-center mt-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg}`}>
                            <TypeIcon className={`w-5 h-5 ${cfg.color}`} />
                          </div>
                          {idx < MOCK_MEASURES.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-700 mt-2" />
                          )}
                        </div>
                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.bg} ${cfg.color}`}>
                              {m.type}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                              {badge.text}
                            </span>
                          </div>
                          <p className="text-lg text-white/80 mb-2">{m.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white/30 text-sm">关联指标�?/span>
                            {m.relatedMetrics.map(rm => (
                              <span key={rm} className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-sm">
                                {rm}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <hr className="border-gray-800" />

            {/* ══════�?📊 结果板块 ══════�?*/}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                <span className="text-3xl">📊</span> 降本结果
              </h2>

              {/* 总览 */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/50 text-base">综合降本达标�?/p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-bold text-sky-400">{achievementRate}%</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-base">{MOCK_GOALS.filter(isAchieved).length}项达�?/span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-base">{MOCK_GOALS.filter(m => !isAchieved(m)).length}项未达标</span>
                    </div>
                  </div>
                </div>
                {/* 进度�?*/}
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${achievementRate >= 80 ? 'bg-emerald-500' : achievementRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${achievementRate}%` }}
                  />
                </div>
              </div>

              {/* 总体降本金额 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 text-center">
                  <p className="text-white/50 text-base mb-1">基期总成�?/p>
                  <p className="text-2xl font-bold text-white/70">{formatMoney(totalBaseline)}</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 text-center">
                  <p className="text-white/50 text-base mb-1">当前总成�?/p>
                  <p className="text-2xl font-bold text-white">{formatMoney(totalCurrent)}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-5 text-center">
                  <p className="text-emerald-300 text-base mb-1">累计节省</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatMoney(totalSaved)}</p>
                  <p className="text-emerald-300/70 text-base mt-1">降幅 {overallSavedPercent}%</p>
                </div>
              </div>

              {/* 核心降本来源 */}
              <h3 className="text-lg font-semibold text-white/70 mb-4">核心降本来源</h3>
              <div className="space-y-3">
                {MOCK_COST_SOURCES.map((src) => {
                  const isGood = src.savedPercent >= 25;
                  return (
                    <div key={src.category} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold">{src.category}</span>
                          {isGood ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-sm">
                              <ArrowDown className="w-4 h-4" />达标
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-sm">
                              <AlertTriangle className="w-4 h-4" />未达�?
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
                            ↓{src.savedPercent}%
                          </span>
                        </div>
                      </div>
                      {/* 对比�?*/}
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-white/40 text-sm">基期</p>
                          <p className="text-lg font-semibold text-white/60">{formatMoney(src.baselineAmount)}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-sm">当前</p>
                          <p className="text-lg font-semibold">{formatMoney(src.currentAmount)}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isGood ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(src.savedPercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-white/40 text-sm mt-1">节省 {formatMoney(src.savedAmount)}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <hr className="border-gray-800" />

            {/* ══════�?📌 下月方向 ══════�?*/}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-5">
                <span className="text-3xl">📌</span> 下月方向
              </h2>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                {MOCK_GOALS.filter(m => !isAchieved(m)).length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-white/60 text-lg">基于本月偏差，建议重点关注：</p>
                    <ul className="space-y-3">
                      {MOCK_GOALS.filter(m => !isAchieved(m)).map(m => (
                        <li key={m.metric} className="flex items-start gap-3">
                          <AlertTriangle className="w-6 h-6 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-lg font-semibold text-amber-300">{m.metric}</p>
                            <p className="text-white/50 text-base">
                              当前{m.actual}{m.unit}，目标≥{m.target}{m.unit}，差距{m.target - m.actual}{m.unit}。建议加强相关培训与流程优化�?
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <p className="text-white/40 text-base">
                        优先执行未开始的降本举措（如：{MOCK_MEASURES.filter(m => m.status === '未开�?).map(m => m.description).join('�?)}），并持续推进进行中的项目�?
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-emerald-400 text-lg">本月所有降本目标已达标，下月可挑战更高目标�?/p>
                )}
              </div>
            </section>

            <hr className="border-gray-800" />

            {/* ══════�?原有功能：基线数据设�?══════�?*/}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-5">
                <span className="text-3xl">⚙️</span> 基线数据设置
              </h2>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-5">
                <p className="text-yellow-200 font-medium text-base">录入上线前（未使用系统时）的数据指标作为基线，系统将自动与当前数据对比，展示降本效果</p>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium text-white/70 mb-2">上线前赔付率(%)</label>
                    <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white placeholder-white/30" placeholder="�? 8.5" value={form.compRate} onChange={e => { setForm({ ...form, compRate: e.target.value }); setSaved(false); }} />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-white/70 mb-2">上线前退款率(%)</label>
                    <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white placeholder-white/30" placeholder="�? 5.2" value={form.refundRate} onChange={e => { setForm({ ...form, refundRate: e.target.value }); setSaved(false); }} />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-white/70 mb-2">上线前平均响应时�?分钟)</label>
                    <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white placeholder-white/30" placeholder="�? 15" value={form.responseTime} onChange={e => { setForm({ ...form, responseTime: e.target.value }); setSaved(false); }} />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-white/70 mb-2">上线前客户满意度(%)</label>
                    <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white placeholder-white/30" placeholder="�? 85" value={form.satisfaction} onChange={e => { setForm({ ...form, satisfaction: e.target.value }); setSaved(false); }} />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-white/70 mb-2">系统月费(�?</label>
                    <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white placeholder-white/30" placeholder="299" value={form.systemFee} onChange={e => { setForm({ ...form, systemFee: e.target.value }); setSaved(false); }} />
                  </div>
                </div>

                <button onClick={async () => {
                  await authFetch('/api/cost-baseline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ company_id: companyId, compRate: Number(form.compRate) || null, refundRate: Number(form.refundRate) || null, responseTime: Number(form.responseTime) || null, satisfaction: Number(form.satisfaction) || null, systemFee: Number(form.systemFee) || 299 }),
                  });
                  setSaved(true);
                }} className="bg-blue-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-900 flex items-center gap-2 text-lg">
                  <Save className="w-6 h-6" />{saved ? '已保�? : '保存基线数据'}
                </button>
              </div>

              <div className="text-center mt-4">
                <a href="/cockpit" className="text-sky-400 font-medium underline text-base hover:text-sky-300">返回驾驶舱查看对比效�?�?/a>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
