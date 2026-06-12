'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface KPIScore {
  user_id: string;
  user_name: string;
  today_score: number;
  week_score: number;
  month_score: number;
  response_speed: number;
  service_attitude: number;
  resolution_rate: number;
  compliance_rate: number;
}

const mockScores: KPIScore[] = [
  { user_id: '1', user_name: '张三', today_score: 95, week_score: 92, month_score: 90, response_speed: 95, service_attitude: 98, resolution_rate: 88, compliance_rate: 96 },
  { user_id: '2', user_name: '李四', today_score: 88, week_score: 85, month_score: 87, response_speed: 82, service_attitude: 90, resolution_rate: 85, compliance_rate: 92 },
  { user_id: '3', user_name: '王五', today_score: 92, week_score: 91, month_score: 89, response_speed: 90, service_attitude: 95, resolution_rate: 86, compliance_rate: 94 },
  { user_id: '4', user_name: '赵六', today_score: 85, week_score: 83, month_score: 84, response_speed: 78, service_attitude: 88, resolution_rate: 82, compliance_rate: 88 },
  { user_id: '5', user_name: '钱七', today_score: 96, week_score: 94, month_score: 93, response_speed: 98, service_attitude: 96, resolution_rate: 92, compliance_rate: 98 },
];

const getGrade = (score: number) => {
  if (score >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
  if (score >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
  if (score >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' };
};

export default function QualityScorePage() {
  const [scores, setScores] = useState<KPIScore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('kpi_scores').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setScores(data as KPIScore[]);
        } else {
          setScores(mockScores);
        }
      } catch (err) {
        console.error('获取评分失败:', err);
        setScores(mockScores);
      }
      setLoading(false);
    };

    fetchScores();
  }, []);

  const filteredScores = scores.filter(s => 
    s.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreByPeriod = (score: KPIScore) => {
    switch (selectedPeriod) {
      case 'today': return score.today_score;
      case 'week': return score.week_score;
      case 'month': return score.month_score;
      default: return score.week_score;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">质检评分</h1>
            <p className="text-slate-500 text-sm mt-1">客服绩效评分与评级管理</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索客服姓名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'today', label: '今日' },
                { value: 'week', label: '本周' },
                { value: 'month', label: '本月' },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPeriod(p.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === p.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">客服姓名</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">得分</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">评级</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">响应速度</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">服务态度</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">问题解决率</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">合规率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-slate-500">加载中...</p>
                  </td>
                </tr>
              ) : filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <p className="mt-4 text-slate-500">暂无评分数据</p>
                  </td>
                </tr>
              ) : (
                filteredScores.map((score, index) => {
                  const currentScore = getScoreByPeriod(score);
                  const gradeInfo = getGrade(currentScore);
                  return (
                    <tr key={score.user_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                            {score.user_name[0]}
                          </div>
                          <span className="font-medium text-slate-800">{score.user_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${currentScore >= 90 ? 'text-green-600' : currentScore >= 80 ? 'text-blue-600' : currentScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {currentScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${gradeInfo.bg} ${gradeInfo.color}`}>
                          {gradeInfo.grade}级
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${score.response_speed}%` }}></div>
                          </div>
                          <span className="text-sm text-slate-600">{score.response_speed}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${score.service_attitude}%` }}></div>
                          </div>
                          <span className="text-sm text-slate-600">{score.service_attitude}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${score.resolution_rate}%` }}></div>
                          </div>
                          <span className="text-sm text-slate-600">{score.resolution_rate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${score.compliance_rate}%` }}></div>
                          </div>
                          <span className="text-sm text-slate-600">{score.compliance_rate}%</span>
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
    </div>
  );
}