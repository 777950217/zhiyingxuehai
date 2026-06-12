'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Feedback {
  id: string;
  work_order_id: string;
  user_name: string;
  violation_type: string;
  deduction: number;
  chat_summary: string;
  violation_note: string;
  feedback_time: string;
}

const violationTypes: Record<string, { label: string; color: string; bg: string }> = {
  timeout: { label: '响应超时', color: 'text-red-700', bg: 'bg-red-100' },
  attitude: { label: '态度不佳', color: 'text-orange-700', bg: 'bg-orange-100' },
  speech: { label: '话术违规', color: 'text-purple-700', bg: 'bg-purple-100' },
  info_error: { label: '信息错误', color: 'text-yellow-700', bg: 'bg-yellow-100' },
};

const mockFeedbacks: Feedback[] = [
  {
    id: '1',
    work_order_id: 'WO-2024-001',
    user_name: '张三',
    violation_type: 'timeout',
    deduction: -5,
    chat_summary: '客户咨询产品保修问题，客服未在规定时间内响应...',
    violation_note: '响应时间超过3分钟',
    feedback_time: '2024-01-15 10:30:00',
  },
  {
    id: '2',
    work_order_id: 'WO-2024-002',
    user_name: '李四',
    violation_type: 'attitude',
    deduction: -10,
    chat_summary: '客户投诉物流破损，客服语气生硬...',
    violation_note: '服务态度恶劣，未使用礼貌用语',
    feedback_time: '2024-01-15 11:20:00',
  },
  {
    id: '3',
    work_order_id: 'WO-2024-003',
    user_name: '王五',
    violation_type: 'speech',
    deduction: -8,
    chat_summary: '客服使用了未经批准的话术...',
    violation_note: '使用了不规范的承诺话术',
    feedback_time: '2024-01-15 14:45:00',
  },
  {
    id: '4',
    work_order_id: 'WO-2024-004',
    user_name: '赵六',
    violation_type: 'info_error',
    deduction: -15,
    chat_summary: '客服提供了错误的产品信息...',
    violation_note: '产品保修期限说明错误',
    feedback_time: '2024-01-15 16:10:00',
  },
];

export default function QualityFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('quality_feedback').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setFeedbacks(data as Feedback[]);
        } else {
          setFeedbacks(mockFeedbacks);
        }
      } catch (err) {
        console.error('获取反馈失败:', err);
        setFeedbacks(mockFeedbacks);
      }
      setLoading(false);
    };

    fetchFeedbacks();
  }, []);

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">质检反馈</h1>
          <p className="text-slate-500 text-sm mt-1">查看客服违规记录和质检反馈</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">工单ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">客服姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">违规类型</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">扣分</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">反馈时间</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
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
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-slate-500">暂无质检反馈记录</p>
                  </td>
                </tr>
              ) : (
                feedbacks.map(feedback => {
                  const typeInfo = violationTypes[feedback.violation_type] || { label: feedback.violation_type, color: 'text-slate-700', bg: 'bg-slate-100' };
                  return (
                    <tr key={feedback.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-700">{feedback.work_order_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                            {feedback.user_name[0]}
                          </div>
                          <span className="text-slate-800">{feedback.user_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${feedback.deduction < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {feedback.deduction}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">{formatTime(feedback.feedback_time)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedFeedback(feedback)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-slate-800">质检详情</h2>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">工单ID</label>
                    <span className="font-mono text-slate-800">{selectedFeedback.work_order_id}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">客服姓名</label>
                    <span className="text-slate-800">{selectedFeedback.user_name}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">违规类型</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(violationTypes[selectedFeedback.violation_type] || { bg: 'bg-slate-100', color: 'text-slate-700' }).bg} ${(violationTypes[selectedFeedback.violation_type] || { bg: 'bg-slate-100', color: 'text-slate-700' }).color}`}>
                      {(violationTypes[selectedFeedback.violation_type] || { label: selectedFeedback.violation_type }).label}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">扣分</label>
                    <span className={`font-bold ${selectedFeedback.deduction < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedFeedback.deduction} 分
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-500 mb-2">聊天摘要</label>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">{selectedFeedback.chat_summary}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">违规标注</label>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{selectedFeedback.violation_note}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}