'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/* ─── Mock 数据 ─── */
const MOCK_LEARNING_GOALS = [
  { metric: '模块通关�?, target: 5, actual: 3, unit: '�?, inverse: false, weight: 30 },
  { metric: '笔记质量�?, target: 80, actual: 72, unit: '�?, inverse: false, weight: 25 },
  { metric: '作业合格�?, target: 90, actual: 85, unit: '%', inverse: false, weight: 25 },
  { metric: 'AI批改通过�?, target: 85, actual: 88, unit: '%', inverse: false, weight: 20 },
];

const MOCK_LEARNING_PATHS = [
  { type: '课程', desc: '完成《卫浴行业基础知识》第3-5�?, relatedMetrics: ['模块通关�?], color: 'bg-blue-100 text-blue-700' },
  { type: '笔记', desc: '提交3篇学习笔记，AI批改反馈已出', relatedMetrics: ['笔记质量�?], color: 'bg-green-100 text-green-700' },
  { type: '作业', desc: '完成话术模拟作业，得�?2�?, relatedMetrics: ['作业合格�?], color: 'bg-purple-100 text-purple-700' },
  { type: 'AI批改', desc: 'AI批改3篇笔记，2篇优秀1篇良�?, relatedMetrics: ['AI批改通过�?, '笔记质量�?], color: 'bg-orange-100 text-orange-700' },
  { type: '考试', desc: '通过售中客服模拟考试', relatedMetrics: ['模块通关�?, '作业合格�?], color: 'bg-red-100 text-red-700' },
];

const LEARNING_REVIEW_QUESTIONS = [
  '学习目标是否按计划推进？',
  '哪些模块学习进度落后？原因是什么？',
  '笔记质量分不高的原因是什么？',
  '作业合格率是否有提升空间�?,
  'AI批改反馈是否已充分消化？',
  '是否需要调整学习计划或节奏�?,
  '学习成果是否转化为实际工作能力？',
  '下一步学习重点是什么？',
];

export default function LearningCenterPage() {
  const { profile } = useAuth();
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">学堂成果</h1>
          <p className="text-base text-gray-500 mt-1">学习阶段目标与达成情�?/p>
        </div>

        {/* ─── 🎯 目标板块 ─── */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-sky-50 rounded-2xl border border-blue-200 p-6 mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">🎯 学习目标</h3>
          <p className="text-base text-gray-500 mb-4">阶段目标与预期掌握能�?/p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MOCK_LEARNING_GOALS.map((g) => {
              const achieved = g.actual >= g.target;
              const rate = g.target > 0 ? Math.min(100, Math.round((g.actual / g.target) * 100)) : 0;
              const light = achieved ? '🟢' : rate >= 70 ? '🟡' : '🔴';
              return (
                <div key={g.metric} className={`rounded-xl border p-4 ${achieved ? 'bg-white border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-gray-900">{g.metric}</span>
                    <span className="text-2xl">{light}</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {g.target}{g.unit}
                    <span className="text-sm font-normal text-gray-400 ml-2">权重{g.weight}</span>
                  </div>
                  {!achieved && (
                    <button onClick={() => setExpandedReview(expandedReview === g.metric ? null : g.metric)} className="text-red-600 text-sm font-medium hover:underline mt-1">
                      ⚠️ 未达�?�?查看复盘 {expandedReview === g.metric ? '�? : '�?}
                    </button>
                  )}
                  {expandedReview === g.metric && (
                    <div className="mt-3 bg-white rounded-lg border p-4 space-y-2">
                      <p className="text-sm font-bold text-gray-800">8问复�?/p>
                      {LEARNING_REVIEW_QUESTIONS.map((q, i) => (
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
          <p className="text-sm text-gray-400 mt-3">💡 学习目标与阶段可在培训中心中设置</p>
        </div>

        <hr className="border-gray-200 mb-4" />

        {/* ─── 🛤�?路径板块 ─── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">🛤�?学习路径</h3>
          <p className="text-base text-gray-500 mb-4">课程完成/笔记提交/AI批改/作业通过记录</p>
          <div className="space-y-3">
            {MOCK_LEARNING_PATHS.map((p, i) => (
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
          const achieved = MOCK_LEARNING_GOALS.filter(g => g.actual >= g.target);
          const rate = Math.round((achieved.length / MOCK_LEARNING_GOALS.length) * 100);
          return (
            <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl border border-green-200 p-6 mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">📊 学习结果</h3>
              <p className="text-base text-gray-500 mb-4">模块通关与作业合格率</p>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">综合达标�?/span>
                  <span className="text-2xl font-bold text-blue-700">{rate}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>已达�?{achieved.length} �?/span>
                  <span>未达�?{MOCK_LEARNING_GOALS.length - achieved.length} �?/span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {MOCK_LEARNING_GOALS.map((g) => {
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

        {/* 底部链接 */}
        <div className="mt-4 text-center">
          <Link href="/learning-path" className="text-blue-600 hover:text-blue-700 font-medium text-base hover:underline">
            查看完整学习路径 �?
          </Link>
        </div>
      </div>
    </div>
  );
}
