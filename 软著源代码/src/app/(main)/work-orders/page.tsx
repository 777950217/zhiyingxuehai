'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { PageHint } from '@/components/page-hint';
import {
  ClipboardList, Search, Filter, Download, ChevronDown, ChevronUp,
  AlertCircle, Clock, CheckCircle2, Circle, Loader2,
  Phone, Tag, Calendar, MessageSquare, FileText, Zap, Hash,
  CheckSquare, Square as SquareIcon, Trash2, AlertTriangle,
  RotateCcw, BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionLocked } from '@/components/permission-locked';
import { DataSecurityBadge } from '@/components/data-security-badge';

/* ─── 类型 ─── */
interface WorkOrder {
  id: string;
  company_id: string;
  user_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  order_no: string | null;
  query: string | null;
  category: string | null;
  ai_judgment: string | null;
  ai_script: string | null;
  priority: string;
  status: string;
  result: string | null;
  source_type: string;
  problem_solution_id: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

type StatusFilter = '全部' | '待处�? | '处理�? | '已完�?;

const STATUS_TABS: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { key: '全部', label: '全部', icon: <ClipboardList className="w-4 h-4" /> },
  { key: '待处�?, label: '待处�?, icon: <Circle className="w-4 h-4" /> },
  { key: '处理�?, label: '处理�?, icon: <Clock className="w-4 h-4" /> },
  { key: '已完�?, label: '已完�?, icon: <CheckCircle2 className="w-4 h-4" /> },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  '待处�?: { label: '待处�?, color: 'text-blue-900', bgColor: 'bg-slate-50 border-slate-200', icon: <Circle className="w-3.5 h-3.5" /> },
  '处理�?: { label: '处理�?, color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> },
  '已完�?: { label: '已完�?, color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  '紧�?: { label: '紧�?, color: 'text-red-700', bgColor: 'bg-red-100' },
  '普�?: { label: '普�?, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  '�?: { label: '�?, color: 'text-gray-400', bgColor: 'bg-gray-50' },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  '退�?: { label: '退�?, color: 'text-red-600' },
  '质量': { label: '质量', color: 'text-blue-900' },
  '价格': { label: '价格', color: 'text-blue-800' },
  '物流': { label: '物流', color: 'text-blue-600' },
  '使用': { label: '使用', color: 'text-emerald-600' },
  '配件': { label: '配件', color: 'text-purple-600' },
  '赔偿': { label: '赔偿', color: 'text-pink-600' },
  '其他': { label: '其他', color: 'text-gray-600' },
};

export default function WorkOrdersPage() {

  const { profile, authFetch } = useAuth();
  const role = profile?.role || 'staff';
  const isStaffRole = role === 'staff';
  const isPersonalUser = role === 'personal_user';

  // All hooks must be declared before any conditional returns (React rules of hooks)
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [total, setTotal] = useState(0);

  // 编辑状�?
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResult, setEditResult] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // 批量选择状�?
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const isManager = profile?.role === 'enterprise_manager' || profile?.role === 'enterprise_admin' || profile?.role === 'admin';

  // 问题洞察（仅管理�?主管可见�?
  const [insightData, setInsightData] = useState<{ category: string; count: number; prevCount: number }[]>([]);
  const [insightOpen, setInsightOpen] = useState(true);

  // 问题类型→话术库分类映射
  const CATEGORY_TO_PHRASE: Record<string, string> = {
    '退�?: '退货处�?,
    '质量': '质量问题',
    '价格': '价格异议',
    '物流': '发货物流',
    '使用': '使用指导',
    '配件': '配件确认',
    '赔偿': '售后赔付',
    '其他': '通用话术',
  };

  // 问题类型→SOP模块映射
  const CATEGORY_TO_SOP: Record<string, { module: number; label: string }> = {
    '退�?: { module: 5, label: '售后手册' },
    '质量': { module: 5, label: '售后手册' },
    '价格': { module: 4, label: '售中细则' },
    '物流': { module: 4, label: '售中细则' },
    '使用': { module: 5, label: '售后手册' },
    '配件': { module: 4, label: '售中细则' },
    '赔偿': { module: 5, label: '售后手册' },
    '其他': { module: 5, label: '售后手册' },
  };

  // For staff, default to "待处�? tab (they don't see "全部")
  useEffect(() => {
    if (isStaffRole && statusFilter === '全部') {
      setStatusFilter('待处�?);
    }
  }, [isStaffRole, statusFilter]);

  /* ─── 获取工单列表 ─── */
  const authFetchOrders = useCallback(async () => {
    if (isPersonalUser) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (profile?.companyId) params.set('companyId', profile.companyId);
      if (profile?.id) params.set('userId', profile.id);
      params.set('role', profile?.role || 'staff');
      if (statusFilter !== '全部') params.set('status', statusFilter);

      const res = await authFetch(`/api/work-orders?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      let filtered = json.data || [];
      // 前端搜索
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        filtered = filtered.filter((o: WorkOrder) =>
          (o.customer_name || '').toLowerCase().includes(kw) ||
          (o.query || '').toLowerCase().includes(kw) ||
          (o.category || '').toLowerCase().includes(kw) ||
          (o.order_no || '').toLowerCase().includes(kw)
        );
      }

      setOrders(filtered);
      setTotal(json.total || filtered.length);
    } catch (err) {
      console.error('获取工单失败:', err);
      toast.error('获取工单列表失败');
    } finally {
      setLoading(false);
    }
  }, [profile, statusFilter, searchKeyword, isPersonalUser, authFetch]);

  const fetchInsight = useCallback(async () => {
    if (!profile?.companyId || !isManager) return;
    try {
      const res = await authFetch(`/api/work-orders?stats=problem-frequency&companyId=${profile.companyId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setInsightData(json.data || []);
    } catch {
      // 静默失败，洞察是辅助功能
    }
  }, [profile?.companyId, isManager, authFetch]);

  useEffect(() => {
    if (!isPersonalUser) {
      authFetchOrders();
      fetchInsight();
    }
  }, [authFetchOrders, fetchInsight, isPersonalUser]);

  // personal_user cannot access this page
  if (isPersonalUser) {
    return <PermissionLocked title="工单管理" description="升级至专业版即可解锁工单管理功能" />;
  }

  /* ─── 标记完成 ─── */
  const handleMarkComplete = async (id: string) => {
    setSaving(true);
    try {
      const res = await authFetch('/api/work-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: '已完�? }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success('工单已标记完�?);
      authFetchOrders();
    } catch (err) {
      console.error('标记完成失败:', err);
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  /* ─── 更新工单 ─── */
  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { id };
      if (editResult) updates.result = editResult;
      if (editStatus) updates.status = editStatus;

      const res = await authFetch('/api/work-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success('工单已更�?);
      setEditingId(null);
      setEditResult('');
      setEditStatus('');
      authFetchOrders();
    } catch (err) {
      console.error('更新工单失败:', err);
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  /* ─── 标记紧�?─── */
  const handleMarkUrgent = async (id: string, currentPriority: string) => {
    const newPriority = currentPriority === '紧�? ? '普�? : '紧�?;
    try {
      const res = await authFetch('/api/work-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, priority: newPriority }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success(newPriority === '紧�? ? '已标记为紧�? : '已取消紧急标�?);
      authFetchOrders();
    } catch (err) {
      console.error('更新优先级失�?', err);
      toast.error('操作失败');
    }
  };

  /* ─── 批量操作 ─── */
  const handleBatchAction = async (targetStatus: string) => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map(id =>
          authFetch('/api/work-orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: targetStatus }),
          })
        )
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.warning(`${selectedIds.size - failed}项成功，${failed}项失败`);
      } else {
        toast.success(`已批量更�?${selectedIds.size} 项工单`);
      }
      setSelectedIds(new Set());
      setBatchMode(false);
      authFetchOrders();
    } catch {
      toast.error('批量操作失败');
    } finally {
      setBatchProcessing(false);
    }
  };

  /* ─── SLA时间判断 ─── */
  const getSlaLevel = (order: WorkOrder): 'normal' | 'warning' | 'danger' => {
    if (order.status === '已完�?) return 'normal';
    const hours = (Date.now() - new Date(order.created_at).getTime()) / 3600000;
    if (hours >= 48) return 'danger';
    if (hours >= 24) return 'warning';
    return 'normal';
  };

  /* ─── 导出Excel ─── */
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const params = new URLSearchParams();
      if (profile?.companyId) params.set('companyId', profile.companyId);
      if (profile?.id) params.set('userId', profile.id);
      params.set('role', profile?.role || 'staff');
      params.set('limit', '9999');

      const res = await authFetch(`/api/work-orders?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const exportData = (json.data || []).map((o: WorkOrder) => ({
        '工单ID': o.id.slice(0, 8),
        '订单�?: o.order_no || '',
        '客户名称': o.customer_name || '',
        '咨询内容': (o.query || '').slice(0, 200),
        '分类': o.category || '',
        'AI判断': (o.ai_judgment || '').slice(0, 200),
        '状�?: o.status,
        '优先�?: o.priority,
        '创建时间': new Date(o.created_at).toLocaleString('zh-CN'),
        '完成时间': o.completed_at ? new Date(o.completed_at).toLocaleString('zh-CN') : '',
        '处理结果': (o.result || '').slice(0, 200),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      // 设置列宽
      ws['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 8 },
        { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
        { wch: 20 }, { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '工单台账');
      XLSX.writeFile(wb, `工单台账_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('导出成功');
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败');
    }
  };

  /* ─── 时间格式�?─── */
  const formatTime = (ts: string | null) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  /* ─── 趋势图标 ─── */
  const TrendIcon = ({ current, prev }: { current: number; prev: number }) => {
    if (current > prev) return <span className="text-red-500 text-xs font-medium">�?/span>;
    if (current < prev) return <span className="text-green-500 text-xs font-medium">�?/span>;
    return <span className="text-gray-400 text-xs">�?/span>;
  };

  /* ─── 渲染 ─── */
  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* 顶部 */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isStaffRole ? '我的工单' : '工单台账'}</h1>
            <PageHint text={isStaffRole ? '你负责的工单在这里——跟进处理进度，完成后及时标记�? : '问题不漏、跟进不停——售后工单全记录，处理进度一目了然�?} />
            <DataSecurityBadge />
          </div>
          {!isStaffRole && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              导出Excel
            </Button>
          )}
        </div>
      </div>

      {/* ─── 🎯 目标板块：处理时�?解决�?─── */}
      {isManager && (
        <div className="px-6 pt-4">
          <div className="bg-gradient-to-br from-blue-50 via-white to-sky-50 rounded-2xl border border-blue-200 p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">🎯 处理目标</h3>
            <p className="text-base text-gray-500 mb-4">处理时效标准与解决率目标</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { metric: '平均处理时长', target: 24, actual: 28, unit: 'h', inverse: true },
                { metric: '解决�?, target: 90, actual: 85, unit: '%', inverse: false },
                { metric: '首响时效', target: 30, actual: 35, unit: 'min', inverse: true },
                { metric: '超时�?, target: 10, actual: 15, unit: '%', inverse: true },
              ].map((g) => {
                const achieved = g.inverse ? g.actual <= g.target : g.actual >= g.target;
                const pct = g.target > 0 ? (g.inverse ? Math.min(100, Math.round((g.target / Math.max(g.actual, 0.01)) * 100)) : Math.min(100, Math.round((g.actual / g.target) * 100))) : 0;
                const light = achieved ? '🟢' : pct >= 70 ? '🟡' : '🔴';
                return (
                  <div key={g.metric} className={`rounded-xl border p-4 ${achieved ? 'bg-white border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-bold text-gray-900">{g.metric}</span>
                      <span className="text-2xl">{light}</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-700">{g.target}{g.unit}</div>
                    {!achieved && <div className="text-sm text-red-600 font-medium mt-1">⚠️ 未达标（实际{g.actual}{g.unit}�?/div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isManager && <hr className="mx-6 border-gray-200" />}

      {/* ─── 🛤�?路径板块：处理过�?─── */}
      {isManager && (
        <div className="px-6 pt-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">🛤�?处理路径</h3>
            <p className="text-base text-gray-500 mb-4">本周处理过程与方式记�?/p>
            <div className="space-y-3">
              {[
                { type: '分配', desc: '3件高优先级工单分配给资深客服处理', person: '主管-王芳', color: 'bg-blue-100 text-blue-700' },
                { type: '升级', desc: '1件复杂售后问题升级至技术部�?, person: '客服-张伟', color: 'bg-orange-100 text-orange-700' },
                { type: '处理', desc: '5件退款工单按SOP流程处理完成', person: '客服-李丽', color: 'bg-green-100 text-green-700' },
                { type: '催办', desc: '2件超时工单进行催办提�?, person: '系统自动', color: 'bg-red-100 text-red-700' },
                { type: '关闭', desc: '8件已解决工单确认后关�?, person: '客服-陈明', color: 'bg-gray-100 text-gray-700' },
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.color}`}>{p.type}</span>
                      <span className="text-base text-gray-800">{p.desc}</span>
                    </div>
                    <span className="text-sm text-gray-400">处理人：{p.person}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isManager && <hr className="mx-6 border-gray-200" />}

      {/* ─── 📊 结果板块 ─── */}
      {isManager && (() => {
        const results = [
          { metric: '平均处理时长', target: 24, actual: 28, unit: 'h', inverse: true },
          { metric: '解决�?, target: 90, actual: 85, unit: '%', inverse: false },
          { metric: '首响时效', target: 30, actual: 35, unit: 'min', inverse: true },
          { metric: '超时�?, target: 10, actual: 15, unit: '%', inverse: true },
        ];
        const achieved = results.filter(r => r.inverse ? r.actual <= r.target : r.actual >= r.target);
        const rate = Math.round((achieved.length / results.length) * 100);
        return (
          <div className="px-6 pt-2">
            <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl border border-green-200 p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">📊 处理结果</h3>
              <p className="text-base text-gray-500 mb-4">实际达成与偏差分�?/p>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">综合达标�?/span>
                  <span className="text-2xl font-bold text-blue-700">{rate}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {results.map((r) => {
                  const isAch = r.inverse ? r.actual <= r.target : r.actual >= r.target;
                  const pct = r.target > 0 ? (r.inverse ? Math.min(100, Math.round((r.target / Math.max(r.actual, 0.01)) * 100)) : Math.min(100, Math.round((r.actual / r.target) * 100))) : 0;
                  const dev = Math.round(((r.actual - r.target) / Math.max(r.target, 0.01)) * 100);
                  return (
                    <div key={r.metric} className={`rounded-xl border p-4 ${isAch ? 'bg-white border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-base font-bold text-gray-900 mb-2">{r.metric}</div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">目标 {r.target}{r.unit}</span>
                        <span className={`font-bold ${isAch ? 'text-green-700' : 'text-red-700'}`}>实际 {r.actual}{r.unit}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${isAch ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={`text-sm font-medium ${isAch ? 'text-green-600' : 'text-red-600'}`}>
                        {isAch ? '�?达标' : `⚠️ 偏差${dev > 0 ? '+' : ''}${dev}%`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {isManager && <hr className="mx-6 border-gray-200" />}

      {/* 工单统计卡片 */}
      {isManager && (
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{orders.filter(o => {
                const today = new Date().toISOString().slice(0, 10);
                return o.created_at?.slice(0, 10) === today;
              }).length}</div>
              <div className="text-xs text-muted-foreground mt-1">今日新增</div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-white p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{orders.filter(o => o.status === '待处�?).length}</div>
              <div className="text-xs text-muted-foreground mt-1">待处�?/div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-green-50 to-white p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{orders.filter(o => o.status === '已完�?).length}</div>
              <div className="text-xs text-muted-foreground mt-1">已关�?/div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-white p-4 text-center">
              <div className="text-2xl font-bold text-sky-700">{(() => {
                const completed = orders.filter(o => o.status === '已完�? && o.completed_at);
                if (!completed.length) return '-';
                const avgMs = completed.reduce((sum, o) => sum + (new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()), 0) / completed.length;
                const hours = Math.round(avgMs / 3600000);
                return hours >= 24 ? `${(hours / 24).toFixed(1)}天` : `${hours}时`;
              })()}</div>
              <div className="text-xs text-muted-foreground mt-1">平均处理时长</div>
            </div>
          </div>
        </div>
      )}

      {/* 批量操作�?*/}
      {isManager && (
        <div className="px-6 pt-3">
          <div className="flex items-center gap-3">
            <Button
              variant={batchMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
              className={batchMode ? 'bg-blue-900 hover:bg-blue-950 text-white' : ''}
            >
              {batchMode ? '退出批�? : '批量操作'}
            </Button>
            {batchMode && selectedIds.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">已�?{selectedIds.size} �?/span>
                <Button variant="outline" size="sm" onClick={() => handleBatchAction('已完�?)} disabled={batchProcessing}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />批量关闭
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBatchAction('处理�?)} disabled={batchProcessing}>
                  <Clock className="w-3.5 h-3.5 mr-1" />批量转处理中
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  取消选择
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 问题洞察卡片（仅管理�?主管�?*/}
      {isManager && insightData.length > 0 && (
        <div className="px-6 pt-4">
          <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
            <button
              onClick={() => setInsightOpen(!insightOpen)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
                <span className="font-semibold text-gray-900 text-sm">问题洞察</span>
                <span className="text-xs text-gray-400">�?0天高频问�?TOP{insightData.length}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${insightOpen ? 'rotate-180' : ''}`} />
            </button>
            {insightOpen && (
              <div className="px-5 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {insightData.map((item, idx) => {
                    const phraseCat = CATEGORY_TO_PHRASE[item.category];
                    const sopInfo = CATEGORY_TO_SOP[item.category];
                    return (
                      <div key={item.category} className="bg-gray-50 rounded-lg p-3.5 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-800">{item.category}</span>
                          <TrendIcon current={item.count} prev={item.prevCount} />
                        </div>
                        <div className="text-2xl font-bold text-blue-700 mb-2">{item.count}<span className="text-xs font-normal text-gray-400 ml-1">�?/span></div>
                        <div className="flex items-center gap-2 text-xs">
                          {phraseCat ? (
                            <a href={`/quick-phrases?category=${encodeURIComponent(phraseCat)}`} className="text-blue-600 hover:text-blue-800 hover:underline">查看话术</a>
                          ) : (
                            <span className="text-gray-300">暂无话术</span>
                          )}
                          <span className="text-gray-200">|</span>
                          {sopInfo ? (
                            <a href={`/newbie-training?module=${sopInfo.module}`} className="text-blue-600 hover:text-blue-800 hover:underline">查看SOP</a>
                          ) : (
                            <span className="text-gray-300">暂无SOP</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab + 搜索 */}
      <div className="px-6 pt-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 状态Tab */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {STATUS_TABS.filter(tab => !isStaffRole || tab.key !== '全部').map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 搜索�?*/}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户/订单�?咨询内容"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* 批量操作�?+ 统计�?*/}
      <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setBatchMode(!batchMode); if (batchMode) setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${batchMode ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}
          >
            {batchMode ? '取消批量' : '批量操作'}
          </button>
          {batchMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-gray-500">已�?{selectedIds.size} �?/span>
              <button onClick={() => handleBatchAction('处理�?)} disabled={batchProcessing} className="px-2.5 py-1 text-xs bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200 hover:bg-yellow-100 disabled:opacity-50">批量处理</button>
              <button onClick={() => handleBatchAction('已完�?)} disabled={batchProcessing} className="px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded-md border border-green-200 hover:bg-green-100 disabled:opacity-50">批量完成</button>
              <button onClick={() => handleBatchAction('已关�?)} disabled={batchProcessing} className="px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded-md border border-gray-200 hover:bg-gray-100 disabled:opacity-50">批量关闭</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const todayNew = orders.filter(o => o.created_at?.slice(0, 10) === today).length;
            const pending = orders.filter(o => o.status === '待处�?).length;
            const done = orders.filter(o => o.status === '已完�?).length;
            const slaWarning = orders.filter(o => getSlaLevel(o) === 'warning').length;
            const slaDanger = orders.filter(o => getSlaLevel(o) === 'danger').length;
            return (
              <>
                <span>今日新增 <b className="text-gray-600">{todayNew}</b></span>
                <span>待处�?<b className="text-yellow-600">{pending}</b></span>
                <span>已完�?<b className="text-green-600">{done}</b></span>
                {slaWarning > 0 && <span className="text-yellow-500">�?{slaWarning}项超24h</span>}
                {slaDanger > 0 && <span className="text-red-500">🔴 {slaDanger}项超48h</span>}
              </>
            );
          })()}
        </div>
      </div>

      {/* 工单列表 */}
      <div className="px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            加载�?..
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">暂无工单记录</p>
            <p className="text-gray-300 text-xs mt-1">使用AI问题解决器时将自动创建工�?/p>
          </div>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['待处�?];
            const priorityCfg = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG['普�?];
            const catCfg = CATEGORY_CONFIG[order.category || ''] || CATEGORY_CONFIG['其他'];

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl border transition-all ${
                  order.priority === '紧�? ? 'border-red-200 shadow-red-50 shadow-sm' : 'border-gray-100'
                }`}
              >
                {/* 卡片头部 */}
                <div
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* 优先级标�?*/}
                    <div className={`mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${priorityCfg.bgColor} ${priorityCfg.color}`}>
                      {order.priority === '紧�? && <AlertCircle className="w-3 h-3 inline mr-0.5" />}
                      {priorityCfg.label}
                    </div>

                    {/* 主内�?*/}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {order.customer_name || '未知客户'}
                        </span>
                        {order.customer_phone && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Phone className="w-3 h-3" />
                            {order.customer_phone}
                          </span>
                        )}
                        <span className={`text-xs ${catCfg.color} bg-gray-50 px-1.5 py-0.5 rounded`}>
                          {order.category || '未分�?}
                        </span>
                        {order.order_no && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-mono text-xs mt-1">
                            <Hash className="w-3 h-3" />
                            {order.order_no}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {order.query || '无咨询内�?}
                      </p>
                    </div>

                    {/* 右侧：状�?+ 时间 */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bgColor} ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </div>
                  </div>
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {/* AI判断 */}
                      {order.ai_judgment && (
                        <div className="bg-slate-50/60 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Zap className="w-3.5 h-3.5 text-blue-800" />
                            <span className="text-xs font-medium text-blue-900">AI判断</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.ai_judgment}</p>
                        </div>
                      )}

                      {/* AI话术 */}
                      {order.ai_script && (
                        <div className="bg-blue-50/60 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">AI话术</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.ai_script}</p>
                        </div>
                      )}

                      {/* 处理结果 */}
                      <div className="bg-green-50/60 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <FileText className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs font-medium text-green-700">处理结果</span>
                        </div>
                        <p className="text-sm text-gray-700">{order.result || '暂无处理结果'}</p>
                      </div>

                      {/* 基本信息 */}
                      <div className="bg-gray-50/80 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Tag className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs font-medium text-gray-600">工单信息</span>
                        </div>
                        {order.order_no && (
                          <p className="text-xs text-blue-600">
                            <span className="text-gray-400">订单号：</span>
                            {order.order_no}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          <span className="text-gray-400">来源�?/span>
                          {order.source_type === 'ai_generate' ? 'AI助手' : order.source_type === 'ai_solve' ? 'AI解决' : order.source_type === 'ai_diagnose' ? 'AI诊断' : order.source_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="text-gray-400">创建�?/span>
                          {formatTime(order.created_at)}
                        </p>
                        {order.completed_at && (
                          <p className="text-xs text-gray-500">
                            <span className="text-gray-400">完成�?/span>
                            {formatTime(order.completed_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      {editingId === order.id ? (
                        <>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 shrink-0">状态：</span>
                              <select
                                value={editStatus || order.status}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              >
                                <option value="待处�?>待处�?/option>
                                <option value="处理�?>处理�?/option>
                                <option value="已完�?>已完�?/option>
                              </select>
                            </div>
                            <textarea
                              value={editResult}
                              onChange={(e) => setEditResult(e.target.value)}
                              placeholder="补充处理结果..."
                              rows={2}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button size="sm" onClick={() => handleUpdate(order.id)} disabled={saving} className="gap-1">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              保存
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditResult(''); setEditStatus(''); }}>
                              取消
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingId(order.id); setEditResult(order.result || ''); setEditStatus(order.status); }}
                            className="gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            补充结果
                          </Button>
                          {isManager && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkUrgent(order.id, order.priority)}
                              className={`gap-1 ${order.priority !== '紧�? ? 'text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50' : ''}`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {order.priority === '紧�? ? '取消紧�? : '标记紧�?}
                            </Button>
                          )}
                          {order.status !== '已完�? && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkComplete(order.id)}
                              className="gap-1 text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                              disabled={saving}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              标记完成
                            </Button>
                          )}
                          {/* 复盘分析按钮 - 对所有工单显�?*/}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // 跳转到AI助手页面，带上工单复盘参�?
                              const reviewParam = encodeURIComponent(JSON.stringify({
                                type: 'work_order_review',
                                orderId: order.id,
                                customerName: order.customer_name,
                                category: order.category,
                                query: order.query,
                                result: order.result,
                                aiJudgment: order.ai_judgment,
                              }));
                              window.location.href = `/ai-assistant?review=${reviewParam}`;
                            }}
                            className="gap-1 text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <BarChart2 className="w-3 h-3" />
                            复盘分析
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
