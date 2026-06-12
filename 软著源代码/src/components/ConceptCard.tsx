'use client';

import { type ConceptCardData } from '@/lib/concept-cards';

interface ConceptCardProps {
  data: ConceptCardData;
  onStartLearning: () => void;
}

export default function ConceptCard({ data, onStartLearning }: ConceptCardProps) {
  return (
    <div className="space-y-4">
      {/* 顶部标题 */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-5 py-2">
          <span className="text-xl">📋</span>
          <span className="text-lg font-bold text-blue-900">专业概念�?/span>
          <span className="text-lg font-bold text-blue-700">：{data.name}</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">先了解概念，再深入学�?/p>
      </div>

      {/* 模块1: 这东西是啥？ */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🤔</span>
          <h3 className="text-lg font-bold text-blue-900">这东西是啥？</h3>
        </div>
        <p className="text-base leading-relaxed text-blue-800 font-medium">{data.whatIsIt}</p>
      </div>

      {/* 模块2: 怎么来的�?*/}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📖</span>
          <h3 className="text-lg font-bold text-amber-900">怎么来的�?/h3>
        </div>
        <p className="text-base leading-relaxed text-amber-800">{data.origin}</p>
      </div>

      {/* 模块3: 主要做什么？ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🎯</span>
          <h3 className="text-lg font-bold text-gray-900">主要做什么？</h3>
        </div>
        <div className="space-y-3">
          {data.functions.map((fn, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-base leading-relaxed text-gray-800">{fn}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 模块4: 行业黑话 */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🗣�?/span>
          <h3 className="text-lg font-bold text-purple-900">行业黑话</h3>
        </div>
        <div className="space-y-2">
          {data.jargon.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-purple-100">
              <span className="text-sm text-gray-500 line-through flex-shrink-0">{item.layman}</span>
              <span className="text-lg text-purple-400 flex-shrink-0">�?/span>
              <span className="text-base font-medium text-purple-800">{item.pro}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 模块5: 装逼时�?*/}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">💅</span>
          <h3 className="text-lg font-bold text-orange-900">装逼时�?/h3>
        </div>
        <p className="text-base leading-relaxed text-orange-800 font-medium">{data.flexMoment}</p>
      </div>

      {/* 模块6: 学完你能说什么？ */}
      <div className="bg-green-50 border-2 border-green-400 rounded-xl p-5 relative">
        <div className="absolute -top-3 left-4 bg-green-500 text-white text-sm font-bold px-3 py-0.5 rounded-full">
          汇报话术
        </div>
        <div className="flex items-center gap-2 mb-2 mt-1">
          <span className="text-2xl">🏆</span>
          <h3 className="text-lg font-bold text-green-900">学完你能说什么？</h3>
        </div>
        <p className="text-base leading-relaxed text-green-800 font-medium bg-white/60 rounded-lg px-4 py-3 border border-green-200">
          &ldquo;{data.reportLine}&rdquo;
        </p>
      </div>

      {/* 开始学习按�?*/}
      <div className="pt-2 pb-1 text-center">
        <button
          onClick={onStartLearning}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-200"
        >
          开始学�?
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
        <p className="text-sm text-gray-400 mt-2">了解概念后，进入正式课程内容</p>
      </div>
    </div>
  );
}
