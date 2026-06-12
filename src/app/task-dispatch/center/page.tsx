'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Task {
  id: string;
  user_id: string;
  user_name: string;
  issue_type: string;
  content: string;
  source: string;
  deadline: string;
  status: string;
  created_at: string;
  review_note: string;
}

const mockTasks: Task[] = [
  { id: '1', user_id: '1', user_name: '王五', issue_type: '响应超时', content: '针对响应超时问题进行专项培训，学习快速响应技巧', source: '质检转培训', deadline: '2024-01-20', status: 'pending', created_at: '2024-01-15 10:30:00', review_note: '' },
  { id: '2', user_id: '2', user_name: '李四', issue_type: '情绪处理不当', content: '学习客户情绪安抚技巧，完成相关课程', source: '质检转培训', deadline: '2024-01-18', status: 'completed', created_at: '2024-01-12 14:20:00', review_note: '已完成培训，效果良好' },
  { id: '3', user_id: '3', user_name: '张三', issue_type: '信息错误', content: '重新学习产品知识，确保回答准确', source: '主管手动创建', deadline: '2024-01-22', status: 'in_progress', created_at: '2024-01-16 09:15:00', review_note: '' },
  { id: '4', user_id: '4', user_name: '赵六', issue_type: '流程不规范', content: '复习客服流程手册，严格按规范操作', source: '质检转培训', deadline: '2024-01-15', status: 'overdue', created_at: '2024-01-10 11:00:00', review_note: '' },
  { id: '5', user_id: '5', user_name: '钱七', issue_type: '客诉升级', content: '学习客诉升级识别与处理技巧', source: '主管手动创建', deadline: '2024-01-25', status: 'pending', created_at: '2024-01-17 16:30:00', review_note: '' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  in_progress: { label: '进行中', color: 'text-blue-700', bg: 'bg-blue-100' },
  completed: { label: '已完成', color: 'text-green-700', bg: 'bg-green-100' },
  reviewed: { label: '已审核', color: 'text-purple-700', bg: 'bg-purple-100' },
  overdue: { label: '已超时', color: 'text-red-700', bg: 'bg-red-100' },
};

const sourceLabels: Record<string, string> = {
  'qc': '质检转培训',
  'manual': '主管手动创建',
};

export default function TaskCenterPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [newTask, setNewTask] = useState({
    user_id: '',
    user_name: '',
    issue_type: '',
    content: '',
    deadline: '',
  });
  const [loading, setLoading] = useState(true);

  const mockAgents = [
    { id: '1', name: '张三' },
    { id: '2', name: '李四' },
    { id: '3', name: '王五' },
    { id: '4', name: '赵六' },
    { id: '5', name: '钱七' },
  ];

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('training_tasks').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setTasks(data as Task[]);
        } else {
          setTasks(mockTasks);
        }
      } catch (err) {
        console.error('获取任务失败:', err);
        setTasks(mockTasks);
      }
      setLoading(false);
    };

    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });

  const getStatusStyle = (status: string) => {
    if (status === 'overdue') return statusConfig.overdue;
    return statusConfig[status] || statusConfig.pending;
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  const handleCreateTask = () => {
    if (!newTask.user_id || !newTask.content || !newTask.deadline) {
      alert('请填写完整信息');
      return;
    }
    setShowCreateModal(false);
    setNewTask({ user_id: '', user_name: '', issue_type: '', content: '', deadline: '' });
    alert('任务已创建！');
  };

  const handleReview = (result: 'approve' | 'reject') => {
    if (!selectedTask) return;
    setTasks(prev => prev.map(task =>
      task.id === selectedTask.id
        ? { ...task, status: result === 'approve' ? 'reviewed' : 'pending', review_note: reviewNote }
        : task
    ));
    setShowReviewModal(false);
    setSelectedTask(null);
    setReviewNote('');
    alert(result === 'approve' ? '审核通过！' : '已驳回并退回修改');
  };

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待处理' },
    { key: 'in_progress', label: '进行中' },
    { key: 'completed', label: '已完成' },
    { key: 'overdue', label: '已超时' },
  ];

  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">任务中心</h1>
            <p className="text-slate-500 text-sm mt-1">管理和追踪团队培训任务</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            创建任务
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {(tab.key === 'overdue' && overdueCount > 0) && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {overdueCount}
                  </span>
                )}
                {(tab.key === 'pending' && pendingCount > 0) && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">暂无任务</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const status = getStatusStyle(task.status);
                const overdue = isOverdue(task.deadline);
                return (
                  <div
                    key={task.id}
                    className={`px-6 py-4 transition-colors ${overdue ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                            {sourceLabels[task.source] || task.source}
                          </span>
                          {overdue && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                              已超时
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-slate-800 mb-1">{task.content}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-xs">{task.user_name[0]}</span>
                            </div>
                            {task.user_name}
                          </span>
                          <span>截止: {formatDate(task.deadline)}</span>
                          <span>创建于: {formatDate(task.created_at)}</span>
                        </div>
                        {task.review_note && (
                          <div className="mt-2 px-3 py-2 bg-purple-50 rounded-lg">
                            <span className="text-sm text-purple-700">审核意见: {task.review_note}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {task.status === 'completed' && (
                          <button
                            onClick={() => { setSelectedTask(task); setShowReviewModal(true); }}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            审核
                          </button>
                        )}
                        {task.status === 'pending' && (
                          <button
                            onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'in_progress' } : t))}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            开始处理
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' } : t))}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            完成任务
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-slate-800">创建任务</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">选择客服</label>
                  <select
                    value={newTask.user_id}
                    onChange={(e) => {
                      setNewTask(prev => ({
                        ...prev,
                        user_id: e.target.value,
                        user_name: mockAgents.find(a => a.id === e.target.value)?.name || '',
                      }));
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择客服</option>
                    {mockAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">问题类型</label>
                  <input
                    type="text"
                    value={newTask.issue_type}
                    onChange={(e) => setNewTask(prev => ({ ...prev, issue_type: e.target.value }))}
                    placeholder="例如：响应超时"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">任务内容</label>
                  <textarea
                    value={newTask.content}
                    onChange={(e) => setNewTask(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="请输入任务内容..."
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">截止日期</label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTask}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReviewModal && selectedTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-slate-800">审核任务</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">任务内容：{selectedTask.content}</p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">审核意见</label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="请输入审核意见..."
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview('reject')}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    驳回
                  </button>
                  <button
                    onClick={() => handleReview('approve')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    通过
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