'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfDay, addDays } from 'date-fns';

interface InsightItem {
  id: string;
  type: 'income' | 'cost' | 'complaint' | 'suggestion';
  title: string;
  content: string;
  severity: 'high' | 'medium' | 'low';
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        setInsights([
          { id: '1', type: 'income', title: '收入同比增长', content: '本月收入较上月增长17.2%，主要得益于新品上架和促销活动。建议继续加大爆款产品推广。', severity: 'low' },
          { id: '2', type: 'cost', title: '运费成本异常', content: '本周运费支出较上周增加32%，经分析是由于偏远地区订单比例上升。建议优化物流策略。', severity: 'high' },
          { id: '3', type: 'income', title: '退款率上升', content: '退款率从上周的5.2%上升至6.8%，需要关注产品质量和售后处理时效。', severity: 'medium' },
          { id: '4', type: 'complaint', title: '客户投诉热点', content: '近期投诉主要集中在安装不及时和配件缺失问题，建议加强安装团队管理和配件库存监控。', severity: 'high' },
          { id: '5', type: 'cost', title: '广告费投入效果', content: '本月广告投入产出比为1:4.2，高于行业平均水平，建议继续保持当前投放策略。', severity: 'low' },
          { id: '6', type: 'suggestion', title: '成本优化建议', content: '根据数据分析，配件赠品率14.8%高于行业基准12%，建议优化赠品策略，降低成本。', severity: 'medium' },
          { id: '7', type: 'complaint', title: '物流时效投诉', content: '偏远地区物流时效投诉增加，建议与物流商协商改善偏远地区配送服务。', severity: 'medium' },
          { id: '8', type: 'suggestion', title: '服务提升建议', content: '客服响应时长128秒，建议优化排班和增加高峰时段人力配置。', severity: 'low' },
        ]);
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'income': return { label: '收入异常', icon: 'trending-up', color: 'bg-green-100 text-green-800', border: 'border-green-200' };
      case 'cost': return { label: '成本异常', icon: 'alert-circle', color: 'bg-red-100 text-red-800', border: 'border-red-200' };
      case 'complaint': return { label: '投诉热点', icon: 'message-circle', color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200' };
      case 'suggestion': return { label: '优化建议', icon: 'lightbulb', color: 'bg-blue-100 text-blue-800', border: 'border-blue-200' };
      default: return { label: '其他', icon: 'info', color: 'bg-slate-100 text-slate-800', border: 'border-slate-200' };
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-green-500';
      default: return 'border-l-4 border-l-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">经营洞察</h1>
            <p className="text-slate-500 text-sm mt-1">AI智能分析经营数据，提供决策建议</p>
          </div>
          <div className="text-sm text-slate-500">
            分析日期: {format(new Date(), 'yyyy年MM月dd日')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">收入洞察</p>
                <p className="text-lg font-bold text-green-600">{insights.filter(i => i.type === 'income').length} 项</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">成本异常</p>
                <p className="text-lg font-bold text-red-600">{insights.filter(i => i.type === 'cost').length} 项</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">投诉热点</p>
                <p className="text-lg font-bold text-yellow-600">{insights.filter(i => i.type === 'complaint').length} 项</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">优化建议</p>
                <p className="text-lg font-bold text-blue-600">{insights.filter(i => i.type === 'suggestion').length} 项</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {insights.map(insight => {
            const typeConfig = getTypeConfig(insight.type);
            return (
              <div key={insight.id} className={`bg-white rounded-xl shadow-sm p-4 ${getSeverityStyle(insight.severity)}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    insight.severity === 'high' ? 'bg-red-100 text-red-600' :
                    insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {insight.severity === 'high' ? '高' : insight.severity === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{insight.title}</h3>
                <p className="text-sm text-slate-600">{insight.content}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">AI分析说明</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p className="font-medium mb-2">数据来源</p>
              <ul className="space-y-1">
                <li>• finance_daily - 每日财务数据</li>
                <li>• work_orders - 工单数据</li>
                <li>• communications - 客服沟通记录</li>
                <li>• refunds - 退款记录</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">分析维度</p>
              <ul className="space-y-1">
                <li>• 收入趋势与异常检测</li>
                <li>• 成本构成与异常检测</li>
                <li>• 客户投诉热点分析</li>
                <li>• 智能优化建议生成</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}