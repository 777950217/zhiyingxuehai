'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import { BookOpen, Bell, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ReminderConfig { id: string; frequency: string; lastCheckAt: string | null; nextRemindAt: string | null; isActive: boolean }

export default function KnowledgeReminderPage() {
  const { profile, authFetch } = useAuth();
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [loading, setLoading] = useState(true);

  if (profile?.role !== 'enterprise_admin' && profile?.role !== 'enterprise_manager') {
    return <PermissionLocked title="智库更新提醒" description="此功能仅对专业版/旗舰版管理者开�? />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/knowledge-reminder?company_id=${companyId}`);
      const json = await res.json();
      if (json.data) setConfig(json.data.reminder || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const frequencyLabels: Record<string, string> = { weekly: '每周', biweekly: '每两�?, monthly: '每月' };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <BookOpen className="w-7 h-7 text-purple-600" />
          智库更新提醒
        </h1>

        <Link href="/product-knowledge" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
          <BookOpen className="w-4 h-4" />前往产品智库 <ArrowRight className="w-3 h-3" />
        </Link>

        {loading ? <div className="text-center py-20 text-gray-400">加载�?..</div> : (
          <div className="space-y-6">
            {/* 提醒配置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-orange-500" />提醒周期设置</h2>
              <div className="flex items-center gap-4">
                <span className="text-gray-600">检查周�?</span>
                <select className="border rounded-lg px-4 py-2" value={config?.frequency || 'biweekly'} onChange={async e => {
                  await authFetch('/api/knowledge-reminder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: companyId, frequency: e.target.value }) });
                  loadData();
                }}>
                  <option value="weekly">每周</option><option value="biweekly">每两�?/option><option value="monthly">每月</option>
                </select>
              </div>
            </div>

            {/* 提醒状�?*/}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">提醒状�?/h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2"><Clock className="w-4 h-4" />上次检查时�?/span>
                  <span className="font-medium">{config?.lastCheckAt ? new Date(config.lastCheckAt).toLocaleDateString('zh-CN') : '未检�?}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2"><Bell className="w-4 h-4" />下次提醒时间</span>
                  <span className="font-medium text-blue-700">{config?.nextRemindAt ? new Date(config.nextRemindAt).toLocaleDateString('zh-CN') : '待设�?}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">提醒频率</span>
                  <span className="font-medium">{frequencyLabels[config?.frequency || 'biweekly']}</span>
                </div>
              </div>
            </div>

            {/* 手动标记检�?*/}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-green-600" />手动标记检�?/h2>
              <p className="text-gray-500 mb-4">完成产品智库检查后，点击标记已检查，系统会自动更新下次提醒时�?/p>
              <button onClick={async () => {
                await authFetch('/api/knowledge-reminder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: companyId, action: 'mark_checked' }) });
                loadData();
              }} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700">标记已检�?/button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
