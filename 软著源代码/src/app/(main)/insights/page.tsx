'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  CheckCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  INSIGHT_TYPES,
  INSIGHT_DARK_CONFIG,
  type InsightType,
  getInsightTypesByRole,
  getInsightTypeLabel,
} from '@/lib/insights';
import { InsightDetailModal } from '@/components/insights/InsightDetailModal';
import { toast } from 'sonner';

/* ========== 类型定义 ========== */

interface Insight {
  id: string;
  company_id: string;
  user_id: string | null;
  insight_type: string;
  title: string;
  summary: string;
  detail: Record<string, unknown>;
  priority: string;
  is_read: boolean;
  created_at: string;
}

/* ========== 常量 ========== */

const TYPE_LABELS: Record<string, string> = {
  quality_decline: '质检下滑',
  kpi_warning: 'KPI预警',
  compensation_spike: '赔付飙升',
  rule_change: '规则变动',
  incentive_trend: '激励趋�?,
  learning_stagnation: '学习停滞',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dotClass: string }> = {
  high: { label: '紧�?, color: 'text-red-400', dotClass: 'bg-red-400' },
  normal: { label: '一�?, color: 'text-amber-400', dotClass: 'bg-amber-400' },
  low: { label: '�?, color: 'text-white/40', dotClass: 'bg-white/30' },
};

/* ========== 工具函数 ========== */

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return '刚刚';
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString('zh-CN');
}

/* ========== 主组�?========== */

export default function InsightsPage() {
  const { profile, authFetch } = useAuth();
  const companyId = profile?.companyId;
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const role = profile?.role || '';
  const visibleTypes = getInsightTypesByRole(role);

  const fetchInsights = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String((page - 1) * pageSize));
      if (filterType !== 'all') params.set('insight_type', filterType);
      if (filterRead !== 'all') params.set('is_read', filterRead);

      const res = await authFetch(`/api/insights?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        setTotal(data.total || 0);
      }
    } catch {
      toast.error('获取洞察失败');
    } finally {
      setLoading(false);
    }
  }, [companyId, authFetch, filterType, filterRead, page]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const markAsRead = async (id: string) => {
    try {
      await authFetch(`/api/insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });
      setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await authFetch('/api/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, companyId }),
      });
      setInsights(prev => prev.map(i => ({ ...i, is_read: true })));
      toast.success('已全部标为已�?);
    } catch {
      toast.error('操作失败');
    }
  };

  const handleGenerate = async () => {
    if (!companyId) return;
    setGenerating(true);
    try {
      const res = await authFetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) {
          toast.success(`生成�?{data.count}条新洞察`);
        } else {
          toast.info('当前无新洞察，数据指标均在正常范�?);
        }
        fetchInsights();
      } else {
        toast.error('生成洞察失败');
      }
    } catch {
      toast.error('生成洞察失败');
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const insight = insights.find(i => i.id === id);
      if (insight && !insight.is_read) markAsRead(id);
    }
  };

  const unreadCount = insights.filter(i => !i.is_read).length;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-[#0B1929] p-4 md:p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">洞察中心</h1>
          <p className="text-white/50 mt-2 text-base">智能分析数据，提前发现风险和机会</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-sky-500 hover:bg-sky-600 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '分析�?..' : '刷新洞察'}
          </Button>
          <Bell className="w-6 h-6 text-sky-400" />
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold">
              {unreadCount}条未�?
            </span>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* ══════�?洞察列表 ══════�?*/}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔔</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">管理洞察</h2>
              {unreadCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold">
                  {unreadCount}条未�?
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
              >
                全部标为已读
              </button>
            )}
          </div>

          {/* 筛选栏 */}
          <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-5 h-5 text-white/40" />
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
                <SelectTrigger className="w-36 bg-[#1a3a5c] border-white/10 text-white">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {visibleTypes.map((t) => (
                    <SelectItem key={t} value={t}>{getInsightTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRead} onValueChange={(v) => { setFilterRead(v); setPage(1); }}>
                <SelectTrigger className="w-32 bg-[#1a3a5c] border-white/10 text-white">
                  <SelectValue placeholder="状�? />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状�?/SelectItem>
                  <SelectItem value="false">未读</SelectItem>
                  <SelectItem value="true">已读</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 洞察列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
            </div>
          ) : insights.length === 0 ? (
            <div className="bg-[#0F2B46] border border-white/10 rounded-2xl p-12 text-center">
              <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <p className="text-white/60 text-xl">暂无洞察，一切正�?/p>
              <p className="text-white/30 text-base mt-2">系统每天自动分析数据并推送洞�?/p>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="mt-4 bg-sky-500 hover:bg-sky-600 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                手动分析
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {insights.map(insight => {
                  const darkConfig = INSIGHT_DARK_CONFIG[insight.insight_type as InsightType];
                  const prioConfig = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.normal;
                  const isExpanded = expandedId === insight.id;

                  return (
                    <div
                      key={insight.id}
                      className={`bg-[#0F2B46] border rounded-2xl p-5 transition-all cursor-pointer hover:border-white/20 ${
                        !insight.is_read ? 'border-sky-400/30' : 'border-white/10'
                      }`}
                      onClick={() => toggleExpand(insight.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${darkConfig?.bgClass || 'bg-white/5'}`}>
                          <span className="text-sm">{darkConfig?.icon || (INSIGHT_DARK_CONFIG[insight.insight_type as InsightType]?.icon) || '🔔'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white/50 text-sm">{TYPE_LABELS[insight.insight_type] || insight.insight_type}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-md ${prioConfig.color} ${insight.priority === 'high' ? 'bg-red-400/10' : insight.priority === 'low' ? 'bg-white/5' : 'bg-amber-400/10'}`}>
                              {prioConfig.label}
                            </span>
                            {!insight.is_read && <span className="w-2.5 h-2.5 bg-sky-400 rounded-full" />}
                            <span className="text-white/30 text-sm ml-auto">{formatTime(insight.created_at)}</span>
                          </div>
                          <p className={`text-base font-medium ${!insight.is_read ? 'text-white' : 'text-white/60'}`}>
                            {insight.title}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-white/40 shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-white/40 shrink-0" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 ml-12 space-y-3">
                          <div className="text-white/70 text-base leading-relaxed bg-white/5 rounded-lg p-4">
                            {insight.summary}
                          </div>
                          {insight.detail && Object.keys(insight.detail).length > 0 && (
                            <div className="bg-white/5 rounded-lg p-4">
                              <p className="text-white/50 text-sm font-medium mb-2">详细数据</p>
                              <pre className="text-white/60 text-xs whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(insight.detail, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                              onClick={(e) => { e.stopPropagation(); setSelectedInsight(insight); }}
                            >
                              <ExternalLink className="w-4 h-4" />
                              查看详情
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="border-white/10 text-white/60 hover:bg-white/5"
                  >
                    上一�?
                  </Button>
                  <span className="text-white/40 text-sm">
                    �?{page} / {totalPages} �?(共{total}�?
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="border-white/10 text-white/60 hover:bg-white/5"
                  >
                    下一�?
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* 详情弹窗 */}
      <InsightDetailModal
        insight={selectedInsight}
        onClose={() => setSelectedInsight(null)}
      />
    </div>
  );
}
