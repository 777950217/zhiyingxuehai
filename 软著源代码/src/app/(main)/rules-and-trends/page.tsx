'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BookOpen, TrendingUp, Shield, CheckCircle2, AlertTriangle, Lightbulb, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface RuleUpdate {
  id: string;
  platform: string;
  title: string;
  summary: string | null;
  action_advice: string | null;
  effective_date: string | null;
  created_at: string;
  isRead: boolean;
}

interface IndustryTrend {
  id: string;
  category: string;
  trend: string;
  title: string;
  key_data: string | null;
  advice: string | null;
  advice_detail: string | null;
  created_at: string;
  isRead: boolean;
}

const PLATFORMS = ['全部', '抖音', '拼多�?, '京东', '天猫', '淘宝'];
const CATEGORIES = ['全部', '智能马桶', '花洒', '浴室�?, '水龙�?, '淋浴�?];

const PLATFORM_COLORS: Record<string, string> = {
  '抖音': 'bg-black text-white',
  '拼多�?: 'bg-red-600 text-white',
  '京东': 'bg-red-700 text-white',
  '天猫': 'bg-red-500 text-white',
  '淘宝': 'bg-orange-500 text-white',
};

export default function RulesAndTrendsPage() {
  const { profile, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'trends'>('rules');
  const [rules, setRules] = useState<RuleUpdate[]>([]);
  const [trends, setTrends] = useState<IndustryTrend[]>([]);
  const [platformFilter, setPlatformFilter] = useState('全部');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [loading, setLoading] = useState(true);

  const isEntAdmin = profile?.role === 'enterprise_admin';

  const fetchRules = useCallback(async () => {
    try {
      const params = new URLSearchParams({ user_id: profile?.id ?? '' });
      if (platformFilter !== '全部') params.set('platform', platformFilter);
      const res = await authFetch(`/api/rule-updates?${params}`);
      const json = await res.json();
      if (json.data) setRules(json.data);
    } catch { /* ignore */ }
  }, [profile?.id, platformFilter]);

  const fetchTrends = useCallback(async () => {
    try {
      const params = new URLSearchParams({ user_id: profile?.id ?? '' });
      if (categoryFilter !== '全部') params.set('category', categoryFilter);
      const res = await authFetch(`/api/industry-trends?${params}`);
      const json = await res.json();
      if (json.data) setTrends(json.data);
    } catch { /* ignore */ }
  }, [profile?.id, categoryFilter]);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    Promise.all([fetchRules(), isEntAdmin ? fetchTrends() : Promise.resolve()]).finally(() => setLoading(false));
  }, [profile?.id, fetchRules, fetchTrends, isEntAdmin]);

  const markRead = async (itemType: string, itemId: string) => {
    try {
      await authFetch('/api/user-read-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id, itemType, itemId }),
      });
      if (itemType === 'rule_update') {
        setRules(prev => prev.map(r => r.id === itemId ? { ...r, isRead: true } : r));
      } else {
        setTrends(prev => prev.map(t => t.id === itemId ? { ...t, isRead: true } : t));
      }
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    if (activeTab === 'rules') {
      for (const r of rules.filter(r => !r.isRead)) {
        await markRead('rule_update', r.id);
      }
    } else {
      for (const t of trends.filter(t => !t.isRead)) {
        await markRead('industry_trend', t.id);
      }
    }
  };

  const filteredRules = platformFilter === '全部' ? rules : rules.filter(r => r.platform === platformFilter);
  const filteredTrends = categoryFilter === '全部' ? trends : trends.filter(t => t.category === categoryFilter);
  const unreadRules = filteredRules.filter(r => !r.isRead).length;
  const unreadTrends = filteredTrends.filter(t => !t.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">规则解读与卫浴趋�?/h1>
        <p className="text-slate-500 mt-1">掌握平台规则变动，洞察卫浴行业趋�?/p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-2.5 rounded-lg text-base font-medium transition-colors ${
            activeTab === 'rules' ? 'bg-blue-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5" />
          规则解读
          {unreadRules > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadRules}</span>}
        </button>
        {isEntAdmin && (
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-5 py-2.5 rounded-lg text-base font-medium transition-colors ${
              activeTab === 'trends' ? 'bg-blue-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1.5" />
            卫浴趋势·选品决策
            {unreadTrends > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadTrends}</span>}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">加载�?..</div>
      ) : activeTab === 'rules' ? (
        /* Rules Tab */
        <div>
          {/* Platform Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  platformFilter === p ? 'bg-blue-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
            {unreadRules > 0 && (
              <button onClick={markAllRead} className="ml-auto text-sm text-blue-700 hover:text-blue-900 font-medium">
                全部标为已读
              </button>
            )}
          </div>

          {/* Rule Cards */}
          <div className="space-y-4">
            {filteredRules.length === 0 && (
              <div className="text-center py-16 text-slate-400">暂无规则更新</div>
            )}
            {filteredRules.map(rule => (
              <div key={rule.id} className={`bg-white rounded-xl p-5 border ${rule.isRead ? 'border-slate-100' : 'border-blue-200 ring-1 ring-blue-100'} transition-colors`}>
                <div className="flex items-start gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${PLATFORM_COLORS[rule.platform] ?? 'bg-slate-600 text-white'}`}>
                    {rule.platform}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!rule.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                      <h3 className="text-lg font-semibold text-slate-900">{rule.title}</h3>
                    </div>
                    {rule.effective_date && (
                      <p className="text-xs text-slate-400 mt-1">生效日期：{rule.effective_date}</p>
                    )}
                    {rule.summary && (
                      <p className="text-slate-600 mt-2 text-base leading-relaxed">{rule.summary}</p>
                    )}
                    {rule.action_advice && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-amber-900 text-base font-medium leading-relaxed">{rule.action_advice}</p>
                        </div>
                      </div>
                    )}
                    {!rule.isRead && (
                      <button
                        onClick={() => markRead('rule_update', rule.id)}
                        className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" /> 已知�?
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Trends Tab */
        <div>
          {/* Category Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === c ? 'bg-blue-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
            {unreadTrends > 0 && (
              <button onClick={markAllRead} className="ml-auto text-sm text-blue-700 hover:text-blue-900 font-medium">
                全部标为已读
              </button>
            )}
          </div>

          {/* Trend Cards */}
          <div className="space-y-4">
            {filteredTrends.length === 0 && (
              <div className="text-center py-16 text-slate-400">暂无行业趋势</div>
            )}
            {filteredTrends.map(trend => {
              const trendIcon = trend.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : trend.trend === 'down' ? <ArrowDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;
              const trendColor = trend.trend === 'up' ? 'bg-green-100 text-green-700' : trend.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';
              const trendLabel = trend.trend === 'up' ? '�?上涨' : trend.trend === 'down' ? '�?下跌' : '�?稳定';
              const adviceBg = trend.advice === '加品' ? 'bg-emerald-50 border-emerald-200' : trend.advice === '减品' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200';
              const adviceText = trend.advice === '加品' ? 'text-emerald-900' : trend.advice === '减品' ? 'text-red-900' : 'text-slate-700';
              const adviceIconColor = trend.advice === '加品' ? 'text-emerald-500' : trend.advice === '减品' ? 'text-red-500' : 'text-slate-400';

              return (
                <div key={trend.id} className={`bg-white rounded-xl p-5 border ${!trend.isRead ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100'} transition-colors`}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${trendColor} flex items-center gap-1`}>
                        {trendIcon} {trendLabel}
                      </span>
                      <span className="text-xs text-slate-400">{trend.category}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!trend.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                        <h3 className="text-lg font-semibold text-slate-900">{trend.title}</h3>
                      </div>
                      {trend.key_data && (
                        <p className="text-slate-600 mt-2 text-base leading-relaxed">{trend.key_data}</p>
                      )}
                      {trend.advice_detail && (
                        <div className={`mt-3 ${adviceBg} border rounded-lg p-3`}>
                          <div className="flex items-start gap-2">
                            <Lightbulb className={`w-5 h-5 shrink-0 mt-0.5 ${adviceIconColor}`} />
                            <div>
                              {trend.advice && (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mr-2 ${trend.advice === '加品' ? 'bg-emerald-200 text-emerald-800' : trend.advice === '减品' ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-700'}`}>
                                  {trend.advice}
                                </span>
                              )}
                              <p className={`${adviceText} text-base font-medium leading-relaxed mt-1`}>{trend.advice_detail}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {!trend.isRead && (
                        <button
                          onClick={() => markRead('industry_trend', trend.id)}
                          className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 已知�?
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
