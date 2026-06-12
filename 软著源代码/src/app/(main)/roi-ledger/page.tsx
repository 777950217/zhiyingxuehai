'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import ROISection from '@/components/roi-ledger';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/* ─── Mock 数据 ─── */
const MOCK_ROI_GOALS = [
  { metric: '整体ROI', target: 200, actual: 165, unit: '%', inverse: false },
  { metric: '降本金额', target: 5000, actual: 4200, unit: '�?, inverse: false },
  { metric: 'AI提效时长', target: 30, actual: 28, unit: 'h', inverse: false },
  { metric: '赔付降幅', target: 25, actual: 18, unit: '%', inverse: false },
];

const MOCK_ROI_PATHS = [
  { type: '审批�?, desc: '自动赔付审批流程上线，减少人工审核时�?, relatedMetrics: ['降本金额', '赔付降幅'], color: 'bg-blue-100 text-blue-700' },
  { type: '培训', desc: '完成3场AI话术培训，客服响应效率提�?, relatedMetrics: ['AI提效时长'], color: 'bg-green-100 text-green-700' },
  { type: '快捷�?, desc: '新增20条行业快捷语，覆盖常见咨询场�?, relatedMetrics: ['AI提效时长', '整体ROI'], color: 'bg-purple-100 text-purple-700' },
  { type: 'SOP', desc: '优化退款SOP，退款处理时长缩�?0%', relatedMetrics: ['降本金额', '赔付降幅'], color: 'bg-orange-100 text-orange-700' },
  { type: 'AI诊断', desc: '启用AI异常诊断，提前拦�?起高危订�?, relatedMetrics: ['赔付降幅', '整体ROI'], color: 'bg-red-100 text-red-700' },
];

const ROI_REVIEW_QUESTIONS = [
  '目标值设定是否合理？依据是什么？',
  '哪些动作对ROI提升贡献最大？',
  '投入产出的时间周期是否匹配？',
  '降本措施是否影响了服务质量？',
  'AI提效时长能否进一步扩大？',
  '赔付降幅低于预期的原因是什么？',
  '有哪些隐性成本未纳入计算�?,
  '下一步如何提高投入产出比�?,
];

export default function RoiLedgerPage() {
  const { profile } = useAuth();
  const role = profile?.role || 'personal_user';
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            ROI 账本
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            记录你的每一笔投入与产出，用数据证明价�?
          </p>
        </div>

        {/* ─── 🎯 目标板块：投入产出目�?─── */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-sky-50 rounded-2xl border border-blue-200 p-6 mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">🎯 投入产出目标</h3>
          <p className="text-base text-gray-500 mb-4">目标ROI与降本预�?/p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MOCK_ROI_GOALS.map((g) => {
              const achieved = g.actual >= g.target;
              const rate = g.target > 0 ? Math.min(100, Math.round((g.actual / g.target) * 100)) : 0;
              const light = achieved ? '🟢' : rate >= 70 ? '🟡' : '🔴';
              return (
                <div key={g.metric} className={`rounded-xl border p-4 ${achieved ? 'bg-white border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-gray-900">{g.metric}</span>
                    <span className="text-2xl">{light}</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">{g.target}{g.unit}</div>
                  {!achieved && (
                    <button onClick={() => setExpandedReview(expandedReview === g.metric ? null : g.metric)} className="text-red-600 text-sm font-medium hover:underline mt-1">
                      ⚠️ 未达�?�?查看复盘 {expandedReview === g.metric ? '�? : '�?}
                    </button>
                  )}
                  {expandedReview === g.metric && (
                    <div className="mt-3 bg-white rounded-lg border p-4 space-y-2">
                      <p className="text-sm font-bold text-gray-800">8问复�?/p>
                      {ROI_REVIEW_QUESTIONS.map((q, i) => (
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
        </div>

        <hr className="border-gray-200 mb-4" />

        {/* ─── 🛤�?路径板块：管理动�?─── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">🛤�?管理路径</h3>
          <p className="text-base text-gray-500 mb-4">使用系统后的管理动作记录</p>
          <div className="space-y-3">
            {MOCK_ROI_PATHS.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.color}`}>{p.type}</span>
                    <span className="text-base text-gray-800">{p.desc}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {p.relatedMetrics.map(m => (
                      <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-200 mb-4" />

        {/* ─── 📊 结果板块 ─── */}
        {(() => {
          const achieved = MOCK_ROI_GOALS.filter(g => g.actual >= g.target);
          const rate = Math.round((achieved.length / MOCK_ROI_GOALS.length) * 100);
          return (
            <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl border border-green-200 p-6 mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">📊 投入产出结果</h3>
              <p className="text-base text-gray-500 mb-4">实际ROI与成本对�?/p>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">综合达标�?/span>
                  <span className="text-2xl font-bold text-blue-700">{rate}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {MOCK_ROI_GOALS.map((g) => {
                  const isAch = g.actual >= g.target;
                  const pct = g.target > 0 ? Math.min(100, Math.round((g.actual / g.target) * 100)) : 0;
                  const dev = Math.round(((g.actual - g.target) / Math.max(g.target, 0.01)) * 100);
                  return (
                    <div key={g.metric} className={`rounded-xl border p-4 ${isAch ? 'bg-white border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-base font-bold text-gray-900 mb-2">{g.metric}</div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">目标 {g.target}{g.unit}</span>
                        <span className={`font-bold ${isAch ? 'text-green-700' : 'text-red-700'}`}>实际 {g.actual}{g.unit}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${isAch ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={`text-sm font-medium ${isAch ? 'text-green-600' : 'text-red-600'}`}>
                        {isAch ? '�?达标' : `⚠️ 偏差${dev > 0 ? '+' : ''}${dev}%`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <hr className="border-gray-200 mb-4" />

        {/* ─── 原有 ROI 内容�?─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ROISection />
        </div>
      </div>
    </div>
  );
}
