'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Clock,
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  company_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  detail: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  // Joined
  user_name?: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  REVIEW: '审核',
  EXTRACT: '萃取',
  PUSH_FEEDBACK: '推送反�?,
  CONFIRM_FEEDBACK: '确认反馈',
  RESOLVE_FEEDBACK: '解决反馈',
  LOGIN: '登录',
  EXPORT: '导出',
};

const RESOURCE_LABELS: Record<string, string> = {
  phrase: '话术',
  quality_feedback: '质检反馈',
  product_profile: '产品档案',
  seat: '坐席',
  schedule: '排班',
  audit_log: '审计日志',
  company: '企业',
  user: '用户',
  agent: '客服',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  REVIEW: 'bg-purple-100 text-purple-800',
  EXTRACT: 'bg-amber-100 text-amber-800',
  PUSH_FEEDBACK: 'bg-orange-100 text-orange-800',
  CONFIRM_FEEDBACK: 'bg-cyan-100 text-cyan-800',
  RESOLVE_FEEDBACK: 'bg-teal-100 text-teal-800',
  LOGIN: 'bg-gray-100 text-gray-800',
  EXPORT: 'bg-indigo-100 text-indigo-800',
};

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const { authFetch, profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      if (filterAction !== 'all') params.set('action', filterAction);
      if (filterResource !== 'all') params.set('resource_type', filterResource);
      if (filterUserId) params.set('user_id', filterUserId);
      if (filterDateStart) params.set('date_start', filterDateStart);
      if (filterDateEnd) params.set('date_end', filterDateEnd);

      const res = await authFetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '获取审计日志失败');
      }
      const result = await res.json();
      setLogs(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取审计日志失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, filterAction, filterResource, filterUserId, filterDateStart, filterDateEnd]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      if (filterAction !== 'all') params.set('action', filterAction);
      if (filterResource !== 'all') params.set('resource_type', filterResource);
      if (filterUserId) params.set('user_id', filterUserId);
      if (filterDateStart) params.set('date_start', filterDateStart);
      if (filterDateEnd) params.set('date_end', filterDateEnd);

      const res = await authFetch(`/api/audit-logs?${params.toString()}&format=csv`);
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch {
      toast.error('导出失败，请稍后重试');
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            操作审计日志
          </h1>
          <p className="text-sm text-gray-500 mt-1">记录系统中所有关键操作的审计轨迹</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            {showFilters ? '收起筛�? : '展开筛�?}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1" />
            导出CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">操作类型</label>
                <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全部操作" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部操作</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">资源类型</label>
                <Select value={filterResource} onValueChange={(v) => { setFilterResource(v); setPage(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全部资源" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部资源</SelectItem>
                    {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">用户ID</label>
                <Input
                  className="h-9"
                  placeholder="输入用户ID"
                  value={filterUserId}
                  onChange={(e) => { setFilterUserId(e.target.value); setPage(0); }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">开始日�?/label>
                <Input
                  type="date"
                  className="h-9"
                  value={filterDateStart}
                  onChange={(e) => { setFilterDateStart(e.target.value); setPage(0); }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">结束日期</label>
                <Input
                  type="date"
                  className="h-9"
                  value={filterDateEnd}
                  onChange={(e) => { setFilterDateEnd(e.target.value); setPage(0); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            �?{total} 条记�?
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">时间</TableHead>
                  <TableHead className="w-28">操作类型</TableHead>
                  <TableHead className="w-24">资源类型</TableHead>
                  <TableHead>资源ID</TableHead>
                  <TableHead className="w-32">用户ID</TableHead>
                  <TableHead className="w-28">IP地址</TableHead>
                  <TableHead className="w-16 text-center">详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      加载�?..
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      暂无审计日志
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs text-gray-600">
                        {formatTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {RESOURCE_LABELS[log.resource_type] || log.resource_type}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-500 max-w-[120px] truncate">
                        {log.resource_id || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-500">
                        {log.user_id?.slice(0, 8) || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setDetailLog(log)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-xs text-gray-500">
                �?{page + 1} / {totalPages} �?
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const pageNum = start + i;
                  if (pageNum >= totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>审计日志详情</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">操作时间�?/span>
                  <span>{new Date(detailLog.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div>
                  <span className="text-gray-500">操作类型�?/span>
                  <Badge variant="secondary" className={ACTION_COLORS[detailLog.action] || ''}>
                    {ACTION_LABELS[detailLog.action] || detailLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">资源类型�?/span>
                  <span>{RESOURCE_LABELS[detailLog.resource_type] || detailLog.resource_type}</span>
                </div>
                <div>
                  <span className="text-gray-500">资源ID�?/span>
                  <span className="font-mono text-xs">{detailLog.resource_id || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">用户ID�?/span>
                  <span className="font-mono text-xs">{detailLog.user_id}</span>
                </div>
                <div>
                  <span className="text-gray-500">IP地址�?/span>
                  <span className="text-xs">{detailLog.ip_address || '-'}</span>
                </div>
                {detailLog.company_id && (
                  <div className="col-span-2">
                    <span className="text-gray-500">企业ID�?/span>
                    <span className="font-mono text-xs">{detailLog.company_id}</span>
                  </div>
                )}
              </div>
              <div>
                <span className="text-gray-500 text-sm">详情数据�?/span>
                <pre className="mt-1 bg-gray-50 rounded-md p-3 text-xs overflow-auto max-h-60 font-mono">
                  {JSON.stringify(detailLog.detail, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
