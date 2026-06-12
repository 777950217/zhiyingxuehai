'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import { Trophy, Plus, Star, Users, Settings, Zap } from 'lucide-react';

interface Rule { id: string; action: string; points: number; isActive: boolean; isPreset: boolean }
interface LeaderboardItem { userId: string; userName: string; points: number }

export default function IncentivePage() {
  const { profile, authFetch } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ action: '', points: 1 });
  const [showRecord, setShowRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ userName: '', action: '', points: 0 });
  const [loading, setLoading] = useState(true);

  const isPro = profile?.userType === 'manager'; // 专业�?
  const customRuleCount = rules.filter(r => !r.isPreset).length;
  const RULE_LIMIT_PRO = 8;

  // 权限：ent_admin + ent_manager
  if (profile?.role !== 'enterprise_admin' && profile?.role !== 'enterprise_manager') {
    return <PermissionLocked title="正向激励积�? description="此功能仅对专业版/旗舰版管理者开�? />;
  }

  const companyId = profile?.companyId || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/incentive?company_id=${companyId}`);
      const json = await res.json();
      if (json.data) {
        setRules(json.data.rules || []);
        setLeaderboard(json.data.leaderboard || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Trophy className="w-7 h-7 text-yellow-500" />
          正向激励积�?
        </h1>

        {loading ? <div className="text-center py-20 text-gray-400">加载�?..</div> : (
          <div className="space-y-6">
            {/* 排行�?*/}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />积分排行�?/h2>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((item, i) => (
                    <div key={item.userId} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'
                        }`}>{i + 1}</span>
                        <span className="font-medium text-gray-800">{item.userName}</span>
                      </div>
                      <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /><span className="font-bold text-gray-900">{item.points}</span></div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-center py-4">暂无积分记录</p>}
            </div>

            {/* 积分规则 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Zap className="w-5 h-5 text-orange-500" />积分规则</h2>
                <div className="flex items-center gap-3">
                  {isPro && <span className="text-xs text-gray-500">{customRuleCount}/{RULE_LIMIT_PRO} 自定义规�?/span>}
                  <button onClick={() => setShowAddRule(!showAddRule)} disabled={isPro && customRuleCount >= RULE_LIMIT_PRO} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${isPro && customRuleCount >= RULE_LIMIT_PRO ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-800 text-white hover:bg-blue-900'}`}>
                    <Plus className="w-4 h-4" />添加规则
                  </button>
                </div>
              </div>
              {showAddRule && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex gap-3">
                    <input placeholder="行为名称" className="border rounded-lg px-3 py-2 flex-1" value={newRule.action} onChange={e => setNewRule({ ...newRule, action: e.target.value })} />
                    <input placeholder="积分" type="number" className="border rounded-lg px-3 py-2 w-20" value={newRule.points} onChange={e => setNewRule({ ...newRule, points: Number(e.target.value) })} />
                    <button onClick={async () => {
                      await authFetch('/api/incentive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_rule', company_id: companyId, action_name: newRule.action, points: newRule.points }) });
                      setShowAddRule(false); setNewRule({ action: '', points: 1 }); loadData();
                    }} className="bg-blue-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-900">保存</button>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">💡 行业参考：满意度达�?5�?/ 零投�?10�?/ 转化率超�?8�?/div>
                </div>
              )}
              <div className="space-y-2">
                {rules.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      {r.isPreset && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">预设</span>}
                      <span className="text-gray-800">{r.action}</span>
                    </div>
                    <span className="text-blue-700 font-bold">+{r.points}�?/span>
                  </div>
                ))}
              </div>
            </div>

            {/* 手动记录积分 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">手动记录积分</h2>
              <div className="grid grid-cols-3 gap-3">
                <input placeholder="客服姓名" className="border rounded-lg px-3 py-2" value={recordForm.userName} onChange={e => setRecordForm({ ...recordForm, userName: e.target.value })} />
                <select className="border rounded-lg px-3 py-2" value={recordForm.action} onChange={e => {
                  const rule = rules.find(r => r.action === e.target.value);
                  setRecordForm({ ...recordForm, action: e.target.value, points: rule?.points || 0 });
                }}>
                  <option value="">选择行为</option>
                  {rules.map(r => <option key={r.id} value={r.action}>{r.action}({r.points}�?</option>)}
                </select>
                <button onClick={async () => {
                  if (!recordForm.action || !recordForm.userName) return;
                  await authFetch('/api/incentive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'record', company_id: companyId, user_id: recordForm.userName, action_name: recordForm.action, points: recordForm.points }) });
                  setRecordForm({ userName: '', action: '', points: 0 }); loadData();
                }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">记录</button>
              </div>
            </div>

            {/* 积分兑换设置（仅配置�?*/}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-2">积分兑换设置</h2>
              <p className="text-gray-500 text-sm">此处仅配置兑换项，不涉及实际兑换操作</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
