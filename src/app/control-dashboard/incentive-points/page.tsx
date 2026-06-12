'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface IncentiveRecord {
  user_id: string;
  user_name: string;
  current_points: number;
  monthly_change: number;
  rank: number;
}

const mockRecords: IncentiveRecord[] = [
  { user_id: '1', user_name: '张三', current_points: 1250, monthly_change: +230, rank: 1 },
  { user_id: '2', user_name: '王五', current_points: 1180, monthly_change: +180, rank: 2 },
  { user_id: '3', user_name: '钱七', current_points: 1050, monthly_change: +210, rank: 3 },
  { user_id: '4', user_name: '李四', current_points: 980, monthly_change: +150, rank: 4 },
  { user_id: '5', user_name: '赵六', current_points: 890, monthly_change: -50, rank: 5 },
];

export default function IncentivePointsPage() {
  const [records, setRecords] = useState<IncentiveRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('kpi_scores').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setRecords(data as IncentiveRecord[]);
        } else {
          setRecords(mockRecords);
        }
      } catch (err) {
        console.error('获取积分失败:', err);
        setRecords(mockRecords);
      }
      setLoading(false);
    };

    fetchRecords();
  }, []);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return { icon: '🥇', bg: 'bg-yellow-100', text: 'text-yellow-700' };
      case 2:
        return { icon: '🥈', bg: 'bg-gray-100', text: 'text-gray-700' };
      case 3:
        return { icon: '🥉', bg: 'bg-orange-100', text: 'text-orange-700' };
      default:
        return { icon: `#${rank}`, bg: 'bg-slate-100', text: 'text-slate-700' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">激励积分</h1>
            <p className="text-slate-500 text-sm mt-1">客服积分排行榜与变动记录</p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{records[0]?.current_points || 0}</div>
            <div className="text-sm opacity-90">冠军积分</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{records.length}</div>
            <div className="text-sm opacity-90">参与人数</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">+{records.reduce((sum, r) => sum + Math.max(0, r.monthly_change), 0)}</div>
            <div className="text-sm opacity-90">本月总增长</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">积分规则</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-slate-800">完结工单</div>
                <div className="text-sm text-slate-500">+5 积分</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-slate-800">客户好评</div>
                <div className="text-sm text-slate-500">+10 积分</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-slate-800">违规扣分</div>
                <div className="text-sm text-slate-500">-20 积分</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">排名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">客服姓名</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">当前积分</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">本月变动</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-slate-500">加载中...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-slate-500">暂无积分记录</p>
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  const badge = getRankBadge(record.rank);
                  return (
                    <tr key={record.user_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center w-10 h-10 rounded-full ${badge.bg} ${badge.text} font-bold`}>
                          {badge.icon}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                            {record.user_name[0]}
                          </div>
                          <span className="font-medium text-slate-800">{record.user_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-slate-800">{record.current_points.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${record.monthly_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {record.monthly_change >= 0 ? '+' : ''}{record.monthly_change}
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