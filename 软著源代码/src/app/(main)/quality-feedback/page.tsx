'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface Feedback {
  id: string;
  company_id: string | null;
  from_user_id: string;
  to_user_id: string;
  issue_type: string;
  issue_description: string | null;
  suggestion: string | null;
  status: 'pending' | 'confirmed' | 'resolved';
  confirmed_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: '待确�?, color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
  confirmed: { label: '已确�?, color: 'bg-blue-100 text-blue-700 border-blue-300', icon: CheckCircle },
  resolved: { label: '已解�?, color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
};

export default function QualityFeedbackPage() {
  const { profile, authFetch } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'resolved' | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const isStaff = profile?.role === 'staff' || profile?.role === 'personal_user';

  const fetchFeedbacks = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const role = ['enterprise_admin', 'enterprise_manager', 'admin'].includes(profile.role || '') ? 'manager' : 'staff';
      const res = await authFetch(`/api/quality-feedbacks?user_id=${profile.id}&role=${role}${profile.companyId ? `&company_id=${profile.companyId}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data?.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [profile, authFetch]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const handleAction = useCallback(async (id: string, action: 'confirm' | 'resolve') => {
    if (!profile?.id) return;
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/quality-feedbacks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user_id: profile.id }),
      });
      if (res.ok) {
        setFeedbacks(prev => prev.map(f =>
          f.id === id
            ? { ...f, status: action === 'confirm' ? 'confirmed' : 'resolved', [action === 'confirm' ? 'confirmed_at' : 'resolved_at']: new Date().toISOString() }
            : f
        ));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  }, [profile, authFetch]);

  const isManager = ['enterprise_admin', 'enterprise_manager', 'admin'].includes(profile?.role || '');

  const filtered = activeTab === 'all' ? feedbacks : feedbacks.filter(f => f.status === activeTab);
  const counts = { pending: feedbacks.filter(f => f.status === 'pending').length, confirmed: feedbacks.filter(f => f.status === 'confirmed').length, resolved: feedbacks.filter(f => f.status === 'resolved').length };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">质检反馈</h1>
        <p className="text-gray-500 mt-1">{isManager ? '查看推送给员工的质检反馈状�? : '仅显示分配给您的反馈，确认后改善并标记已解决'}</p>
        {!isManager && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
            <AlertTriangle className="w-3.5 h-3.5" />
            仅显示分配给您的反馈
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {(['pending', 'confirmed', 'resolved'] as const).map(s => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button key={s} onClick={() => setActiveTab(s)} className={`p-3 rounded-xl border-2 text-center transition-all ${activeTab === s ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <Icon className={`w-5 h-5 mx-auto mb-1 ${s === 'pending' ? 'text-yellow-500' : s === 'confirmed' ? 'text-blue-500' : 'text-green-500'}`} />
              <div className="text-2xl font-bold text-gray-800">{counts[s]}</div>
              <div className="text-xs text-gray-500">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Tab */}
      <div className="flex gap-2 border-b pb-2">
        {(['all', 'pending', 'confirmed', 'resolved'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'all' ? '全部' : STATUS_CONFIG[t].label}
            {t !== 'all' && counts[t] > 0 && <span className="ml-1 text-xs opacity-80">({counts[t]})</span>}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载�?..</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-lg">暂无{activeTab === 'all' ? '' : STATUS_CONFIG[activeTab]?.label || ''}反馈</p>
          <p className="text-gray-300 text-sm mt-1">{isManager ? '在质检体检页面推送质检反馈给员�? : '主管推送质检质检反馈后会在这里显�?}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(fb => {
            const cfg = STATUS_CONFIG[fb.status];
            const Icon = cfg.icon;
            const isExpanded = expandedId === fb.id;
            return (
              <div key={fb.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <button onClick={() => setExpandedId(isExpanded ? null : fb.id)} className="w-full p-4 flex items-start gap-3 text-left">
                  <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color} flex items-center gap-1`}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{fb.issue_type}</div>
                    <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{fb.issue_description || '无描�?}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(fb.created_at).toLocaleDateString('zh-CN')}</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0">
                    <div className="space-y-3 pt-3">
                      {fb.issue_description && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1">问题描述</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{fb.issue_description}</div>
                        </div>
                      )}
                      {fb.suggestion && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1">改善建议</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 rounded-lg p-3">{fb.suggestion}</div>
                        </div>
                      )}
                      {fb.confirmed_at && (
                        <div className="text-xs text-gray-400">确认时间: {new Date(fb.confirmed_at).toLocaleString('zh-CN')}</div>
                      )}
                      {fb.resolved_at && (
                        <div className="text-xs text-gray-400">解决时间: {new Date(fb.resolved_at).toLocaleString('zh-CN')}</div>
                      )}
                      {/* 员工操作 */}
                      {!isManager && fb.status === 'pending' && (
                        <button onClick={() => handleAction(fb.id, 'confirm')} disabled={actionLoading === fb.id} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300">
                          {actionLoading === fb.id ? '�?处理�?..' : '�?确认收到'}
                        </button>
                      )}
                      {!isManager && fb.status === 'confirmed' && (
                        <button onClick={() => handleAction(fb.id, 'resolve')} disabled={actionLoading === fb.id} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-gray-300">
                          {actionLoading === fb.id ? '�?处理�?..' : '�?标记已解�?}
                        </button>
                      )}
                      {/* 主管看状�?*/}
                      {isManager && (
                        <div className="text-sm text-gray-500">
                          {fb.status === 'pending' && '�?等待员工确认'}
                          {fb.status === 'confirmed' && '📋 员工已确认，等待改善'}
                          {fb.status === 'resolved' && '�?员工已标记解�?}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
