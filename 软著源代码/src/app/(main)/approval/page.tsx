'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PermissionLocked } from '@/components/permission-locked';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { FileCheck, CheckCircle2, XCircle, Clock, Settings, ArrowRight } from 'lucide-react';

interface ApprovalItem { id: string; recordId: string | null; amount: number; reason: string | null; submittedBy: string; approvedBy: string | null; status: string; rejectReason: string | null; level: string; createdAt: string; approvedAt: string | null }
interface ThresholdConfig { managerLimit: number; bossLimit: number; bossPlusNote: boolean }

/* ─── Mock 数据 ─── */
const MOCK_APPROVAL_GOALS = [
  { metric: '审批合规�?, target: 95, actual: 88, unit: '%', inverse: false },
  { metric: '月赔付控�?, target: 5000, actual: 6200, unit: '�?, inverse: true },
  { metric: '审批时效', target: 4, actual: 5, unit: 'h', inverse: true },
  { metric: '驳回�?, target: 15, actual: 12, unit: '%', inverse: true },
];

const MOCK_APPROVAL_PATHS = [
  { type: '审批', desc: '主管审批通过3笔小额赔付（<¥500�?, person: '主管-李丽', color: 'bg-green-100 text-green-700' },
  { type: '升级', desc: '2笔大额赔付升级至老板审批', person: '系统自动', color: 'bg-orange-100 text-orange-700' },
  { type: '驳回', desc: '驳回1笔缺少赔付依据的申请', person: '老板-王�?, color: 'bg-red-100 text-red-700' },
  { type: '催办', desc: '1笔超时审批进行催办提�?, person: '系统自动', color: 'bg-yellow-100 text-yellow-700' },
  { type: '补充', desc: '1笔要求补充备注说明后重新提交', person: '老板-王�?, color: 'bg-blue-100 text-blue-700' },
];

const APPROVAL_REVIEW_QUESTIONS = [
  '合规率不达标的原因是什么？',
  '哪些赔付超出了控制目标？',
  '审批流程中哪个环节耗时最长？',
  '驳回的申请是否存在共性问题？',
  '审批阈值设置是否需要调整？',
  '是否存在绕过审批流程的情况？',
  '大额赔付占比是否异常偏高�?,
  '下一步如何提升审批合规率�?,
];

export default function ApprovalPage() {
  const { profile, authFetch } = useAuth();
  const [pendingItems, setPendingItems] = useState<ApprovalItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ApprovalItem[]>([]);
  const [threshold, setThreshold] = useState<ThresholdConfig>({ managerLimit: 500, bossLimit: 2000, bossPlusNote: true });
  const [showThreshold, setShowThreshold] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const isAdmin = profile?.role === 'enterprise_admin';
  const isManager = profile?.role === 'enterprise_manager';

  if (!isAdmin && !isManager) {
    return <PermissionLocked title="赔付审批�? description="此功能仅对专业版/旗舰版管理者开�? />;
  }

  const companyId = profile?.companyId || '';
  const userId = profile?.id || '';

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/approval?company_id=${companyId}&user_id=${userId}&role=${profile?.role}`);
      const json = await res.json();
      if (json.data) {
        setPendingItems(json.data.pending || []);
        setHistoryItems(json.data.history || []);
        if (json.data.threshold) setThreshold(json.data.threshold);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, userId, profile?.role, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const statusLabels: Record<string, { icon: React.ReactNode; color: string }> = {
    pending: { icon: <Clock className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-50' },
    approved: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
    rejected: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-600 bg-red-50' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <FileCheck className="w-7 h-7 text-blue-600" />
          赔付审批�?
        </h1>

        {/* ─── 🎯 目标板块：审批合规率+赔付控制 ─── */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-sky-50 rounded-2xl border border-blue-200 p-6 mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">🎯 审批管控目标</h3>
          <p className="text-base text-gray-500 mb-4">审批合规率与赔付控制目标</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MOCK_APPROVAL_GOALS.map((g) => {
              const achieved = g.inverse ? g.actual <= g.target : g.actual >= g.target;
              const rate = g.target > 0
                ? (g.inverse ? Math.min(100, Math.round((g.target / Math.max(g.actual, 0.01)) * 100)) : Math.min(100, Math.round((g.actual / g.target) * 100)))
                : 0;
              const light = achieved ? '🟢' : rate >= 70 ? '🟡' : '🔴';
              return (
                <div key={g.metric} className={`rounded-xl border p-4 ${achieved ? 'bg-white border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-gray-900">{g.metric}</span>
                    <span className="text-2xl">{light}</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">{g.target}{g.unit}</div>
                  {!achieved && (
                    <button onClick={() => setExpandedReview(expandedReview === g.metric ? null : g.metric)} className="text-red-600 text-sm font-medium hover:underline mt-1">
                      ⚠️ 未达�?�?查看复盘 {expandedReview === g.metric ? '�? : '�?}
                    </button>
                  )}
                  {expandedReview === g.metric && (
                    <div className="mt-3 bg-white rounded-lg border p-4 space-y-2">
                      <p className="text-sm font-bold text-gray-800">8问复�?/p>
                      {APPROVAL_REVIEW_QUESTIONS.map((q, i) => (
                        <div key={i} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-blue-600 font-medium shrink-0">{i + 1}.</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-200 mb-4" />

        {/* ─── 🛤�?路径板块：审批流转记�?─── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">🛤�?审批路径</h3>
          <p className="text-base text-gray-500 mb-4">审批流转记录与审批意�?/p>
          <div className="space-y-3">
            {MOCK_APPROVAL_PATHS.map((p, i) => (
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

        <hr className="border-gray-200 mb-4" />

        {/* ─── 📊 结果板块 ─── */}
        {(() => {
          const achieved = MOCK_APPROVAL_GOALS.filter(g => g.inverse ? g.actual <= g.target : g.actual >= g.target);
          const rate = Math.round((achieved.length / MOCK_APPROVAL_GOALS.length) * 100);
          return (
            <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl border border-green-200 p-6 mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">📊 审批结果</h3>
              <p className="text-base text-gray-500 mb-4">通过/驳回�?赔付金额统计+合规�?/p>
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
                {MOCK_APPROVAL_GOALS.map((g) => {
                  const isAch = g.inverse ? g.actual <= g.target : g.actual >= g.target;
                  const pct = g.target > 0
                    ? (g.inverse ? Math.min(100, Math.round((g.target / Math.max(g.actual, 0.01)) * 100)) : Math.min(100, Math.round((g.actual / g.target) * 100)))
                    : 0;
                  const dev = Math.round(((g.actual - g.target) / Math.max(g.target, 0.01)) * 100);
                  return (
                    <div key={g.metric} className={`rounded-xl border p-4 ${isAch ? 'bg-white border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-base font-bold text-gray-900 mb-2">{g.metric}</div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">目标 {g.target}{g.unit}</span>
                        <span className={`font-bold ${isAch ? 'text-green-700' : 'text-red-700'}`}>实际 {g.actual}{g.unit}</span>
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
          );
        })()}

        <hr className="border-gray-200 mb-4" />

        {/* ─── 原有功能区域 ─── */}
        <OnboardingGuide
        guideKey="approval-guide"
        steps={[
          { title: '设置主管审批阈�?, description: '设定主管可直接审批的赔付金额上限（参考：300-500元）' },
          { title: '设置老板审批阈�?, description: '设定需要老板审批的赔付金额上限（参考：1000-2000元）' },
          { title: '保存后审批规则自动生�?, description: '超权赔付将自动拦截，必须走审批流�? },
        ]}
      />

      {loading ? <div className="text-center py-20 text-gray-400">加载�?..</div> : (
        <div className="space-y-6">
          {/* 审批规则说明 */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-blue-900">审批规则</h2>
                {isAdmin && <button onClick={() => setShowThreshold(!showThreshold)} className="text-blue-700 text-sm flex items-center gap-1"><Settings className="w-4 h-4" />配置阈�?/button>}
              </div>
              <div className="space-y-1 text-blue-800 text-sm">
                <p>�?¥{threshold.managerLimit}以下：主管直接审�?/p>
                <p>�?¥{threshold.managerLimit}-¥{threshold.bossLimit}：需老板审批</p>
                <p>�?¥{threshold.bossLimit}以上：需老板审批+备注说明{threshold.bossPlusNote ? '(必须)' : '(选填)'}</p>
              </div>
              {showThreshold && isAdmin && (
                <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs">主管审批上限</label><input type="number" className="w-full border rounded-lg px-3 py-2" value={threshold.managerLimit} onChange={e => setThreshold({ ...threshold, managerLimit: Number(e.target.value) })} /><span className="text-xs text-gray-400">💡 行业参考：300-500�?/span></div>
                    <div><label className="text-xs">老板审批上限</label><input type="number" className="w-full border rounded-lg px-3 py-2" value={threshold.bossLimit} onChange={e => setThreshold({ ...threshold, bossLimit: Number(e.target.value) })} /><span className="text-xs text-gray-400">💡 行业参考：1000-2000�?/span></div>
                    <div className="flex items-end gap-2"><label className="flex items-center gap-2 py-2"><input type="checkbox" checked={threshold.bossPlusNote} onChange={e => setThreshold({ ...threshold, bossPlusNote: e.target.checked })} /><span className="text-sm">超额必须备注</span></label></div>
                  </div>
                  <button onClick={async () => {
                    await authFetch('/api/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_threshold', company_id: companyId, ...threshold }) });
                    setShowThreshold(false); loadData();
                  }} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium">保存配置</button>
                </div>
              )}
            </div>

            {/* 待审�?(老板视图) */}
            {isAdmin && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-yellow-500" />待我审批 <span className="text-sm font-normal text-gray-400">({pendingItems.length}�?</span></h2>
                {pendingItems.length > 0 ? (
                  <div className="space-y-3">
                    {pendingItems.map(item => {
                      const st = statusLabels[item.status] || statusLabels.pending;
                      return (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${st.color}`}>{st.icon}待审�?/span>
                              <span className="text-xl font-bold text-gray-900">¥{Number(item.amount).toLocaleString()}</span>
                            </div>
                            <span className="text-xs text-gray-400">{item.createdAt.split('T')[0]}</span>
                          </div>
                          {item.reason && <p className="text-sm text-gray-600 mb-2">原因: {item.reason}</p>}
                          <p className="text-xs text-gray-400 mb-3">提交�? {item.submittedBy}</p>
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              await authFetch('/api/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', company_id: companyId, approval_id: item.id, approved_by: userId }) });
                              loadData();
                            }} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-green-700"><CheckCircle2 className="w-4 h-4" />通过</button>
                            <button onClick={async () => {
                              const reason = prompt('请输入拒绝原�?');
                              if (!reason) return;
                              await authFetch('/api/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', company_id: companyId, approval_id: item.id, approved_by: userId, reject_reason: reason }) });
                              loadData();
                            }} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-red-700"><XCircle className="w-4 h-4" />拒绝</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-gray-400 text-center py-4">暂无待审�?/p>}
              </div>
            )}

            {/* 提交审批 (主管视图) */}
            {isManager && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="text-lg font-bold mb-4">提交赔付审批</h2>
                <div className="space-y-3">
                  <input id="approval-amount" placeholder="赔付金额" type="number" className="w-full border rounded-lg px-3 py-2" />
                  <textarea id="approval-reason" placeholder="赔付原因说明" className="w-full border rounded-lg px-3 py-2" rows={2} />
                  <button onClick={async () => {
                    const amountEl = document.getElementById('approval-amount') as HTMLInputElement;
                    const reasonEl = document.getElementById('approval-reason') as HTMLTextAreaElement;
                    const amt = Number(amountEl?.value || 0);
                    const rsn = reasonEl?.value || '';
                    if (amt <= 0) return;
                    await authFetch('/api/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', company_id: companyId, submitted_by: userId, amount: amt, reason: rsn }) });
                    amountEl.value = ''; reasonEl.value = ''; loadData();
                  }} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-900 flex items-center gap-2"><ArrowRight className="w-4 h-4" />提交审批</button>
                </div>
              </div>
            )}

            {/* 审批历史 */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-lg font-bold mb-4">审批记录（不可删除，仅可查看�?/h2>
              {historyItems.length > 0 ? (
                <div className="space-y-2">
                  {historyItems.map(item => {
                    const st = statusLabels[item.status] || statusLabels.pending;
                    return (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${st.color}`}>{item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已拒�? : '待审�?}</span>
                            <span className="font-bold">¥{Number(item.amount).toLocaleString()}</span>
                          </div>
                          {item.reason && <p className="text-sm text-gray-500 mt-0.5">{item.reason}</p>}
                          {item.rejectReason && <p className="text-sm text-red-500 mt-0.5">拒绝原因: {item.rejectReason}</p>}
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          <div>{item.createdAt.split('T')[0]}</div>
                          {item.approvedAt && <div>审批: {item.approvedAt.split('T')[0]}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-400 text-center py-4">暂无审批记录</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
