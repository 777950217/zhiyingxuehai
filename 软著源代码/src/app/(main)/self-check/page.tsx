'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import { ClipboardCheck, Plus, Calendar, TrendingUp, Bell } from 'lucide-react';

interface CheckItem { id: string; content: string; category: string; isPreset: boolean; sort_order: number }
interface CheckRecord { id: string; checkDate: string; totalItems: number; passedItems: number; score: number }

export default function SelfCheckPage() {
  const { profile, authFetch } = useAuth();
  const [items, setItems] = useState<CheckItem[]>([]);
  const [records, setRecords] = useState<CheckRecord[]>([]);
  const [reminderConfig, setReminderConfig] = useState({ frequency: 'weekly', reminderDay: 1, isActive: true });
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ content: '', category: '日常检�? });
  const [doingCheck, setDoingCheck] = useState(false);
  const [checkResults, setCheckResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  if (profile?.role !== 'enterprise_admin' && profile?.role !== 'enterprise_manager') {
    return <PermissionLocked title="自检清单" description="此功能仅对专业版/旗舰版管理者开�? />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/self-check?company_id=${companyId}`);
      const json = await res.json();
      if (json.data) {
        setItems(json.data.items || []);
        setRecords(json.data.records || []);
        if (json.data.reminder) setReminderConfig(json.data.reminder);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <ClipboardCheck className="w-7 h-7 text-green-600" />
          自检清单与周期提�?
        </h1>

        {loading ? <div className="text-center py-20 text-gray-400">加载�?..</div> : (
          <div className="space-y-6">
            {/* 周期提醒设置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3"><Bell className="w-5 h-5 text-orange-500" />周期提醒设置</h2>
              <div className="flex gap-4 items-center">
                <select className="border rounded-lg px-3 py-2" value={reminderConfig.frequency} onChange={async e => {
                  const freq = e.target.value;
                  setReminderConfig({ ...reminderConfig, frequency: freq });
                  await authFetch('/api/self-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_reminder', company_id: companyId, frequency: freq, reminder_day: reminderConfig.reminderDay }) });
                }}>
                  <option value="weekly">每周</option><option value="biweekly">每两�?/option><option value="monthly">每月</option>
                </select>
                <span className="text-gray-600">提醒�?</span>
                <select className="border rounded-lg px-3 py-2" value={reminderConfig.reminderDay} onChange={async e => {
                  const day = Number(e.target.value);
                  setReminderConfig({ ...reminderConfig, reminderDay: day });
                  await authFetch('/api/self-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_reminder', company_id: companyId, frequency: reminderConfig.frequency, reminder_day: day }) });
                }}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>第{d}�?/option>)}
                </select>
              </div>
            </div>

            {/* 自检清单 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">检查项清单</h2>
                <div className="flex gap-2">
                  <button onClick={() => setDoingCheck(!doingCheck)} className={`${doingCheck ? 'bg-green-600' : 'bg-blue-800'} text-white px-3 py-1.5 rounded-lg text-sm font-medium`}>
                    {doingCheck ? '完成自检' : '开始自检'}
                  </button>
                  <button onClick={() => setShowAddItem(!showAddItem)} className="bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" />添加�?
                  </button>
                </div>
              </div>
              {showAddItem && (
                <div className="flex gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                  <input placeholder="检查内�? className="border rounded-lg px-3 py-2 flex-1" value={newItem.content} onChange={e => setNewItem({ ...newItem, content: e.target.value })} />
                  <select className="border rounded-lg px-3 py-2" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="日常检�?>日常检�?/option><option value="时效检�?>时效检�?/option><option value="风控检�?>风控检�?/option>
                    <option value="指标检�?>指标检�?/option><option value="团队检�?>团队检�?/option><option value="闭环检�?>闭环检�?/option>
                  </select>
                  <button onClick={async () => {
                    await authFetch('/api/self-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_item', company_id: companyId, ...newItem }) });
                    setShowAddItem(false); setNewItem({ content: '', category: '日常检�? }); loadData();
                  }} className="bg-blue-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-900">保存</button>
                </div>
              )}
              {categories.map(cat => (
                <div key={cat} className="mb-4">
                  <h3 className="text-sm font-bold text-gray-500 mb-2">{cat}</h3>
                  <div className="space-y-1">
                    {items.filter(i => i.category === cat).map(item => (
                      <div key={item.id} className="flex items-center gap-3 py-1.5">
                        {doingCheck ? (
                          <input type="checkbox" className="w-4 h-4" checked={checkResults[item.id] || false} onChange={e => setCheckResults({ ...checkResults, [item.id]: e.target.checked })} />
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${records.length > 0 && records[0].score >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        )}
                        <span className={`text-gray-800 ${item.isPreset ? '' : 'font-medium'}`}>{item.content}</span>
                        {item.isPreset && <span className="text-xs text-gray-400">内置</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {doingCheck && (
                <button onClick={async () => {
                  const totalItems = items.length;
                  const passedItems = Object.values(checkResults).filter(Boolean).length;
                  const score = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
                  await authFetch('/api/self-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit_check', company_id: companyId, total_items: totalItems, passed_items: passedItems, score, results: items.map(i => ({ item_id: i.id, passed: checkResults[i.id] || false })) }) });
                  setDoingCheck(false); setCheckResults({}); loadData();
                }} className="mt-4 w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700">提交自检结果</button>
              )}
            </div>

            {/* 自检趋势 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3"><TrendingUp className="w-5 h-5 text-blue-600" />自检趋势</h2>
              {records.length > 0 ? (
                <div className="space-y-2">
                  {records.slice(0, 10).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">{r.checkDate}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{r.passedItems}/{r.totalItems}项通过</span>
                        <span className={`font-bold ${r.score >= 80 ? 'text-green-600' : r.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{r.score}�?/span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-center py-4">暂无自检记录</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
