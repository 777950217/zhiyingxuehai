'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface PlatformScore {
  platform: string;
  service_score: number;
  quality_score: number;
  logistics_score: number;
  service_trend: 'up' | 'down' | 'stable';
  quality_trend: 'up' | 'down' | 'stable';
  logistics_trend: 'up' | 'down' | 'stable';
}

interface TrendData {
  date: string;
  score: number;
}

const platforms = [
  { key: 'taobao', label: '淘宝', icon: '🛒' },
  { key: 'douyin', label: '抖音', icon: '🎵' },
  { key: 'pinduoduo', label: '拼多多', icon: '📦' },
  { key: 'jd', label: '京东', icon: '🛍️' },
];

const mockScores: Record<string, PlatformScore> = {
  taobao: { platform: 'taobao', service_score: 85, quality_score: 88, logistics_score: 82, service_trend: 'up', quality_trend: 'stable', logistics_trend: 'down' },
  douyin: { platform: 'douyin', service_score: 78, quality_score: 85, logistics_score: 90, service_trend: 'down', quality_trend: 'up', logistics_trend: 'up' },
  pinduoduo: { platform: 'pinduoduo', service_score: 82, quality_score: 80, logistics_score: 88, service_trend: 'up', quality_trend: 'down', logistics_trend: 'stable' },
  jd: { platform: 'jd', service_score: 90, quality_score: 92, logistics_score: 95, service_trend: 'stable', quality_trend: 'up', logistics_trend: 'up' },
};

const mockTrendData: TrendData[] = [
  { date: '1月1日', score: 82 },
  { date: '1月5日', score: 84 },
  { date: '1月10日', score: 81 },
  { date: '1月15日', score: 86 },
  { date: '1月20日', score: 85 },
  { date: '1月25日', score: 88 },
  { date: '1月30日', score: 90 },
];

export default function ScoreDashboardPage() {
  const [activePlatform, setActivePlatform] = useState('taobao');
  const [scores, setScores] = useState<Record<string, PlatformScore>>(mockScores);
  const [trendData, setTrendData] = useState<TrendData[]>(mockTrendData);
  const [isEditing, setIsEditing] = useState(false);
  const [editScores, setEditScores] = useState({
    service_score: 85,
    quality_score: 88,
    logistics_score: 82,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase.from('platform_scores').select('*');

        if (data && data.length > 0) {
          const scoreMap: Record<string, PlatformScore> = {};
          data.forEach((item: any) => {
            scoreMap[item.platform] = item;
          });
          setScores(scoreMap);
        }
      } catch (err) {
        console.error('获取数据失败:', err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const currentScores = scores[activePlatform] || mockScores[activePlatform];

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
    if (trend === 'down') return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
    return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-slate-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-green-100';
    if (score >= 75) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const handleSaveScores = () => {
    setScores(prev => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        service_score: editScores.service_score,
        quality_score: editScores.quality_score,
        logistics_score: editScores.logistics_score,
      },
    }));
    setIsEditing(false);
    alert('分数已更新！');
  };

  const overallScore = Math.round(
    (currentScores.service_score * 0.4) +
    (currentScores.quality_score * 0.3) +
    (currentScores.logistics_score * 0.3)
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">体验分仪表盘</h1>
            <p className="text-slate-500 text-sm mt-1">监控各平台服务体验分数</p>
          </div>
          <button
            onClick={() => { setIsEditing(true); setEditScores({ service_score: currentScores.service_score, quality_score: currentScores.quality_score, logistics_score: currentScores.logistics_score }); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            编辑分数
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {platforms.map(platform => (
            <button
              key={platform.key}
              onClick={() => setActivePlatform(platform.key)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activePlatform === platform.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{platform.icon}</span>
              {platform.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{platforms.find(p => p.key === activePlatform)?.label}平台</h3>
              <p className="text-sm text-slate-500 mt-1">综合体验分</p>
            </div>
            <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-800">服务保障分</h4>
              <span className="text-xs text-slate-500">权重 40%</span>
            </div>
            {isEditing ? (
              <input
                type="number"
                value={editScores.service_score}
                onChange={(e) => setEditScores(prev => ({ ...prev, service_score: parseInt(e.target.value) || 0 }))}
                className="w-full text-center text-4xl font-bold border-b-2 border-blue-500 pb-2 focus:outline-none"
              />
            ) : (
              <div className={`text-4xl font-bold ${getScoreColor(currentScores.service_score)}`}>
                {currentScores.service_score}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <div className={`flex items-center gap-1 ${getTrendColor(currentScores.service_trend)}`}>
                {getTrendIcon(currentScores.service_trend)}
                <span className="text-sm">趋势</span>
              </div>
              {currentScores.service_score < 75 && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  红色预警
                </span>
              )}
              {currentScores.service_score >= 75 && currentScores.service_score < 85 && (
                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  黄色预警
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-800">商品质量分</h4>
              <span className="text-xs text-slate-500">权重 30%</span>
            </div>
            {isEditing ? (
              <input
                type="number"
                value={editScores.quality_score}
                onChange={(e) => setEditScores(prev => ({ ...prev, quality_score: parseInt(e.target.value) || 0 }))}
                className="w-full text-center text-4xl font-bold border-b-2 border-blue-500 pb-2 focus:outline-none"
              />
            ) : (
              <div className={`text-4xl font-bold ${getScoreColor(currentScores.quality_score)}`}>
                {currentScores.quality_score}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <div className={`flex items-center gap-1 ${getTrendColor(currentScores.quality_trend)}`}>
                {getTrendIcon(currentScores.quality_trend)}
                <span className="text-sm">趋势</span>
              </div>
              {currentScores.quality_score < 75 && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  红色预警
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-800">物流速度分</h4>
              <span className="text-xs text-slate-500">权重 30%</span>
            </div>
            {isEditing ? (
              <input
                type="number"
                value={editScores.logistics_score}
                onChange={(e) => setEditScores(prev => ({ ...prev, logistics_score: parseInt(e.target.value) || 0 }))}
                className="w-full text-center text-4xl font-bold border-b-2 border-blue-500 pb-2 focus:outline-none"
              />
            ) : (
              <div className={`text-4xl font-bold ${getScoreColor(currentScores.logistics_score)}`}>
                {currentScores.logistics_score}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <div className={`flex items-center gap-1 ${getTrendColor(currentScores.logistics_trend)}`}>
                {getTrendIcon(currentScores.logistics_trend)}
                <span className="text-sm">趋势</span>
              </div>
              {currentScores.logistics_score < 75 && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  红色预警
                </span>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex justify-end">
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100">
                取消
              </button>
              <button onClick={handleSaveScores} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                保存
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">近30天趋势</h3>
          <div className="h-48">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 400 150">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${trendData.map((point, i) => `${i === 0 ? 'M' : 'L'} ${(i / (trendData.length - 1)) * 400} ${150 - (point.score - 70) * 5}`).join(' ')} L 400 150 L 0 150 Z`}
                  fill="url(#scoreGradient)"
                />
                <path
                  d={trendData.map((point, i) => `${i === 0 ? 'M' : 'L'} ${(i / (trendData.length - 1)) * 400} ${150 - (point.score - 70) * 5}`).join(' ')}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {trendData.map((point, i) => (
                  <circle
                    key={i}
                    cx={(i / (trendData.length - 1)) * 400}
                    cy={150 - (point.score - 70) * 5}
                    r="5"
                    fill="#ffffff"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                ))}
                {trendData.map((point, i) => (
                  <text
                    key={`label-${i}`}
                    x={(i / (trendData.length - 1)) * 400}
                    y="145"
                    textAnchor="middle"
                    className="text-xs fill-slate-500"
                    style={{ fontSize: '10px' }}
                  >
                    {point.date}
                  </text>
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}