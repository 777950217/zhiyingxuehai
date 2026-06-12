'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import { Eye, Plus, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

interface KeywordConfig { id: string; keyword: string; category: string; alertLevel: string; isActive: boolean; isPreset: boolean }
interface AlertRecord { id: string; keyword: string; matchedText: string | null; agentName: string | null; alertLevel: string; isResolved: boolean; createdAt: string }

export default function KeywordMonitorPage() {
  const { profile, authFetch } = useAuth();
  const [configs, setConfigs] = useState<KeywordConfig[]>([]);
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, unresolved: 0, warning: 0, serious: 0, critical: 0 });
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', category: '敏感�?, alertLevel: 'warning' });
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ keyword: '', matchedText: '', agentName: '', alertLevel: 'warning' });
  const [loading, setLoading] = useState(true);

  const isPro = profile?.userType === 'manager';
  const customConfigCount = configs.filter(c => !c.isPreset).length;
  const RULE_LIMIT_PRO = 8;

  if (profile?.role !== 'enterprise_admin' && profile?.role !== 'enterprise_manager') {
    return <PermissionLocked title="行为关键词监�? description="此功能仅对专业版/旗舰版管理者开�? />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/keyword-monitor?company_id=${companyId}`);
      const json = await res.json();
      if (json.data) {
        setConfigs(json.data.configs || []);
        setRecords(json.data.records || []);
        setStats(json.data.stats || { total: 0, unresolved: 0, warning: 0, serious: 0, critical: 0 });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const levelLabels: Record<string, { bg: string; text: string; label: string }> = {
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '黄色预警' },
    serious: { bg: 'bg-orange-100', text: 'text-orange-800', label: '红色严重' },
    critical: { bg: 'bg-red-100', text: 'text-red-800', label: '黑色紧�? },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Shield className="w-7 h-7 text-red-600" />
          行为关键词监�?
        </h1>

        {loading ? <div className="text-center py-20 text-gray-400">加载�?..</div> : (
          <div className="space-y-6">
            {/* 统计概览 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-gray-900">{stats.total}</div><div className="text-sm text-gray-500">总告�?/div></div>
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center"><div className="text-2xl font-bold text-yellow-700">{stats.warning}</div><div className="text-sm text-yellow-600">黄色预警</div></div>
              <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center"><div className="text-2xl font-bold text-orange-700">{stats.serious}</div><div className="text-sm text-orange-600">红色严重</div></div>
              <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center"><div className="text-2xl font-bold text-red-700">{stats.critical}</div><div className="text-sm text-red-600">黑色紧�?/div></div>
            </div>

            {/* 关键词配�?*/}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">关键词配�?/h2>
                <div className="flex items-center gap-3">
                  {isPro && <span className="text-xs text-gray-500">{customConfigCount}/{RULE_LIMIT_PRO} 自定义关键词</span>}
                  <button onClick={() => setShowAddKeyword(!showAddKeyword)} disabled={isPro && customConfigCount >= RULE_LIMIT_PRO} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${isPro && customConfigCount >= RULE_LIMIT_PRO ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-800 text-white hover:bg-blue-900'}`}>
                    <Plus className="w-4 h-4" />添加关键�?
                  </button>
                </div>
              </div>
              {showAddKeyword && (
                <div className="flex gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                  <input placeholder="关键�? className="border rounded-lg px-3 py-2 flex-1" value={newKeyword.keyword} onChange={e => setNewKeyword({ ...newKeyword, keyword: e.target.value })} />
                  <select className="border rounded-lg px-3 py-2" value={newKeyword.category} onChange={e => setNewKeyword({ ...newKeyword, category: e.target.value })}>
                    <option value="敏感�?>敏感�?/option><option value="违规�?>违规�?/option><option value="风险�?>风险�?/option>
                  </select>
                  <select className="border rounded-lg px-3 py-2" value={newKeyword.alertLevel} onChange={e => setNewKeyword({ ...newKeyword, alertLevel: e.target.value })}>
                    <option value="warning">黄色预警</option><option value="serious">红色严重</option><option value="critical">黑色紧�?/option>
                  </select>
                  <button onClick={async () => {
                    await authFetch('/api/keyword-monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_keyword', company_id: companyId, ...newKeyword }) });
                    setShowAddKeyword(false); setNewKeyword({ keyword: '', category: '敏感�?, alertLevel: 'warning' }); loadData();
                  }} className="bg-blue-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-900">保存</button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {configs.map(c => {
                  const lvl = levelLabels[c.alertLevel] || levelLabels.warning;
                  return (
                    <span key={c.id} className={`px-3 py-1.5 rounded-full text-sm font-medium border ${lvl.bg} ${lvl.text} ${c.isPreset ? 'border-dashed' : ''}`}>
                      {c.isPreset && '📋'}{c.keyword} <span className="text-xs opacity-70">({lvl.label})</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 告警记录 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">告警记录</h2>
                <button onClick={() => setShowReportForm(!showReportForm)} className="text-blue-700 text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />录入对话片段
                </button>
              </div>
              {showReportForm && (
                <div className="mb-4 p-3 bg-orange-50 rounded-lg space-y-2">
                  <div className="flex gap-3">
                    <input placeholder="客服姓名" className="border rounded-lg px-3 py-2 flex-1" value={reportForm.agentName} onChange={e => setReportForm({ ...reportForm, agentName: e.target.value })} />
                    <select className="border rounded-lg px-3 py-2" value={reportForm.alertLevel} onChange={e => setReportForm({ ...reportForm, alertLevel: e.target.value })}>
                      <option value="warning">黄色</option><option value="serious">红色</option><option value="critical">黑色</option>
                    </select>
                  </div>
                  <textarea placeholder="粘贴对话片段..." className="w-full border rounded-lg px-3 py-2" rows={2} value={reportForm.matchedText} onChange={e => setReportForm({ ...reportForm, matchedText: e.target.value })} />
                  <button onClick={async () => {
                    await authFetch('/api/keyword-monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'report_alert', company_id: companyId, ...reportForm, keyword: reportForm.keyword || '手动标注' }) });
                    setShowReportForm(false); setReportForm({ keyword: '', matchedText: '', agentName: '', alertLevel: 'warning' }); loadData();
                  }} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700">提交告警</button>
                </div>
              )}
              {records.length > 0 ? (
                <div className="space-y-2">
                  {records.map(r => {
                    const lvl = levelLabels[r.alertLevel] || levelLabels.warning;
                    return (
                      <div key={r.id} className="flex items-start justify-between py-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${lvl.bg} ${lvl.text}`}>{lvl.label}</span>
                            <span className="font-medium text-gray-800">关键�? {r.keyword}</span>
                          </div>
                          {r.matchedText && <p className="text-sm text-gray-600 mt-1">"{r.matchedText}"</p>}
                          {r.agentName && <p className="text-xs text-gray-400 mt-0.5">客服: {r.agentName}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{r.createdAt.split('T')[0]}</span>
                          {!r.isResolved && (
                            <button onClick={async () => {
                              await authFetch('/api/keyword-monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve_alert', company_id: companyId, record_id: r.id }) });
                              loadData();
                            }} className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />已处�?/button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-400 text-center py-4">暂无告警记录</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
