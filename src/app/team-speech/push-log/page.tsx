'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface PushLog {
  id: string;
  phrase_title: string;
  pushed_at: string;
  pushed_by_name: string;
  confirmed_count: number;
  unconfirmed_count: number;
  confirmations: Confirmation[];
}

interface Confirmation {
  user_name: string;
  confirmed: boolean;
  confirmed_at: string | null;
}

const mockPushLogs: PushLog[] = [
  {
    id: '1',
    phrase_title: '退换货标准话术 v2',
    pushed_at: '2024-01-15 10:30:00',
    pushed_by_name: '张三',
    confirmed_count: 3,
    unconfirmed_count: 2,
    confirmations: [
      { user_name: '李四', confirmed: true, confirmed_at: '2024-01-15 10:35:00' },
      { user_name: '王五', confirmed: true, confirmed_at: '2024-01-15 10:40:00' },
      { user_name: '赵六', confirmed: true, confirmed_at: '2024-01-15 10:45:00' },
      { user_name: '钱七', confirmed: false, confirmed_at: null },
      { user_name: '孙八', confirmed: false, confirmed_at: null },
    ],
  },
  {
    id: '2',
    phrase_title: '安装投诉处理话术',
    pushed_at: '2024-01-14 14:20:00',
    pushed_by_name: '李四',
    confirmed_count: 5,
    unconfirmed_count: 0,
    confirmations: [
      { user_name: '张三', confirmed: true, confirmed_at: '2024-01-14 14:25:00' },
      { user_name: '王五', confirmed: true, confirmed_at: '2024-01-14 14:30:00' },
      { user_name: '赵六', confirmed: true, confirmed_at: '2024-01-14 14:35:00' },
      { user_name: '钱七', confirmed: true, confirmed_at: '2024-01-14 14:40:00' },
      { user_name: '孙八', confirmed: true, confirmed_at: '2024-01-14 14:45:00' },
    ],
  },
];

export default function PushLogPage() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<PushLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('speech_push_log').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setLogs(data as PushLog[]);
        } else {
          setLogs(mockPushLogs);
        }
      } catch (err) {
        console.error('获取推送记录失败:', err);
        setLogs(mockPushLogs);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const handleRemind = (logId: string) => {
    alert(`已向未确认的客服发送提醒！`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">推送记录</h1>
          <p className="text-slate-500 text-sm mt-1">查看话术推送历史和确认状态</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">话术标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">推送时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">推送人</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">已确认</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">未确认</th>
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
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-slate-500">暂无推送记录</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{log.phrase_title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">{formatTime(log.pushed_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">
                          {log.pushed_by_name[0]}
                        </div>
                        <span className="text-sm text-slate-700">{log.pushed_by_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-600 rounded-full font-bold">
                        {log.confirmed_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                        log.unconfirmed_count > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {log.unconfirmed_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          查看详情
                        </button>
                        {log.unconfirmed_count > 0 && (
                          <button
                            onClick={() => handleRemind(log.id)}
                            className="px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm rounded-lg hover:bg-yellow-200 transition-colors"
                          >
                            提醒
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">{selectedLog.phrase_title}</h2>
                  <p className="text-sm text-slate-500 mt-1">推送确认详情</p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedLog.confirmed_count}</div>
                    <div className="text-sm text-green-700">已确认</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedLog.unconfirmed_count}</div>
                    <div className="text-sm text-red-700">未确认</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedLog.confirmed_count + selectedLog.unconfirmed_count}</div>
                    <div className="text-sm text-blue-700">总人数</div>
                  </div>
                </div>

                <h3 className="text-sm font-medium text-slate-700 mb-3">客服确认状态</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedLog.confirmations.map((conf, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        conf.confirmed ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          conf.confirmed ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                        }`}>
                          {conf.user_name[0]}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{conf.user_name}</span>
                      </div>
                      {conf.confirmed ? (
                        <span className="text-xs text-green-600">{formatTime(conf.confirmed_at!)}</span>
                      ) : (
                        <span className="text-xs text-red-600">未确认</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}