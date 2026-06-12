'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface KPIScore {
  id: string;
  user_id: string;
  user_name: string;
  kpi_score: number;
  baseline: number;
  status: string;
  updated_at: string;
}

interface ClusterTopic {
  id: string;
  topic: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
}

interface TeamComparison {
  user_name: string;
  scenario: string;
  pass_rate: number;
  avg_duration: number;
}

const mockKPIScores: KPIScore[] = [
  { id: '1', user_id: '1', user_name: '张三', kpi_score: 92, baseline: 85, status: 'normal', updated_at: '2024-01-15' },
  { id: '2', user_id: '2', user_name: '李四', kpi_score: 78, baseline: 85, status: 'warning', updated_at: '2024-01-15' },
  { id: '3', user_id: '3', user_name: '王五', kpi_score: 68, baseline: 85, status: 'danger', updated_at: '2024-01-15' },
  { id: '4', user_id: '4', user_name: '赵六', kpi_score: 88, baseline: 85, status: 'normal', updated_at: '2024-01-15' },
  { id: '5', user_id: '5', user_name: '钱七', kpi_score: 95, baseline: 85, status: 'normal', updated_at: '2024-01-15' },
];

const mockClusterTopics: ClusterTopic[] = [
  { id: '1', topic: '物流破损投诉', count: 23, trend: 'up', percentage: 35 },
  { id: '2', topic: '退换货纠纷', count: 18, trend: 'stable', percentage: 28 },
  { id: '3', topic: '产品质量问题', count: 12, trend: 'down', percentage: 18 },
  { id: '4', topic: '安装指导咨询', count: 8, trend: 'up', percentage: 12 },
  { id: '5', topic: '售后政策询问', count: 5, trend: 'stable', percentage: 7 },
];

const mockTeamComparison: TeamComparison[] = [
  { user_name: '张三', scenario: '退换货处理', pass_rate: 95, avg_duration: 15 },
  { user_name: '李四', scenario: '退换货处理', pass_rate: 82, avg_duration: 22 },
  { user_name: '王五', scenario: '退换货处理', pass_rate: 70, avg_duration: 28 },
  { user_name: '赵六', scenario: '退换货处理', pass_rate: 90, avg_duration: 18 },
  { user_name: '钱七', scenario: '退换货处理', pass_rate: 98, avg_duration: 12 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: '正常', color: 'text-green-700', bg: 'bg-green-100' },
  warning: { label: '预警', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  danger: { label: '掉队', color: 'text-red-700', bg: 'bg-red-100' },
};

export default function AnalysisPage() {
  const [kpiScores, setKpiScores] = useState<KPIScore[]>([]);
  const [clusterTopics, setClusterTopics] = useState<ClusterTopic[]>([]);
  const [teamComparison, setTeamComparison] = useState<TeamComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: kpiData } = await supabase.from('kpi_scores').select('*');
        const { data: orderData } = await supabase.from('work_orders').select('*');

        if (kpiData && kpiData.length > 0) {
          setKpiScores(kpiData as KPIScore[]);
        } else {
          setKpiScores(mockKPIScores);
        }
        setClusterTopics(mockClusterTopics);
        setTeamComparison(mockTeamComparison);
      } catch (err) {
        console.error('获取数据失败:', err);
        setKpiScores(mockKPIScores);
        setClusterTopics(mockClusterTopics);
        setTeamComparison(mockTeamComparison);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const getStatusStyle = (score: number, baseline: number) => {
    if (score >= baseline) return statusConfig.normal;
    if (score >= baseline * 0.9) return statusConfig.warning;
    return statusConfig.danger;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-red-600';
    if (trend === 'down') return 'text-green-600';
    return 'text-slate-500';
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">绩效分析</h1>
          <p className="text-slate-500 text-sm mt-1">AI驱动的客服团队绩效监控与分析</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">客服KPI基线监控</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">客服姓名</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">KPI得分</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">基线</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">差距</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                      </td>
                    </tr>
                  ) : kpiScores.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-sm text-slate-500">暂无数据</p>
                      </td>
                    </tr>
                  ) : (
                    kpiScores.map(score => {
                      const status = getStatusStyle(score.kpi_score, score.baseline);
                      const gap = score.baseline - score.kpi_score;
                      return (
                        <tr key={score.id} className={gap > 0 ? 'bg-red-50/50' : ''}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-sm">{score.user_name[0]}</span>
                              </div>
                              <span className="font-medium text-slate-800">{score.user_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-lg font-bold ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {score.kpi_score}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-slate-600">{score.baseline}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {gap > 0 ? (
                              <span className="text-red-600 text-sm">-{gap} 分</span>
                            ) : (
                              <span className="text-green-600 text-sm">+{Math.abs(gap)} 分</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">问题集中爆发分析</h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {clusterTopics.map(topic => (
                    <div key={topic.id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-800">{topic.topic}</span>
                          <span className={`text-sm font-medium ${getTrendColor(topic.trend)}`}>
                            {getTrendIcon(topic.trend)} {topic.count} 次
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${topic.trend === 'up' ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${topic.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">占比 {topic.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">团队对比分析</h3>
            <p className="text-sm text-slate-500 mt-1">相同场景下各客服通过率差异</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {teamComparison.map((member, index) => (
                  <div key={index} className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-medium">{member.user_name[0]}</span>
                    </div>
                    <div className="font-medium text-slate-800 text-sm mb-2">{member.user_name}</div>
                    <div className="text-2xl font-bold text-green-600 mb-1">{member.pass_rate}%</div>
                    <div className="text-xs text-slate-500">通过率</div>
                    <div className="mt-2 text-sm text-slate-600">
                      平均时长: <span className="font-medium">{member.avg_duration}</span> 分钟
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}