'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Search, BookOpen, Sparkles, ArrowRight, Play,
  ChevronRight, Eye, ThumbsUp, MessageSquare, Wrench,
  FileText, Lightbulb, Star,
} from 'lucide-react';

// ─── Mock data ───
const MOCK_GUIDES = [
  {
    id: '1',
    title: '智能马桶大小冲没区别',
    category: '功能故障',
    summary: '客户反馈大小冲水量一样，无区分效果。常见原因：水压不足、电磁阀故障、冲水模式未切换�?,
    usageCount: 128,
    rating: 4.8,
    tags: ['智能马桶', '冲水故障'],
  },
  {
    id: '2',
    title: '排污口低于地面安装问�?,
    category: '安装问题',
    summary: '排污管口低于地面瓷砖时，需要先加高排污口才能正常安装，否则后期会反臭漏水�?,
    usageCount: 96,
    rating: 4.9,
    tags: ['安装', '排污�?],
  },
  {
    id: '3',
    title: '马桶底部漏水排查',
    category: '漏水问题',
    summary: '马桶底部渗水分三步排查：1.法兰圈老化/偏移 2.排污口低于地�?3.安装工艺问题（底座未打胶）�?,
    usageCount: 85,
    rating: 4.7,
    tags: ['漏水', '法兰�?],
  },
  {
    id: '4',
    title: '智能马桶座圈不加�?,
    category: '功能故障',
    summary: '座圈加热失效排查：检查电源连接→温控设置→加热膜故障→主板问题，按顺序逐步定位�?,
    usageCount: 62,
    rating: 4.6,
    tags: ['智能马桶', '座圈'],
  },
  {
    id: '5',
    title: '花洒出水忽冷忽热',
    category: '恒温问题',
    summary: '恒温花洒出水温度不稳，常见原因：水压波动、恒温阀芯故障、冷热水压差过大�?,
    usageCount: 54,
    rating: 4.5,
    tags: ['花洒', '恒温'],
  },
];

const HOT_TAGS = ['智能马桶', '漏水', '安装', '冲水', '花洒', '座圈'];

export default function AfterSalesGuidePage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredGuides = MOCK_GUIDES.filter(g => {
    const matchSearch = !searchQuery ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.tags.some(t => t.includes(searchQuery));
    const matchTag = !activeTag || g.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* ─── Header ─── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">售后攻略</h1>
          </div>
          <p className="text-gray-500 text-sm sm:text-base mt-2 ml-[52px]">
            遇到售后问题不知道怎么回？售后攻略帮你一步步拆解，生成专业应对方案，下次同类问题一键搞定�?
          </p>
        </div>

        {/* ─── Main Content: Left / Right ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Search + Guide List */}
          <div className="lg:col-span-3 space-y-5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索售后问题，如：马桶漏水、冲水没区别..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition shadow-sm text-sm"
              />
            </div>

            {/* Hot Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 py-1">热门�?/span>
              {HOT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    activeTag === tag
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Guide List */}
            <div className="space-y-3">
              {filteredGuides.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">没有找到相关攻略</p>
                  <p className="text-xs mt-1">试试其他关键词，或者自己创建一�?/p>
                </div>
              ) : (
                filteredGuides.map(guide => (
                  <div
                    key={guide.id}
                    className="p-4 sm:p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-900 group-hover:text-indigo-700 transition truncate">
                            {guide.title}
                          </h3>
                          <span className="shrink-0 px-2 py-0.5 text-[11px] rounded-full bg-indigo-50 text-indigo-600 font-medium">
                            {guide.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">{guide.summary}</p>
                        <div className="flex items-center gap-4 mt-2.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Eye className="w-3.5 h-3.5" /> {guide.usageCount}次使�?
                          </span>
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400" /> {guide.rating}
                          </span>
                          <div className="flex gap-1.5">
                            {guide.tags.map(tag => (
                              <span key={tag} className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 shrink-0 mt-1 transition" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Create CTA */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 sm:p-8 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">没有你要的攻略？</h2>
              </div>
              <p className="text-sm text-gray-600 mb-2 font-medium">自己创建一个，给团队用</p>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                用大白话描述你遇到的售后问题，AI帮你生成专业的应对攻略，保存后团队下次遇到同类问题一键调用�?
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
                  描述售后问题
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                  AI生成专业应对方案
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span>
                  保存攻略，团队复�?
                </div>
              </div>
              <Link
                href="/after-sales-guide/create"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm transition text-sm"
              >
                开始创�?<ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Bottom: Tutorial & Demo ─── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm hover:border-indigo-200 transition text-left group">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm group-hover:text-indigo-700 transition">观看使用教程</p>
              <p className="text-xs text-gray-400 mt-0.5">3分钟学会创建和使用售后攻�?/p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 ml-auto transition" />
          </button>
          <Link
            href="/after-sales-guide/create?demo=true"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm hover:border-indigo-200 transition text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm group-hover:text-indigo-700 transition">案例演示：智能马桶大小冲没区�?/p>
              <p className="text-xs text-gray-400 mt-0.5">看一个完整的攻略创建过程</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 ml-auto transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}
