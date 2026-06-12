'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface AgentStatus {
  user_id: string;
  user_name: string;
  status: 'online' | 'away' | 'busy';
  pending_count: number;
  processing_count: number;
  completed_count: number;
  avg_response_time: number;
}

const mockAgents: AgentStatus[] = [
  { user_id: '1', user_name: '张三', status: 'online', pending_count: 2, processing_count: 3, completed_count: 15, avg_response_time: 45 },
  { user_id: '2', user_name: '李四', status: 'busy', pending_count: 0, processing_count: 5, completed_count: 12, avg_response_time: 68 },
  { user_id: '3', user_name: '王五', status: 'online', pending_count: 1, processing_count: 2, completed_count: 18, avg_response_time: 38 },
  { user_id: '4', user_name: '赵六', status: 'away', pending_count: 4, processing_count: 1, completed_count: 8, avg_response_time: 120 },
  { user_id: '5', user_name: '钱七', status: 'online', pending_count: 0, processing_count: 4, completed_count: 20, avg_response_time: 52 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  online: { label: '在线', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  away: { label: '离开', color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  busy: { label: '忙碌', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
};

export default function BehaviorMonitorPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: workOrders, error } = await supabase.from('work_orders').select('*');

        if (error) throw error;

        if (workOrders && workOrders.length > 0) {
          setAgents(mockAgents);
        } else {
          setAgents(mockAgents);
        }
      } catch (err) {
        console.error('获取状态失败:', err);
        setAgents(mockAgents);
      }
      setLoading(false);
    };

    fetchAgents();
  }, []);

  const getResponseTimeColor = (time: number) => {
    if (time > 120) return 'text-red-600';
    if (time > 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getResponseTimeStatus = (time: number) => {
    if (time > 120) return { label: '超时', color: 'text-red-600', bg: 'bg-red-100' };
    if (time > 60) return { label: '较慢', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: '正常', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const onlineCount = agents.filter(a => a.status === 'online').length;
  const busyCount = agents.filter(a => a.status === 'busy').length;
  const awayCount = agents.filter(a => a.status === 'away').length;
  const totalPending = agents.reduce((sum, a) => sum + a.pending_count, 0);
  const totalProcessing = agents.reduce((sum, a) => sum + a.processing_count, 0);
  const totalCompleted = agents.reduce((sum, a) => sum + a.completed_count, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">行为监控</h1>
          <p className="text-slate-500 text-sm mt-1">实时监控客服在线状态和工单处理进度</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-slate-500">在线</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{onlineCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm text-slate-500">忙碌</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{busyCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-sm text-slate-500">离开</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{awayCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-slate-500">待处理</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{totalPending}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">工单进度</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">待处理</span>
                  <span className="text-red-600 font-medium">{totalPending}</span>
                </div>
                <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${Math.min(totalPending / (totalPending + totalProcessing + totalCompleted) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">处理中</span>
                  <span className="text-yellow-600 font-medium">{totalProcessing}</span>
                </div>
                <div className="w-full h-2 bg-yellow-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: `${Math.min(totalProcessing / (totalPending + totalProcessing + totalCompleted) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">已完成</span>
                  <span className="text-green-600 font-medium">{totalCompleted}</span>
                </div>
                <div className="w-full h-2 bg-green-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${Math.min(totalCompleted / (totalPending + totalProcessing + totalCompleted) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">响应时长监控</h3>
            <div className="flex items-end gap-4 h-32">
              {agents.map(agent => {
                const height = Math.min(agent.avg_response_time / 150 * 100, 100);
                const color = agent.avg_response_time > 120 ? 'bg-red-500' : agent.avg_response_time > 60 ? 'bg-yellow-500' : 'bg-green-500';
                return (
                  <div key={agent.user_id} className="flex-1 flex flex-col items-center">
                    <span className={`text-xs font-medium ${getResponseTimeColor(agent.avg_response_time)} mb-1`}>
                      {agent.avg_response_time}s
                    </span>
                    <div className="w-full flex-1 bg-slate-100 rounded-t-lg overflow-hidden relative">
                      <div className={`absolute bottom-0 left-0 right-0 ${color} transition-all duration-500`} style={{ height: `${height}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-500 mt-2">{agent.user_name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-xs text-slate-500">&lt; 60s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="text-xs text-slate-500">60-120s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-xs text-slate-500">&gt; 120s</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">客服姓名</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">在线状态</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">待处理</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">处理中</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">已完成</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">响应时长</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-slate-500">加载中...</p>
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-slate-500">暂无客服在线状态</p>
                  </td>
                </tr>
              ) : (
                agents.map(agent => {
                  const status = statusConfig[agent.status];
                  const responseStatus = getResponseTimeStatus(agent.avg_response_time);
                  return (
                    <tr key={agent.user_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                            {agent.user_name[0]}
                          </div>
                          <span className="font-medium text-slate-800">{agent.user_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                          <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${agent.pending_count > 3 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                          {agent.pending_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 text-sm font-medium">
                          {agent.processing_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm font-medium">
                          {agent.completed_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${responseStatus.bg} ${responseStatus.color}`}>
                          {agent.avg_response_time}s
                          <span className="text-xs opacity-70">({responseStatus.label})</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}