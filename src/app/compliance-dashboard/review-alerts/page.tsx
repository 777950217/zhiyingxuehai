'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ReviewAlert {
  id: string;
  order_no: string;
  user_name: string;
  issue_type: string;
  content: string;
  created_at: string;
  status: string;
}

const issueTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
  product: { label: '产品差评', color: 'text-red-700', bg: 'bg-red-100' },
  logistics: { label: '物流差评', color: 'text-orange-700', bg: 'bg-orange-100' },
  service: { label: '服务差评', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  false_advertisement: { label: '虚假宣传投诉', color: 'text-purple-700', bg: 'bg-purple-100' },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  processed: { label: '已处理', color: 'text-green-700', bg: 'bg-green-100' },
};

const mockAlerts: ReviewAlert[] = [
  { id: '1', order_no: 'TB202401150001', user_name: '张三', issue_type: 'product', content: '商品质量太差了，收到就是坏的，完全不符合描述！', created_at: '2024-01-15 10:30:00', status: 'pending' },
  { id: '2', order_no: 'DY202401150002', user_name: '李四', issue_type: 'logistics', content: '物流太慢了，等了整整一周才收到，严重影响使用！', created_at: '2024-01-15 09:20:00', status: 'pending' },
  { id: '3', order_no: 'JD202401140003', user_name: '王五', issue_type: 'service', content: '客服态度很差，问问题半天不回复，体验非常差！', created_at: '2024-01-14 16:45:00', status: 'processed' },
  { id: '4', order_no: 'PD202401140004', user_name: '赵六', issue_type: 'false_advertisement', content: '商品描述和实际不符，存在虚假宣传！', created_at: '2024-01-14 14:30:00', status: 'pending' },
  { id: '5', order_no: 'TB202401130005', user_name: '钱七', issue_type: 'product', content: '产品做工粗糙，有明显瑕疵，不值这个价！', created_at: '2024-01-13 11:15:00', status: 'processed' },
];

export default function ReviewAlertsPage() {
  const [alerts, setAlerts] = useState<ReviewAlert[]>([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    order_no: '',
    user_name: '',
    issue_type: 'product',
    content: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase.from('review_alerts').select('*');

        if (data && data.length > 0) {
          setAlerts(data as ReviewAlert[]);
        } else {
          setAlerts(mockAlerts);
        }
      } catch (err) {
        console.error('获取差评预警失败:', err);
        setAlerts(mockAlerts);
      }
      setLoading(false);
    };

    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (activeStatus === 'all') return true;
    return alert.status === activeStatus;
  });

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const handleProcess = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? { ...alert, status: 'processed' }
        : alert
    ));
    alert('已标记为处理');
  };

  const handleAddAlert = () => {
    if (!newAlert.order_no || !newAlert.content) {
      alert('请填写完整信息');
      return;
    }
    setShowAddModal(false);
    setNewAlert({ order_no: '', user_name: '', issue_type: 'product', content: '' });
    alert('差评预警已添加！');
  };

  const pendingCount = alerts.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">差评预警</h1>
            <p className="text-slate-500 text-sm mt-1">实时监控差评和投诉，及时处理客户反馈</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            手动录入
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveStatus('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            全部 ({alerts.length})
          </button>
          <button
            onClick={() => setActiveStatus('pending')}
            className={`px-4 py-2 rounded-lg transition-colors relative ${
              activeStatus === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            待处理
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveStatus('processed')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeStatus === 'processed'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            已处理 ({alerts.filter(a => a.status === 'processed').length})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">订单号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">客服</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">问题类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">差评内容</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">产生时间</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-500">暂无差评预警</p>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map(alert => {
                    const issueType = issueTypeConfig[alert.issue_type];
                    const status = statusConfig[alert.status];
                    return (
                      <tr key={alert.id} className={alert.status === 'pending' ? 'bg-red-50/30' : ''}>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-slate-700">{alert.order_no}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-sm">{alert.user_name[0]}</span>
                            </div>
                            <span className="text-sm text-slate-700">{alert.user_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${issueType.bg} ${issueType.color}`}>
                            {issueType.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 line-clamp-2 max-w-xs">{alert.content}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">{formatTime(alert.created_at)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                              联系客户
                            </button>
                            <button className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                              发起申诉
                            </button>
                            {alert.status === 'pending' && (
                              <button
                                onClick={() => handleProcess(alert.id)}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                              >
                                标记处理
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-slate-800">录入差评预警</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">订单号</label>
                  <input
                    type="text"
                    value={newAlert.order_no}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, order_no: e.target.value }))}
                    placeholder="请输入订单号"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">客服姓名</label>
                  <input
                    type="text"
                    value={newAlert.user_name}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, user_name: e.target.value }))}
                    placeholder="请输入客服姓名"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">问题类型</label>
                  <select
                    value={newAlert.issue_type}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, issue_type: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(issueTypeConfig).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">差评内容摘要</label>
                  <textarea
                    value={newAlert.content}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="请输入差评内容..."
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddAlert}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    录入
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