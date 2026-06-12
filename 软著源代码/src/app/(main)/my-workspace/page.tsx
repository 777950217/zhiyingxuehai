'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { OnboardingGuide as OnboardingGuideCard } from '@/components/onboarding-guide';
import { PageHint } from '@/components/page-hint';
import {
  LayoutList, Bot, MessageSquare, ClipboardList,
  GraduationCap, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Sparkles, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface WorkOrder {
  id: string;
  title: string;
  customer_name: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function MyWorkspacePage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [orderTab, setOrderTab] = useState<'pending' | 'processing' | 'done'>('pending');
  const [trainingPct, setTrainingPct] = useState(0);

  useEffect(() => {
    // Fetch my work orders
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/work-orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Staff only sees their own orders
          setOrders(Array.isArray(data) ? data.slice(0, 20) : []);
        }
      } catch { /* ignore */ }
    };

    // Calculate training progress from localStorage
    const calcTraining = () => {
      try {
        const raw = localStorage.getItem(`learning-path-progress_${profile?.id || ''}`);
        if (!raw) {
          // fallback to legacy key
          const legacyRaw = localStorage.getItem('learning-path-progress');
          if (legacyRaw) {
            const progress = JSON.parse(legacyRaw);
            const total = 15;
            const done = Object.values(progress).filter(Boolean).length;
            setTrainingPct(Math.round((done / total) * 100));
          }
        } else {
          const progress = JSON.parse(raw);
          const total = 15; // 3 stages × 5 modules
          const done = Object.values(progress).filter(Boolean).length;
          setTrainingPct(Math.round((done / total) * 100));
        }
      } catch { /* ignore */ }
    };

    fetchOrders();
    calcTraining();
  }, []);

  const filteredOrders = orders.filter(o => {
    if (orderTab === 'pending') return o.status === 'pending' || o.status === '待处�?;
    if (orderTab === 'processing') return o.status === 'processing' || o.status === '处理�?;
    return o.status === 'done' || o.status === 'completed' || o.status === '已完�?;
  });

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === '待处�?).length;
  const processingCount = orders.filter(o => o.status === 'processing' || o.status === '处理�?).length;
  const doneCount = orders.filter(o => o.status === 'done' || o.status === 'completed' || o.status === '已完�?).length;

  const displayName = profile?.displayName || '客服';

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* Welcome */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
            <LayoutList className="w-5 h-5 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold">我的工作�?/h1>
        </div>
        <p className="text-slate-600 text-sm ml-[52px]">{displayName}，今天也要加油！</p>
      </div>

      <PageHint text="你的工作中心——待办、话术、培训、工单，该干的都在这�? />

      {/* 7天快速上手指�?*/}
      <div className="mt-4">
        <OnboardingGuideCard
          guideKey="my-workspace"
          steps={[
            { title: '查看今日待办', description: '待处理的工单和任务都在这�? },
            { title: '学习话术练兵', description: '掌握标准话术，提升服务效�? },
            { title: '使用AI助手', description: '遇到问题随时问AI，快速找到答�? },
          ]}
        />
      </div>

      {/* 欢迎引导 - 工单为空且培训未开始时显示 */}
      {orders.length === 0 && trainingPct === 0 && (
        <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 p-4 flex items-center gap-3">
          <span className="text-2xl">👋</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-sky-800">欢迎！建议先从AI助手或培训学院开�?/p>
            <p className="text-xs text-sky-600 mt-0.5">先学会用工具，再实战处理问题</p>
          </div>
          <div className="flex gap-2">
            <Link href="/ai-assistant?prompt=帮我处理一个售后问�? className="text-xs bg-[#0F2B46] text-white px-3 py-1.5 rounded-md hover:bg-[#1a3a5c] transition-colors">试试AI助手</Link>
            <Link href="/training" className="text-xs bg-white text-sky-700 border border-sky-300 px-3 py-1.5 rounded-md hover:bg-sky-50 transition-colors">开始培�?/Link>
          </div>
        </div>
      )}

      {/* Quick Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* AI Assistant */}
        <Link href="/ai-assistant?prompt=帮我处理一个售后问�? className="group block">
          <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-sky-500 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-sky-900">AI急救�?/span>
              <ChevronRight className="w-4 h-4 text-sky-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-sky-700">遇到不会处理的问题，问AI�?秒给答案</p>
          </div>
        </Link>

        {/* Practice */}
        <Link href="/practice" className="group block">
          <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-purple-900">话术练兵</span>
              <ChevronRight className="w-4 h-4 text-purple-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-purple-700">AI生成+模拟对练，越练越会说�?/p>
          </div>
        </Link>

        {/* Training */}
        <Link href="/training" className="group block">
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-emerald-900">培训中心</span>
              <ChevronRight className="w-4 h-4 text-emerald-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-emerald-700">SOP流程+操作规范，按步骤�?/p>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* My Work Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-lg">我的工单</h2>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{orders.length}</span>
            </div>
          </div>
          <div className="p-4">
            {/* Status Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
              {([
                { key: 'pending' as const, label: '待处�?, count: pendingCount },
                { key: 'processing' as const, label: '处理�?, count: processingCount },
                { key: 'done' as const, label: '已完�?, count: doneCount },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setOrderTab(tab.key)}
                  className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors ${
                    orderTab === tab.key ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Order List */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {orderTab === 'done' ? '暂无已完成的工单' : orderTab === 'processing' ? '暂无处理中的工单' : '暂无待处理工�?📋'}
                </p>
                {orderTab === 'pending' && orders.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">所有工单处理完毕，干得漂亮�?/p>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      order.priority === 'high' || order.priority === '紧�? ? 'bg-red-500' :
                      order.priority === 'medium' || order.priority === '一�? ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{order.title}</p>
                      <p className="text-xs text-slate-400">{order.customer_name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'pending' || order.status === '待处�? ? 'bg-amber-50 text-amber-600' :
                      order.status === 'processing' || order.status === '处理�? ? 'bg-blue-50 text-blue-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {order.status === 'pending' ? '待处�? : order.status === 'processing' ? '处理�? : '已完�?}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link href="/work-orders" className="flex items-center justify-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部工单 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Training Progress */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-lg">培训进度</h2>
            </div>
          </div>
          <div className="p-5">
            {/* Progress Ring */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#10b981" strokeWidth="8"
                    strokeDasharray={`${(trainingPct / 100) * 251.3} 251.3`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-emerald-600">{trainingPct}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">学习路径完成�?/p>
                <p className="font-semibold text-slate-800">
                  {trainingPct === 0 ? '📚 暂未开�? : trainingPct < 50 ? '继续加油' : trainingPct < 100 ? '进展不错' : '已全部完成！'}
                </p>
                {trainingPct === 0 ? (
                  <Link href="/training" className="text-xs text-sky-600 hover:text-sky-700 mt-1 inline-block">点击培训学院开始学�?�?/Link>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">3个阶�?· 15个模�?/p>
                )}
              </div>
            </div>

            {/* Quick Training Links */}
            <div className="space-y-2">
              <Link href="/learning-path" className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">继续学习路径</span>
                <ChevronRight className="w-4 h-4 text-emerald-400 ml-auto" />
              </Link>
              <Link href="/training" className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">SOP操作流程</span>
                <ChevronRight className="w-4 h-4 text-blue-400 ml-auto" />
              </Link>
              <Link href="/knowledge-qa" className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">知识问答</span>
                <ChevronRight className="w-4 h-4 text-purple-400 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Todo */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-lg">今日待办</h2>
          </div>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm">�?<strong className="text-amber-700">{pendingCount}</strong> 个工单待处理</span>
                <Link href="/work-orders" className="ml-auto text-xs text-amber-600 hover:underline">去处�?/Link>
              </div>
            )}
            {trainingPct < 100 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm">学习路径还有 <strong className="text-emerald-700">{100 - trainingPct}%</strong> 未完�?/span>
                <Link href="/learning-path" className="ml-auto text-xs text-emerald-600 hover:underline">继续学习</Link>
              </div>
            )}
            {pendingCount === 0 && trainingPct >= 100 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-700">今天的事情都做完了，试试AI急救站提升自己？</span>
                <Link href="/ai-assistant" className="ml-auto text-xs text-green-600 hover:underline">去试�?/Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
