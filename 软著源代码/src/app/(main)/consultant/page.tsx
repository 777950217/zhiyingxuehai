'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  Users, Activity, AlertTriangle, Clock, Search, Filter,
  ChevronRight, MessageSquare, Send, X, TrendingUp,
  BarChart3, CheckCircle2, XCircle, ArrowUpRight,
  Lightbulb, Target, Shield, GraduationCap, FileText, Bot, ExternalLink
} from 'lucide-react';
import { PermissionLocked } from '@/components/permission-locked';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

// ─── Types ───
interface ClientRecord {
  id: string;
  name: string;
  service_level: string;
  plan: string;
  plan_end: string | null;
  current_day: number;
  total_days: number;
  completed_days: number;
  task_total: number;
  task_completed: number;
  task_completion_rate: number;
  task_status: string;
  ai_usage_7d: number;
  inspection_7d: number;
  last_active: string | null;
  last_active_days: number | null;
  health_status: 'normal' | 'attention' | 'abnormal';
  health_emoji: string;
  health_label: string;
  health_color: string;
}

interface ClientDetail {
  company: Record<string, unknown>;
  subscription: Record<string, unknown> | null;
  ai_trend: Record<string, { count: number; categories: string[] }>;
  recent_inspections: Record<string, unknown>[];
  onboarding_tasks: Record<string, unknown>[];
  onboarding_progress: Record<string, unknown> | null;
  users: Record<string, unknown>[];
  activity_logs: { id: string; type: string; title: string; content: string; created_at: string; source: string }[];
}

type HealthFilter = 'all' | 'normal' | 'attention' | 'abnormal';

interface InsightItem {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  type: string;
  message: string;
  link: string;
  company_ids: string[];
  company_names: string[];
}

const HEALTH_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  normal:   { label: '正常',   emoji: '🟢', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  attention:{ label: '需关注', emoji: '🟡', bg: 'bg-slate-50',  text: 'text-blue-900',  border: 'border-slate-200' },
  abnormal: { label: '异常',   emoji: '🔴', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
};

const INSIGHT_ICON: Record<string, React.ReactNode> = {
  kpi: <Target className="w-4 h-4" />,
  'cost-alert': <Shield className="w-4 h-4" />,
  quality: <BarChart3 className="w-4 h-4" />,
  training: <GraduationCap className="w-4 h-4" />,
  'work-order': <FileText className="w-4 h-4" />,
  'ai-usage': <Bot className="w-4 h-4" />,
};

// ─── Component ───
export default function ConsultantPage() {

  const router = useRouter();
  const { profile, authFetch } = useAuth();

  // Permission guard
  const role = profile?.role || 'staff';
  const lockedMsg = (role === 'staff' || role === 'enterprise_manager' || role === 'personal_user') ? '此功能仅限旗舰版使用' : null;
  if (lockedMsg) {
    return <PermissionLocked title="顾问面板" description={lockedMsg} />;
  }

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // Insights
  const [insights, setInsights] = useState<InsightItem[]>([]);

  // Stats
  const totalClients = clients.length;
  const normalCount = clients.filter(c => c.health_status === 'normal').length;
  const attentionCount = clients.filter(c => c.health_status === 'attention').length;
  const expiringCount = clients.filter(c => {
    if (!c.plan_end) return false;
    const days = Math.ceil((new Date(c.plan_end).getTime() - Date.now()) / (24 * 3600 * 1000));
    return days <= 7 && days >= 0;
  }).length;

  // Fetch clients
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/consultant?action=clients');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setClients(data.data || []);
    } catch (e) {
      console.error('获取客户列表失败', e);
      toast.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== 'admin') {
      router.push('/');
      return;
    }
    fetchClients();
    // Fetch insights
    authFetch('/api/consultant?action=insights')
      .then(res => res.json())
      .then(data => {
        if (data.insights) setInsights(data.insights);
      })
      .catch(() => {});
  }, [role, router, fetchClients]);

  // Fetch detail
  const fetchDetail = async (clientId: string) => {
    try {
      setDetailLoading(true);
      const res = await authFetch(`/api/consultant?action=client-detail&id=${clientId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetail(data.data);
    } catch (e) {
      console.error('获取客户详情失败', e);
      toast.error('获取客户详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open detail
  const handleOpenDetail = (client: ClientRecord) => {
    setSelectedClient(client);
    setDetailOpen(true);
    setNoteContent('');
    fetchDetail(client.id);
  };

  // Add note
  const handleAddNote = async () => {
    if (!selectedClient || !noteContent.trim()) return;
    try {
      const displayName = profile?.displayName || '顾问';
      const res = await authFetch('/api/consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-note',
          company_id: selectedClient.id,
          content: noteContent.trim(),
          operator_name: displayName,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('备注已添�?);
      setNoteContent('');
      fetchDetail(selectedClient.id);
    } catch (e) {
      toast.error('添加备注失败');
    }
  };

  // Send renewal reminder
  const handleRemindRenewal = async () => {
    if (!selectedClient) return;
    try {
      const res = await authFetch('/api/consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remind-renewal',
          company_id: selectedClient.id,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('订阅提醒已发�?);
    } catch (e) {
      toast.error('发送提醒失�?);
    }
  };

  // Filtered clients
  const filteredClients = clients.filter(c => {
    if (healthFilter !== 'all' && c.health_status !== healthFilter) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Build chart data for AI trend
  const buildAiTrendData = () => {
    if (!detail?.ai_trend) return [];
    const entries = Object.entries(detail.ai_trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30);
    return entries.map(([date, val]) => ({
      date: date.slice(5), // MM-DD
      count: val.count,
    }));
  };

  // Build inspection chart data
  const buildInspectionData = () => {
    if (!detail?.recent_inspections) return [];
    return detail.recent_inspections
      .map((ins: Record<string, unknown>, i: number) => ({
        name: `质检${i + 1}`,
        score: Number(ins.total_score || 0),
        date: ins.created_at ? new Date(ins.created_at as string).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '-',
      }))
      .reverse();
  };

  // ─── Permission guard ───
  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500">仅管理员可访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-slate-500 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">顾问后台</h1>
          <p className="text-sm text-gray-500">自学客户管理与监�?/p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="自学客户总数" value={totalClients} color="blue" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="正常客户" value={normalCount} color="green" sub="🟢" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="需关注客户" value={attentionCount} color="amber" sub="🟡" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="即将到期" value={expiringCount} color="red" sub="7天内" />
      </div>

      {/* 需要关�?- Insights */}
      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-blue-900 to-blue-800 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-300" />
          <h2 className="text-sm font-semibold text-white">需要关�?/h2>
          {insights.length > 0 && <span className="ml-auto text-xs text-blue-200">{insights.length}条建�?/span>}
        </div>
        {insights.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-sm text-green-700 font-medium">暂无需要关注的事项，一切正�?/p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {insights.map(ins => (
              <div
                key={ins.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                onClick={() => router.push(ins.link)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  ins.priority === 'P0' ? 'bg-red-100 text-red-600' :
                  ins.priority === 'P1' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {INSIGHT_ICON[ins.type] || <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      ins.priority === 'P0' ? 'bg-red-100 text-red-700' :
                      ins.priority === 'P1' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {ins.priority === 'P0' ? '紧�? : ins.priority === 'P1' ? '重要' : '建议'}
                    </span>
                    <p className="text-sm text-gray-800 font-medium truncate">{ins.message}</p>
                  </div>
                  {ins.company_names.length > 0 && (
                    <p className="text-xs text-gray-400 truncate">
                      涉及：{ins.company_names.slice(0, 3).join('�?)}{ins.company_names.length > 3 ? `�?{ins.company_names.length}家` : ''}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-sky-400 shrink-0 mt-1 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索客户名称..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 bg-white"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'normal', 'attention', 'abnormal'] as HealthFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setHealthFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                healthFilter === f
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? '全部' : HEALTH_CONFIG[f].emoji + ' ' + HEALTH_CONFIG[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Client Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无自学客户数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <ClientCard key={client.id} client={client} onClick={() => handleOpenDetail(client)} />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {detailOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${HEALTH_CONFIG[selectedClient.health_status].bg}`}>
                  <span className="text-lg">{HEALTH_CONFIG[selectedClient.health_status].emoji}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedClient.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>第{selectedClient.current_day}�?/ 共{selectedClient.total_days}�?/span>
                    {selectedClient.plan_end && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        Math.ceil((new Date(selectedClient.plan_end).getTime() - Date.now()) / (24*3600*1000)) <= 7
                          ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        到期: {new Date(selectedClient.plan_end).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
              {detailLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  {/* Overview Row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-sky-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-900">{selectedClient.ai_usage_7d}</p>
                      <p className="text-xs text-blue-950/70">7天AI使用</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedClient.task_status}</p>
                      <p className="text-xs text-blue-700/70">任务完成�?/p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedClient.inspection_7d}</p>
                      <p className="text-xs text-green-700/70">7天质检</p>
                    </div>
                  </div>

                  {/* AI Usage Trend Chart */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-sky-400" />
                      �?0天AI使用趋势
                    </h3>
                    <div className="h-48 bg-gray-50 rounded-xl p-3">
                      {buildAiTrendData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={buildAiTrendData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} name="AI使用次数" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无数据</div>
                      )}
                    </div>
                  </div>

                  {/* Inspection Scores */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      �?次质检评分
                    </h3>
                    <div className="h-36 bg-gray-50 rounded-xl p-3">
                      {buildInspectionData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={buildInspectionData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={[0, 100]} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} name="质检评分" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无质检记录</div>
                      )}
                    </div>
                  </div>

                  {/* Task Progress */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-500" />
                      自学任务进度
                    </h3>
                    <div className="space-y-2">
                      {detail?.onboarding_tasks && detail.onboarding_tasks.length > 0 ? (
                        detail.onboarding_tasks.slice(0, 8).map((task: Record<string, unknown>, i: number) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                            {task.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                            )}
                            <span className="text-sm text-gray-700 flex-1">Day{String(task.day)} {String(task.title)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              task.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {task.is_completed ? '已完�? : '进行�?}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">暂无任务记录</p>
                      )}
                      {detail?.onboarding_progress && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>整体进度</span>
                            <span className="font-medium">{detail.onboarding_progress.completed_days as number}/{detail.onboarding_progress.total_days as number}�?/span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-400 to-sky-400 rounded-full transition-all"
                              style={{ width: `${Math.round(((detail.onboarding_progress.completed_days as number) / Math.max(detail.onboarding_progress.total_days as number, 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Logs */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      最近操作记�?
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {detail?.activity_logs && detail.activity_logs.length > 0 ? (
                        detail.activity_logs.map((log, i) => (
                          <div key={i} className="flex items-start gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              log.source === 'ai' ? 'bg-sky-400' : 'bg-blue-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{log.title}</p>
                              {log.content && (
                                <p className="text-xs text-gray-400 truncate mt-0.5">{log.content}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">
                              {new Date(log.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">暂无操作记录</p>
                      )}
                    </div>
                  </div>

                  {/* Consultant Note Input */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-500" />
                      添加顾问备注
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入备注内容..."
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!noteContent.trim()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        添加
                      </button>
                    </div>
                  </div>

                  {/* Renewal Section */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-700">订阅状�?/p>
                      <p className="text-xs text-gray-500">
                        {selectedClient.plan_end
                          ? `到期�? ${new Date(selectedClient.plan_end).toLocaleDateString('zh-CN')}`
                          : '暂无订阅信息'}
                      </p>
                    </div>
                    <button
                      onClick={handleRemindRenewal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      发送订阅提�?
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ───
function StatCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'red';
  sub?: string;
}) {
  const colorMap = {
    blue:  'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    amber: 'from-slate-50 to-slate-100 text-blue-800',
    red:   'from-red-50 to-red-100 text-red-600',
  };
  const iconBgMap = {
    blue:  'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-slate-100 text-blue-800',
    red:   'bg-red-100 text-red-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-xl p-4 border border-white/50`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${iconBgMap[color]} flex items-center justify-center`}>
          {icon}
        </div>
        {sub && <span className="text-xs opacity-60">{sub}</span>}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-1">{label}</p>
    </div>
  );
}

// ─── Client Card ───
function ClientCard({ client, onClick }: { client: ClientRecord; onClick: () => void }) {
  const cfg = HEALTH_CONFIG[client.health_status];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border ${cfg.border} p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>学习进度</span>
          <span className="font-medium">第{client.current_day}�?/ 共{client.total_days}�?/span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-sky-400 rounded-full transition-all"
            style={{ width: `${client.total_days > 0 ? Math.round((client.current_day / client.total_days) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-blue-900">{client.task_status}</p>
          <p className="text-xs text-gray-500">任务�?/p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{client.ai_usage_7d}</p>
          <p className="text-xs text-gray-500">AI次数</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">{client.inspection_7d}</p>
          <p className="text-xs text-gray-500">质检</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {client.last_active
            ? `${client.last_active_days === 0 ? '今天' : client.last_active_days === 1 ? '昨天' : client.last_active_days + '天前'}活跃`
            : '无活跃记�?}
        </span>
        <div className="flex items-center gap-1 text-sky-400">
          <span>查看详情</span>
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
