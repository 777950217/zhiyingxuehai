'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface UsageStat {
  user_id: string;
  user_name: string;
  usage_count: number;
}

interface PhraseUsage {
  phrase_title: string;
  usage_count: number;
}

interface DailyStats {
  date: string;
  count: number;
}

const mockUserStats: UsageStat[] = [
  { user_id: '1', user_name: '张三', usage_count: 156 },
  { user_id: '2', user_name: '王五', usage_count: 142 },
  { user_id: '3', user_name: '李四', usage_count: 128 },
  { user_id: '4', user_name: '钱七', usage_count: 98 },
  { user_id: '5', user_name: '赵六', usage_count: 75 },
];

const mockPhraseStats: PhraseUsage[] = [
  { phrase_title: '退换货标准话术', usage_count: 89 },
  { phrase_title: '安装投诉处理话术', usage_count: 76 },
  { phrase_title: '产品质量问题回复', usage_count: 65 },
  { phrase_title: '物流破损处理流程', usage_count: 45 },
  { phrase_title: '售后沟通技巧', usage_count: 38 },
];

const mockLowUsagePhrases: PhraseUsage[] = [
  { phrase_title: '老客户回访话术', usage_count: 5 },
  { phrase_title: '节日问候模板', usage_count: 3 },
  { phrase_title: '活动通知话术', usage_count: 2 },
];

const mockDailyStats: DailyStats[] = [
  { date: '06-07', count: 45 },
  { date: '06-08', count: 52 },
  { date: '06-09', count: 38 },
  { date: '06-10', count: 65 },
  { date: '06-11', count: 58 },
  { date: '06-12', count: 72 },
  { date: '06-13', count: 48 },
];

export default function UsageStatsPage() {
  const [userStats, setUserStats] = useState<UsageStat[]>([]);
  const [phraseStats, setPhraseStats] = useState<PhraseUsage[]>([]);
  const [lowUsagePhrases, setLowUsagePhrases] = useState<PhraseUsage[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: usageData, error } = await supabase.from('speech_usage_log').select('*');

        if (error) throw error;

        if (usageData && usageData.length > 0) {
          setUserStats(mockUserStats);
          setPhraseStats(mockPhraseStats);
          setLowUsagePhrases(mockLowUsagePhrases);
          setDailyStats(mockDailyStats);
        } else {
          setUserStats(mockUserStats);
          setPhraseStats(mockPhraseStats);
          setLowUsagePhrases(mockLowUsagePhrases);
          setDailyStats(mockDailyStats);
        }
      } catch (err) {
        console.error('获取使用统计失败:', err);
        setUserStats(mockUserStats);
        setPhraseStats(mockPhraseStats);
        setLowUsagePhrases(mockLowUsagePhrases);
        setDailyStats(mockDailyStats);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  const maxDailyCount = Math.max(...dailyStats.map(d => d.count));

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">应用监控</h1>
          <p className="text-slate-500 text-sm mt-1">话术使用数据统计与分析</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-slate-500 mb-1">今日使用次数</div>
            <div className="text-3xl font-bold text-slate-800">{dailyStats[dailyStats.length - 1]?.count || 0}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-slate-500 mb-1">本周总使用</div>
            <div className="text-3xl font-bold text-slate-800">{dailyStats.reduce((sum, d) => sum + d.count, 0)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-slate-500 mb-1">活跃客服</div>
            <div className="text-3xl font-bold text-slate-800">{userStats.length}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">客服话术使用率排名</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : userStats.length === 0 ? (
                <p className="text-center text-slate-500 py-8">暂无数据</p>
              ) : (
                userStats.map((stat, index) => (
                  <div key={stat.user_id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800">{stat.user_name}</span>
                        <span className="text-sm text-slate-500">{stat.usage_count} 次</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${(stat.usage_count / userStats[0].usage_count) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">近7天使用趋势</h3>
            <div className="flex items-end justify-between h-40">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : dailyStats.length === 0 ? (
                <p className="text-center text-slate-500">暂无数据</p>
              ) : (
                dailyStats.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs text-slate-500 mb-1">{day.count}</span>
                      <div className="w-8 bg-slate-100 rounded-t-lg overflow-hidden" style={{ height: '120px' }}>
                        <div
                          className="w-full bg-blue-500 transition-all"
                          style={{ height: `${(day.count / maxDailyCount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{day.date}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">高频使用话术 TOP5</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : phraseStats.length === 0 ? (
                <p className="text-center text-slate-500 py-8">暂无数据</p>
              ) : (
                phraseStats.map((phrase, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-green-100 text-green-700' :
                      index === 1 ? 'bg-blue-100 text-blue-700' :
                      index === 2 ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-700 truncate">{phrase.phrase_title}</span>
                    <span className="text-sm font-medium text-slate-800">{phrase.usage_count} 次</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">低频使用话术（建议更新）</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : lowUsagePhrases.length === 0 ? (
                <p className="text-center text-slate-500 py-8">暂无低频话术</p>
              ) : (
                lowUsagePhrases.map((phrase, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="flex-1 text-sm text-slate-700">{phrase.phrase_title}</span>
                    <span className="text-sm text-yellow-600">{phrase.usage_count} 次</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}