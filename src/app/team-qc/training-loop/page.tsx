'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface CommonIssue {
  id: string;
  issue_type: string;
  count: number;
  description: string;
}

interface Agent {
  id: string;
  name: string;
  issue_count: number;
}

interface TrainingTask {
  id: string;
  user_id: string;
  user_name: string;
  issue_type: string;
  deadline: string;
  status: string;
  created_at: string;
}

const mockCommonIssues: CommonIssue[] = [
  { id: '1', issue_type: '响应超时', count: 12, description: '客户等待时间过长，响应不及时' },
  { id: '2', issue_type: '情绪处理不当', count: 8, description: '未正确安抚客户情绪' },
  { id: '3', issue_type: '信息错误', count: 6, description: '提供错误信息或误导客户' },
  { id: '4', issue_type: '客诉升级', count: 5, description: '未及时识别客诉升级信号' },
  { id: '5', issue_type: '流程不规范', count: 4, description: '未按标准流程处理问题' },
];

const mockAgents: Agent[] = [
  { id: '1', name: '张三', issue_count: 5 },
  { id: '2', name: '李四', issue_count: 3 },
  { id: '3', name: '王五', issue_count: 4 },
  { id: '4', name: '赵六', issue_count: 2 },
];

const mockTrainingTasks: TrainingTask[] = [
  { id: '1', user_id: '1', user_name: '张三', issue_type: '响应超时', deadline: '2024-01-20', status: 'pending', created_at: '2024-01-15 10:30:00' },
  { id: '2', user_id: '2', user_name: '李四', issue_type: '情绪处理不当', deadline: '2024-01-18', status: 'completed', created_at: '2024-01-12 14:20:00' },
  { id: '3', user_id: '3', user_name: '王五', issue_type: '信息错误', deadline: '2024-01-22', status: 'pending', created_at: '2024-01-16 09:15:00' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待完成', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  completed: { label: '已完成', color: 'text-green-700', bg: 'bg-green-100' },
  reviewed: { label: '已审核', color: 'text-blue-700', bg: 'bg-blue-100' },
};

export default function TrainingLoopPage() {
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<CommonIssue | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [trainingTasks, setTrainingTasks] = useState<TrainingTask[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgentsForTask, setSelectedAgentsForTask] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: issuesData } = await supabase.from('qc_issues').select('issue_type');
        const { data: tasksData } = await supabase.from('training_tasks').select('*');

        if (issuesData && issuesData.length > 0) {
          const issueMap: Record<string, number> = {};
          issuesData.forEach((item: any) => {
            issueMap[item.issue_type] = (issueMap[item.issue_type] || 0) + 1;
          });
          const issues: CommonIssue[] = Object.entries(issueMap).map(([type, count]) => ({
            id: type,
            issue_type: type,
            count,
            description: '',
          }));
          setCommonIssues(issues);
        } else {
          setCommonIssues(mockCommonIssues);
        }

        if (tasksData && tasksData.length > 0) {
          setTrainingTasks(tasksData as TrainingTask[]);
        } else {
          setTrainingTasks(mockTrainingTasks);
        }
      } catch (err) {
        console.error('获取数据失败:', err);
        setCommonIssues(mockCommonIssues);
        setTrainingTasks(mockTrainingTasks);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSelectIssue = (issue: CommonIssue) => {
    setSelectedIssue(issue);
    setAgents(mockAgents);
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentsForTask(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleAssignTask = () => {
    if (!selectedIssue || selectedAgentsForTask.length === 0 || !deadline) {
      alert('请选择客服和截止日期');
      return;
    }

    setShowAssignModal(false);
    setSelectedAgentsForTask([]);
    setDeadline('');
    alert('培训任务已指派！');
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">培训闭环</h1>
          <p className="text-slate-500 text-sm mt-1">根据质检问题自动归类，指派培训任务</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-medium text-slate-800">共性问题</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : commonIssues.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">暂无问题数据</p>
                  </div>
                ) : (
                  commonIssues.map(issue => (
                    <div
                      key={issue.id}
                      onClick={() => handleSelectIssue(issue)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedIssue?.id === issue.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{issue.issue_type}</span>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          {issue.count}例
                        </span>
                      </div>
                      {issue.description && (
                        <p className="text-sm text-slate-500 mt-1">{issue.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedIssue ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{selectedIssue.issue_type}</h3>
                      <p className="text-sm text-slate-500 mt-1">涉及该问题的客服列表</p>
                    </div>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      指派培训任务
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {agents.map(agent => (
                      <div
                        key={agent.id}
                        className="bg-slate-50 rounded-lg p-4 text-center"
                      >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-blue-600 font-medium">{agent.name[0]}</span>
                        </div>
                        <div className="font-medium text-slate-800">{agent.name}</div>
                        <div className="text-sm text-red-600 mt-1">问题数: {agent.issue_count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">培训任务列表</h3>
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">客服</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">培训类型</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">截止日期</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trainingTasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center">
                            <p className="text-sm text-slate-500">暂无培训任务</p>
                          </td>
                        </tr>
                      ) : (
                        trainingTasks.map(task => {
                          const status = statusConfig[task.status];
                          return (
                            <tr key={task.id}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm">
                                    {task.user_name[0]}
                                  </div>
                                  <span className="text-sm text-slate-700">{task.user_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-slate-700">{task.issue_type}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-slate-700">{formatTime(task.deadline)}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {task.status === 'completed' && (
                                  <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                                    审核
                                  </button>
                                )}
                                {task.status === 'pending' && (
                                  <span className="text-sm text-slate-400">等待完成</span>
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
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">选择一个问题类型</h3>
                <p className="text-sm text-slate-500">从左侧列表选择问题类型，查看涉及的客服并指派培训任务</p>
              </div>
            )}
          </div>
        </div>

        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">指派培训任务</h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">问题类型</label>
                  <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                    {selectedIssue?.issue_type}
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">选择客服</label>
                  <div className="flex flex-wrap gap-2">
                    {agents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgentSelection(agent.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedAgentsForTask.includes(agent.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {agent.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">截止日期</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAssignTask}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    确认指派
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}