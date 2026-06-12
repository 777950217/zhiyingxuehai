'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  DollarSign, Target, Bot, ShieldAlert, ShieldCheck,
  ArrowUpRight, ArrowDownRight, Minus,
  Lock, Lightbulb, ChevronDown, ChevronUp, AlertTriangle,
  BookOpen, ClipboardCheck, RefreshCw, AlertCircle, MoreHorizontal,
  CheckCircle2, XCircle,
} from 'lucide-react';

/* ========== 类型定义 ========== */

interface BossWeeklyData {
  weekStart: string;
  weekEnd: string;
  loss: { value: number; change: number };
  kpi: { value: number; change: number };
  ai: { hours: number; creditsUsed: number };
  anomaly: { hasAnomaly: boolean; count: number; details: { amount: number; category: string; date: string }[] };
  totalSaved: number;
  hourlyRate: number;
}

interface PathAction {
  type: '培训' | '质检' | '流程' | '异常' | '其他';
  description: string;
  relatedMetrics: string[];
  date: string;
}

interface ResultMetric {
  metric: string;
  target: number;
  actual: number;
  unit: string;
  inverse?: boolean; // 越小越好的指�?
}

/* ========== 常量 ========== */

const ACTION_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: typeof BookOpen }> = {
  '培训': { color: 'text-blue-400', bg: 'bg-blue-400/15', icon: BookOpen },
  '质检': { color: 'text-purple-400', bg: 'bg-purple-400/15', icon: ClipboardCheck },
  '流程': { color: 'text-sky-400', bg: 'bg-sky-400/15', icon: RefreshCw },
  '异常': { color: 'text-red-400', bg: 'bg-red-400/15', icon: AlertCircle },
  '其他': { color: 'text-white/60', bg: 'bg-white/10', icon: MoreHorizontal },
};

const STATUS_LIGHT: Record<string, string> = { green: '🟢', yellow: '🟡', red: '🔴' };

// Mock路径数据
const MOCK_PATH_ACTIONS: PathAction[] = [
  { type: '培训', description: '完成售后话术专题培训，覆�?名客�?, relatedMetrics: ['客户满意�?, '首响时效'], date: '周一' },
  { type: '质检', description: '抽检本周20通录音，2通不达标需跟进', relatedMetrics: ['质检合格�?], date: '周二' },
  { type: '流程', description: '优化退货处理SOP，平均处理时长缩�?5%', relatedMetrics: ['工单关闭�?, '处理时长'], date: '周三' },
  { type: '异常', description: '发现马桶品类退款率异常升高，已安排排查', relatedMetrics: ['退款率', '赔付金额'], date: '周四' },
  { type: '培训', description: '新员工入职流程第2阶段考核通过', relatedMetrics: ['培训达标�?], date: '周五' },
];

// Mock结果数据 �?actual�?时由API数据填充或使用占位�?
const MOCK_RESULT_METRICS: ResultMetric[] = [
  { metric: '团队KPI达标�?, target: 80, actual: 0, unit: '%', inverse: false },
  { metric: '赔付金额', target: 5000, actual: 0, unit: '�?, inverse: true },
  { metric: '首响时效', target: 30, actual: 0, unit: '�?, inverse: true },
  { metric: '工单关闭�?, target: 95, actual: 0, unit: '%', inverse: false },
  { metric: '客户好评�?, target: 90, actual: 0, unit: '%', inverse: false },
  { metric: '退款率', target: 3, actual: 0, unit: '%', inverse: true },
];

// 稳定占位数据（不依赖random�?
const FALLBACK_ACTUAL: Record<string, number> = {
  '首响时效': 28,
  '工单关闭�?: 92,
  '客户好评�?: 87,
  '退款率': 4.2,
};

const DAILY_TIPS = [
  '本周赔付率偏高，建议重点检�?星以下差评的响应时效',
  '团队平均响应时间达标，可以尝试缩短首响目标到30�?,
  '某员工质检分数连续3天低�?0分，建议1�?沟�?,
  '本周工单关闭�?0%+，建议把优秀案例加入知识�?,
  '检测到近期退换货集中在某SKU，建议排查产品质�?,
  '本周客户好评率上升，建议在话术中加入好评引导策略',
  '团队AI使用率偏低，建议在晨会中演示AI急救站操�?,
  '本周超时工单占比偏高，建议调整工单分配规�?,
  '发现高频客诉场景缺少标准话术，建议补充话术库',
  '近期退款原因中"描述不符"占比上升，建议优化产品详情页',
  '本周团队响应速度提升明显，可以挑战更高的服务标准',
  '个别客服态度类差评增加，建议加强服务意识培训',
];

const REVIEW_QUESTIONS = [
  '1. 这个指标没达标，最直接的原因是什么？',
  '2. 是偶发还是持续性问题？',
  '3. 哪个环节/人员影响最大？',
  '4. 之前有做过什么改善措施？效果如何�?,
  '5. 现在还能做什么补救？',
  '6. 下周可以预防的改进点是什么？',
  '7. 需要谁配合？需要什么资源？',
  '8. 如果再发生，预案是什么？',
];

/* ========== 主组�?========== */

export default function BossWeeklyPage() {
  const { profile, authFetch } = useAuth();
  const userRole = profile?.role || '';
  const isEntManager = userRole === 'enterprise_manager';
  const isProVersion = profile?.userType === 'manager';

  const [data, setData] = useState<BossWeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/boss-weekly?company_id=${profile.companyId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [profile?.companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  // 权限守卫
  if (!isEntManager || !isProVersion) {
    return (
      <div className="min-h-screen bg-[#0B1929] flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-14 h-14 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-xl">经营周览仅对专业版主管开�?/p>
        </div>
      </div>
    );
  }

  const todayTip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];
  const formatMoney = (v: number) => v >= 10000 ? `¥${(v / 10000).toFixed(1)}万` : `¥${v.toFixed(0)}`;

  // 判断是否达标
  const isAchieved = (m: ResultMetric) =>
    m.inverse ? m.actual <= m.target : m.actual >= m.target;

  // 合并API真实数据 + 稳定占位
  const resultMetrics: ResultMetric[] = MOCK_RESULT_METRICS.map(m => {
    if (data && m.metric === '团队KPI达标�?) return { ...m, actual: data.kpi.value };
    if (data && m.metric === '赔付金额') return { ...m, actual: data.loss.value };
    if (m.actual > 0) return m;
    return { ...m, actual: FALLBACK_ACTUAL[m.metric] ?? m.target };
  });

  // 综合达标�?
  const achievementRate = resultMetrics.length > 0
    ? Math.round(resultMetrics.filter(isAchieved).length / resultMetrics.length * 100)
    : 0;

  // 目标卡片
  const goalCards = data ? [
    {
      icon: Target,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-400/10',
      label: '团队KPI达标�?,
      targetValue: '80%',
      isSystemRecommended: true,
      status: data.kpi.value >= 80 ? 'green' : data.kpi.value >= 60 ? 'yellow' : 'red',
      statusText: data.kpi.value >= 80 ? '达标' : data.kpi.value >= 60 ? '接近' : '未达�?,
    },
    {
      icon: DollarSign,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-400/10',
      label: '赔付金额',
      targetValue: '¥5,000',
      isSystemRecommended: true,
      status: data.loss.value <= 5000 ? 'green' : data.loss.value <= 8000 ? 'yellow' : 'red',
      statusText: data.loss.value <= 5000 ? '达标' : data.loss.value <= 8000 ? '接近' : '未达�?,
    },
    {
      icon: Bot,
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-400/10',
      label: 'AI提效时长',
      targetValue: '10小时',
      isSystemRecommended: true,
      status: data.ai.hours >= 10 ? 'green' : data.ai.hours >= 6 ? 'yellow' : 'red',
      statusText: data.ai.hours >= 10 ? '达标' : data.ai.hours >= 6 ? '接近' : '未达�?,
    },
    {
      icon: data.anomaly.hasAnomaly ? ShieldAlert : ShieldCheck,
      iconColor: data.anomaly.hasAnomaly ? 'text-red-400' : 'text-emerald-400',
      iconBg: data.anomaly.hasAnomaly ? 'bg-red-400/10' : 'bg-emerald-400/10',
      label: '风控状�?,
      targetValue: '0笔异�?,
      isSystemRecommended: false,
      status: data.anomaly.hasAnomaly ? 'red' : 'green',
      statusText: data.anomaly.hasAnomaly ? '未达�? : '达标',
    },
  ] : [];

  const ChangeIndicator = ({ value, invert = false }: { value: number; invert?: boolean }) => {
    if (value === 0) return <span className="text-gray-400 text-base"><Minus className="w-4 h-4 inline" /> 持平</span>;
    const isPositive = invert ? value < 0 : value > 0;
    const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
    const color = isPositive ? 'text-emerald-400' : 'text-red-400';
    return (
      <span className={`flex items-center gap-1 text-base font-medium ${color}`}>
        <Icon className="w-4 h-4" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1929] p-4 md:p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">经营周览</h1>
        <p className="text-white/50 mt-2 text-base">
          {data ? `${data.weekStart} ~ ${data.weekEnd}` : '加载�?..'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400" />
        </div>
      ) : !data ? (
        <div className="text-center py-24 text-white/50 text-xl">暂无数据</div>
      ) : (
        <div className="space-y-10">

          {/* ══════�?🎯 目标板块 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🎯</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">本周目标</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {goalCards.map((card) => (
                <div key={card.label} className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                        <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                      <span className="text-white/70 text-lg font-medium">{card.label}</span>
                    </div>
                    <span className="text-2xl">{STATUS_LIGHT[card.status]}</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-4xl font-bold text-white mb-2">{card.targetValue}</p>
                    <p className="text-white/50 text-base">
                      状态：<span className={`font-semibold ${card.status === 'green' ? 'text-emerald-400' : card.status === 'yellow' ? 'text-yellow-400' : 'text-red-400'}`}>{card.statusText}</span>
                    </p>
                  </div>
                  {card.isSystemRecommended && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-sky-400/60" />
                      <span className="text-sky-400/70 text-sm">系统推荐</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-white/40 text-sm mt-4 text-center">💡 目标值可在KPI管理中设�?/p>
          </section>

          {/* 分隔�?*/}
          <hr className="border-white/10" />

          {/* ══════�?🛤�?路径板块 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🛤�?/span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">本周路径</h2>
            </div>

            <div className="relative pl-10">
              {/* 时间线竖�?*/}
              <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-white/10" />

              <div className="space-y-5">
                {MOCK_PATH_ACTIONS.map((action, idx) => {
                  const config = ACTION_TYPE_CONFIG[action.type];
                  const TypeIcon = config.icon;
                  return (
                    <div key={idx} className="relative flex items-start gap-5">
                      {/* 时间线节�?*/}
                      <div className={`absolute -left-6 top-2 w-5 h-5 rounded-full ${config.bg} border-2 border-white/20 flex items-center justify-center`}>
                        <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                      </div>

                      {/* 动作卡片 */}
                      <div className="flex-1 bg-[#0F2B46] border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${config.color} ${config.bg}`}>
                            <TypeIcon className="w-4 h-4" />
                            {action.type}
                          </span>
                          <span className="text-white/40 text-sm">{action.date}</span>
                        </div>
                        <p className="text-white/80 text-lg leading-relaxed">{action.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {action.relatedMetrics.map(metric => (
                            <span key={metric} className="px-2.5 py-1 rounded-md text-sm bg-white/5 text-white/50">
                              📊 {metric}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 分隔�?*/}
          <hr className="border-white/10" />

          {/* ══════�?📊 结果板块 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📊</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">本周结果</h2>
            </div>

            {/* 综合达标�?*/}
            <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/70 text-lg font-medium">综合达标�?/span>
                <span className="text-4xl font-bold text-sky-400">{achievementRate}%</span>
              </div>
              <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${achievementRate >= 80 ? 'bg-emerald-400' : achievementRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${achievementRate}%` }}
                />
              </div>
            </div>

            {/* 目标 vs 实际对比卡片 */}
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
                      <span className="text-3xl font-bold text-white">{m.actual}{m.unit}</span>
                      <span className="text-white/40 text-base">/ 目标 {m.target}{m.unit}</span>
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
          </section>

          {/* 分隔�?*/}
          <hr className="border-white/10" />

          {/* ══════�?原有功能：每日AI建议 + 异常详情 + 节省统计 ══════�?*/}

          {/* 每日1条AI建议 */}
          <div className="bg-sky-500/10 border border-sky-400/20 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-sky-500/20 shrink-0">
              <Lightbulb className="w-7 h-7 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sky-400 text-base font-semibold">每日1条AI建议</span>
                <span className="text-white/30 text-sm">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
              </div>
              <p className="text-white/80 text-lg leading-relaxed">{todayTip}</p>
            </div>
          </div>

          {/* 异常详情 */}
          {data.anomaly.hasAnomaly && data.anomaly.details.length > 0 && (
            <div className="bg-red-400/5 border border-red-400/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-semibold text-red-400">异常赔付详情</h2>
              </div>
              <div className="space-y-2">
                {data.anomaly.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between bg-red-400/5 border border-red-400/10 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-red-400/20 text-red-400 text-sm flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-white/70 text-base">{d.category || '未分�?}</span>
                      <span className="text-white/40 text-sm">{d.date}</span>
                    </div>
                    <span className="text-red-400 font-semibold text-lg">{formatMoney(d.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-sm mt-3">以上赔付超过审批阈值且未走审批流程，请及时处理</p>
            </div>
          )}

          {/* 底部省钱大字 */}
          <div className="bg-gradient-to-r from-sky-900/40 to-violet-900/40 border border-sky-400/20 rounded-2xl p-8 text-center">
            <p className="text-white/50 text-base mb-2">本周系统为您节省�?/p>
            <p className="text-5xl font-bold text-sky-400 mb-2">{formatMoney(data.totalSaved)}</p>
            <p className="text-white/40 text-sm">
              = AI替代 {data.ai.hours}小时 × ¥{data.hourlyRate}/小时
              {data.loss.change < 0 && ` + 赔付环比下降 ¥${Math.abs(data.loss.change).toFixed(0)}`}
            </p>
          </div>

          {/* ══════�?📌 下周重点建议 ══════�?*/}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">📌</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">下周重点建议</h2>
            </div>
            <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-6">
              <div className="space-y-4">
                {resultMetrics
                  .filter(m => !isAchieved(m))
                  .slice(0, 3)
                  .map(m => (
                    <div key={m.metric} className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-white/80 text-lg leading-relaxed">
                        <span className="font-semibold">{m.metric}</span>
                        {' '}未达标（实际 {m.actual}{m.unit}，目�?{m.target}{m.unit}），建议下周重点关注并制定改善计划�?
                      </p>
                    </div>
                  ))}
                {resultMetrics.every(isAchieved) && (
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-white/80 text-lg leading-relaxed">本周各项指标均达标，下周建议维持现有节奏，可尝试挑战更高目标�?/p>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
