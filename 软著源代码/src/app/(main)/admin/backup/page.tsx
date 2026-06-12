'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download, Database, Clock, AlertTriangle, CheckCircle, Loader2,
} from 'lucide-react';

const BACKUP_TABLES = [
  { key: 'users', label: '用户数据', desc: '所有用户账号信�? },
  { key: 'phrase_library', label: '话术�?, desc: '标准话术、体检结果、售后攻略等' },
  { key: 'quality_feedbacks', label: '质检反馈', desc: '质检反馈闭环记录' },
  { key: 'product_profiles', label: '产品档案', desc: '企业产品信息' },
  { key: 'cost_records', label: '成本记录', desc: '成本预警数据' },
  { key: 'schedules', label: '排班数据', desc: '员工排班信息' },
  { key: 'audit_logs', label: '审计日志', desc: '操作审计记录' },
];

interface BackupStatus {
  lastBackupAt: string | null;
  totalRecords: number;
}

export default function BackupPage() {
  const { authFetch, profile } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set(BACKUP_TABLES.map(t => t.key)));
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/backup?action=status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      console.error('Backup status load error');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const toggleTable = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === BACKUP_TABLES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(BACKUP_TABLES.map(t => t.key)));
    }
  };

  const handleExport = async (tables?: string[]) => {
    const tablesToExport = tables || Array.from(selected);
    if (tablesToExport.length === 0) {
      toast.error('请至少选择一个数据表');
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams({ tables: tablesToExport.join(',') });
      const res = await authFetch(`/api/admin/backup?${params}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '导出失败' }));
        toast.error(err.error || '导出失败');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('数据备份导出成功');
      await loadStatus();
    } catch {
      toast.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">无访问权�?/h3>
            <p className="text-sm text-muted-foreground">仅超级管理员可访问数据备份功�?/p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <Database className="w-7 h-7" />
            数据备份
          </h1>
          <p className="text-sm text-muted-foreground mt-1">导出系统数据，建议每周备份一�?/p>
        </div>
        {status?.lastBackupAt && (
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="w-3 h-3" />
            最近备份：{new Date(status.lastBackupAt).toLocaleString('zh-CN')}
          </Badge>
        )}
      </div>

      {/* Reminder */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 pb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">建议每周导出一次数据备�?/p>
            <p className="text-xs text-amber-700 mt-1">定期备份可防止数据丢失，导出文件�?JSON 格式，可用于数据恢复</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick export */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">快速导�?/CardTitle>
          <CardDescription>一键导出全量数�?/CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => handleExport(BACKUP_TABLES.map(t => t.key))}
            disabled={exporting}
            className="bg-blue-800 hover:bg-blue-900 gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? '导出�?..' : '一键全量导�?}
          </Button>
        </CardContent>
      </Card>

      {/* Selective export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">按表选择导出</CardTitle>
              <CardDescription>选择需要导出的数据�?/CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.size === BACKUP_TABLES.length ? '取消全�? : '全�?}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {BACKUP_TABLES.map(table => (
            <label
              key={table.key}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.has(table.key) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Checkbox
                checked={selected.has(table.key)}
                onCheckedChange={() => toggleTable(table.key)}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{table.label}</p>
                <p className="text-xs text-muted-foreground">{table.desc}</p>
              </div>
              {selected.has(table.key) && <CheckCircle className="w-4 h-4 text-blue-600" />}
            </label>
          ))}

          <div className="pt-3 border-t">
            <Button
              onClick={() => handleExport()}
              disabled={exporting || selected.size === 0}
              className="bg-blue-800 hover:bg-blue-900 gap-2"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              导出选中�?({selected.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  );
}
