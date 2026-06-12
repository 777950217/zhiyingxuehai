'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Bell,
  TrendingUp,
  ScrollText,
  Target,
  BellRing,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  BarChart3,
  Wrench,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

/* ─── Types ─── */
interface Notification {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  content: string | null;
  is_read: boolean;
  created_at: string;
  company_id: string | null;
}

type TabKey = 'all' | 'industry_trend' | 'platform_rule' | 'daily_case' | 'product_update' | 'work_order' | 'review';

/* ─── Type config ─── */
const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  industry_trend: {
    label: '行业趋势',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  platform_rule: {
    label: '规则变动',
    icon: <ScrollText className="w-4 h-4" />,
    color: 'text-blue-950',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-100',
  },
  daily_case: {
    label: '今日场景',
    icon: <Target className="w-4 h-4" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  product_update: {
    label: '产品更新',
    icon: <BellRing className="w-4 h-4" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  work_order: {
    label: '工单提醒',
    icon: <Wrench className="w-4 h-4" />,
    color: 'text-blue-900',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  review: {
    label: '复盘提醒',
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: '全部', icon: <Bell className="w-3.5 h-3.5" /> },
  { key: 'industry_trend', label: '行业趋势', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'platform_rule', label: '规则变动', icon: <ScrollText className="w-3.5 h-3.5" /> },
  { key: 'daily_case', label: '今日场景', icon: <Target className="w-3.5 h-3.5" /> },
  { key: 'product_update', label: '产品更新', icon: <BellRing className="w-3.5 h-3.5" /> },
  { key: 'work_order', label: '工单提醒', icon: <Wrench className="w-3.5 h-3.5" /> },
  { key: 'review', label: '复盘提醒', icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

/* ─── Helper: format relative time ─── */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/* ─── Main Page ─── */
export default function NotificationsPage() {
  const router = useRouter();
  const { profile, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [reviewSubFilter, setReviewSubFilter] = useState<string>('all');
  const [workOrderSubFilter, setWorkOrderSubFilter] = useState<string>('all');
  const [expandedWorkOrderId, setExpandedWorkOrderId] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<Array<{
    id: string; customer_name: string; query: string; category: string;
    ai_judgment: string; ai_script: string; priority: string; status: string;
    result: string; created_at: string; completed_at: string | null;
  }>>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const fetchedRef = useRef(false);
  const [myFeedback, setMyFeedback] = useState<Record<string, boolean>>({});

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!profile?.companyId) return;
    try {
      if (activeTab === 'work_order') {
        // 获取工单数据
        const res = await authFetch(`/api/work-orders?role=${profile.role}&companyId=${profile.companyId}`);
        if (res.ok) {
          const data = await res.json();
          setWorkOrders(data.data || []);
        }
        setNotifications([]);
      } else {
        const params = new URLSearchParams({ company_id: profile.companyId });
        if (activeTab !== 'all') params.set('type', activeTab);
        const res = await authFetch(`/api/notifications?${params}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data || []);
          // Fetch feedback status for loaded notifications
          const ids = (data.data || []).map((n: Notification) => n.id);
          if (ids.length > 0) {
            try {
              const fbRes = await authFetch(`/api/notification-feedback?notification_ids=${ids.join(',')}`);
              if (fbRes.ok) {
                const fbData = await fbRes.json();
                setMyFeedback(fbData.myFeedback || {});
              }
            } catch { /* ignore */ }
          }
        }
        setWorkOrders([]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [profile?.companyId, profile?.role, activeTab]);

  useEffect(() => {
    if (!profile?.companyId) return;
    fetchedRef.current = false;
    setLoading(true);
    fetchNotifications();
  }, [profile?.companyId, activeTab, fetchNotifications]);

  // Notify app-shell to refresh unread count
  const notifyUnreadChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications-read'));
    }
  }, []);

  // Mark as read (single)
  const markAsRead = useCallback(async (notification: Notification) => {
    if (notification.is_read) return;
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    );
    try {
      await authFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      });
      notifyUnreadChange();
    } catch {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: false } : n)
      );
    }
  }, [notifyUnreadChange]);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    if (!profile?.companyId) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await authFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });
      notifyUnreadChange();
    } catch {
      // revert on failure
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: false } : n)
      );
    }
  }, [profile?.companyId, notifications, notifyUnreadChange]);

  // Click notification
  const handleClick = useCallback((notification: Notification) => {
    markAsRead(notification);
    setSelectedNotification(notification);
  }, [markAsRead]);

  // Feedback on notification
  const handleFeedback = useCallback(async (notificationId: string, helpful: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (myFeedback[notificationId] !== undefined) return;
    // Optimistic update
    setMyFeedback(prev => ({ ...prev, [notificationId]: helpful }));
    try {
      await authFetch('/api/notification-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId, helpful }),
      });
    } catch {
      setMyFeedback(prev => {
        const next = { ...prev };
        delete next[notificationId];
        return next;
      });
    }
  }, [myFeedback, authFetch]);

  // Unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  /* ─── Detail View ─── */
  if (selectedNotification) {
    const config = TYPE_CONFIG[selectedNotification.type] || TYPE_CONFIG.product_update;
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedNotification(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回消息列表
        </button>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className={`px-6 py-5 border-b ${config.borderColor} ${config.bgColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${config.bgColor} ${config.color}`}>
                {config.icon}
                {config.label}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(selectedNotification.created_at)}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{selectedNotification.title}</h1>
          </div>
          <div className="px-6 py-5">
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: selectedNotification.content || '<p class="text-gray-400">暂无详细内容</p>' }}
            />
          </div>
          {/* Feedback buttons */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-3">
            <span className="text-xs text-gray-400">这条消息对您有帮助吗�?/span>
            <button
              onClick={() => handleFeedback(selectedNotification.id, true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                myFeedback[selectedNotification.id] === true
                  ? 'bg-blue-100 text-blue-700'
                  : myFeedback[selectedNotification.id] === false
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-700'
              }`}
              disabled={myFeedback[selectedNotification.id] !== undefined}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              有用
            </button>
            <button
              onClick={() => handleFeedback(selectedNotification.id, false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                myFeedback[selectedNotification.id] === false
                  ? 'bg-red-100 text-red-700'
                  : myFeedback[selectedNotification.id] === true
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-700'
              }`}
              disabled={myFeedback[selectedNotification.id] !== undefined}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              没用
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── List View ─── */
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">消息中心</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount}条未读消息` : '没有未读消息'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="text-gray-500 hover:text-blue-900 gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            全部已读
          </Button>
        )}
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map(tab => {
          const count = tab.key === 'all'
            ? notifications.filter(n => !n.is_read).length
            : notifications.filter(n => n.type === tab.key && !n.is_read).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {count > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 复盘提醒子筛�?*/}
      {activeTab === 'review' && (
        <div className="flex gap-2 mb-3">
          {[
            { key: 'all', label: '全部' },
            { key: 'daily', label: '每日' },
            { key: 'weekly', label: '每周' },
            { key: 'monthly', label: '每月' },
          ].map(sub => (
            <button
              key={sub.key}
              onClick={() => setReviewSubFilter(sub.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                reviewSubFilter === sub.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      {activeTab === 'work_order' ? (
        (() => {
          const filtered = workOrderSubFilter === 'all'
            ? workOrders
            : workOrders.filter(wo => {
                const statusMap: Record<string, string> = { pending: '待处�?, processing: '处理�?, completed: '已完�? };
                return wo.status === statusMap[workOrderSubFilter] || wo.status === workOrderSubFilter;
              });
          return (
            <>
              {/* 工单子筛�?*/}
              <div className="flex gap-2 mb-3">
                {[
                  { key: 'all', label: '全部' },
                  { key: '待处�?, label: '待处�? },
                  { key: '处理�?, label: '处理�? },
                  { key: '已完�?, label: '已完�? },
                ].map(sub => (
                  <button
                    key={sub.key}
                    onClick={() => setWorkOrderSubFilter(sub.key)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      workOrderSubFilter === sub.key
                        ? 'bg-slate-100 text-blue-900 font-medium'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Wrench className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm">暂无工单提醒</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(wo => {
                    const statusColor: Record<string, string> = {
                      '待处�?: 'bg-slate-100 text-blue-900',
                      '处理�?: 'bg-blue-100 text-blue-700',
                      '已完�?: 'bg-green-100 text-green-700',
                    };
                    const priorityColor = wo.priority === '紧�? ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
                    const isExpanded = expandedWorkOrderId === wo.id;
                    return (
                      <div
                        key={wo.id}
                        className="bg-white rounded-xl border border-gray-200 hover:border-sky-200 hover:shadow-sm transition-all"
                      >
                        <button
                          onClick={() => setExpandedWorkOrderId(isExpanded ? null : wo.id)}
                          className="w-full text-left p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-slate-50 text-blue-900">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-slate-50 text-blue-900">工单提醒</span>
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[wo.status] || 'bg-gray-100 text-gray-600'}`}>{wo.status}</span>
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${priorityColor}`}>{wo.priority}</span>
                                <span className="text-[11px] text-gray-400">{formatTime(wo.created_at)}</span>
                              </div>
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {wo.query?.slice(0, 30) || wo.customer_name}
                              </h3>
                              <p className="text-xs text-gray-400 mt-1">
                                {wo.customer_name}{wo.category ? ` · ${wo.category}` : ''}
                              </p>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 mt-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                            {wo.ai_judgment && (
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-blue-900 mb-1">AI判断</p>
                                <p className="text-sm text-gray-700">{wo.ai_judgment}</p>
                              </div>
                            )}
                            {wo.ai_script && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-blue-700 mb-1">AI话术</p>
                                <p className="text-sm text-gray-700">{wo.ai_script}</p>
                              </div>
                            )}
                            {wo.result && (
                              <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-green-700 mb-1">处理结果</p>
                                <p className="text-sm text-gray-700">{wo.result}</p>
                              </div>
                            )}
                            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500">
                              <span>工单ID: {wo.id.slice(0, 8)}</span>
                              {wo.completed_at && <span className="ml-4">完成时间: {formatTime(wo.completed_at)}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()
      ) : (() => {
        // 复盘子筛�?
        const filteredNotifications = activeTab === 'review' && reviewSubFilter !== 'all'
          ? notifications.filter(n => {
              if (n.type !== 'review') return false;
              const titleMap: Record<string, string> = { daily: '每日', weekly: '每周', monthly: '每月' };
              return n.title.includes(titleMap[reviewSubFilter] || '');
            })
          : notifications;

        return loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Bell className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">暂无消息</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map(notification => {
            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.product_update;
            return (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-sky-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor} ${config.color}`}>
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-[11px] text-gray-400">{formatTime(notification.created_at)}</span>
                    </div>
                    <h3 className={`text-sm font-medium group-hover:text-blue-900 transition-colors ${
                      notification.is_read ? 'text-gray-600' : 'text-gray-900'
                    }`}>
                      {notification.title}
                    </h3>
                    {notification.summary && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {notification.summary}
                      </p>
                    )}
                  </div>

                  {/* Unread dot + feedback + arrow */}
                  <div className="flex items-center gap-2 shrink-0 mt-2">
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-900 animate-pulse" />
                    )}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleFeedback(notification.id, true, e)}
                        className={`p-1 rounded transition-colors ${
                          myFeedback[notification.id] === true
                            ? 'text-blue-600 bg-blue-50'
                            : myFeedback[notification.id] === false
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        disabled={myFeedback[notification.id] !== undefined}
                        title="有用"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleFeedback(notification.id, false, e)}
                        className={`p-1 rounded transition-colors ${
                          myFeedback[notification.id] === false
                            ? 'text-red-500 bg-red-50'
                            : myFeedback[notification.id] === true
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        disabled={myFeedback[notification.id] !== undefined}
                        title="没用"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-sky-400 transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      );
      })()}
    </div>
  );
}
