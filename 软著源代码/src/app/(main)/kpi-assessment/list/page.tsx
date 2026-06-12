'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Target, Plus, Edit3, PlayCircle, Trash2, ArrowLeft,
  FileText, Clock, Calculator, CheckCircle2, Archive, AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ScoringSystem, AssessmentCycle, PositionType } from '@/lib/kpi-templates';

// ─── 方案列表项类�?───
interface SchemeItem {
  id: string;
  name: string;
  positions: PositionType[];
  cycle: AssessmentCycle;
  scoring_system: ScoringSystem;
  status: 'draft' | 'published' | 'archived';
  effective_period: string | null;
  created_at: string;
  updated_at: string;
}

// ─── 状态标�?───
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: '草稿', color: 'bg-gray-100 text-gray-600', icon: <FileText className="w-3 h-3" /> },
    published: { label: '已发�?, color: 'bg-green-50 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    archived: { label: '已归�?, color: 'bg-blue-50 text-blue-700', icon: <Archive className="w-3 h-3" /> },
  };
  const c = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── 岗位标签 ───
const POSITION_LABELS: Record<PositionType, string> = {
  presales: '售前客服',
  aftersales: '售后客服',
};

// ─── 主组�?───
export default function KPISchemeListPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const role = profile?.role;

  const [schemes, setSchemes] = useState<SchemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 个人版只�?
  const isPersonal = role === 'personal_user';

  // 加载方案列表
  const fetchSchemes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
      const accessToken = token ? JSON.parse(token).access_token : '';
      const res = await fetch('/api/kpi-schemes', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setSchemes(data.schemes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载方案列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

  // 删除方案
  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此方案？删除后不可恢复�?)) return;
    try {
      const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
      const accessToken = token ? JSON.parse(token).access_token : '';
      await fetch(`/api/kpi-schemes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSchemes(prev => prev.filter(s => s.id !== id));
    } catch { /* 忽略 */ }
  };

  // 发布方案
  const handlePublish = async (id: string) => {
    try {
      const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
      const accessToken = token ? JSON.parse(token).access_token : '';
      const res = await fetch(`/api/kpi-schemes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: 'published' }),
      });
      if (!res.ok) throw new Error('发布失败');
      setSchemes(prev => prev.map(s => s.id === id ? { ...s, status: 'published' as const } : s));
    } catch (err) {
      alert(err instanceof Error ? err.message : '发布失败');
    }
  };

  // 归档方案
  const handleArchive = async (id: string) => {
    try {
      const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
      const accessToken = token ? JSON.parse(token).access_token : '';
      const res = await fetch(`/api/kpi-schemes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) throw new Error('归档失败');
      setSchemes(prev => prev.map(s => s.id === id ? { ...s, status: 'archived' as const } : s));
    } catch (err) {
      alert(err instanceof Error ? err.message : '归档失败');
    }
  };

  // ─── 个人版：模板浏览 ───
  if (isPersonal) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.push('/kpi-assessment')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">KPI考核模板浏览</h1>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">学习�?/span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-500 text-sm mb-4">
              以下为KPI考核方案的标准模板，供学习参考。升级专业版或旗舰版可创建自定义方案�?
            </p>
            <div className="text-center py-12 text-gray-400">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">模板浏览功能开发中，敬请期�?/p>
              <button
                onClick={() => router.push('/kpi-assessment')}
                className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                返回方案设计器体�?�?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 专业�?旗舰版：方案列表 ───
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 顶栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/kpi-assessment')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">KPI考核方案管理</h1>
          </div>
          <button
            onClick={() => router.push('/kpi-assessment')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> 新建方案
          </button>
        </div>

        {/* 加载�?*/}
        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full mx-auto mb-3" />
            <p className="text-sm">加载方案列表...</p>
          </div>
        )}

        {/* 错误�?*/}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={fetchSchemes} className="ml-auto text-sm text-red-600 underline">重试</button>
          </div>
        )}

        {/* 空状�?*/}
        {!loading && !error && schemes.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">还没有考核方案</h3>
            <p className="text-sm text-gray-500 mb-6">创建第一个KPI考核方案，开始规范化管理</p>
            <button
              onClick={() => router.push('/kpi-assessment')}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm"
            >
              <Plus className="w-4 h-4 inline mr-1" /> 创建方案
            </button>
          </div>
        )}

        {/* 方案卡片列表 */}
        {!loading && !error && schemes.length > 0 && (
          <div className="grid gap-4">
            {schemes.map(scheme => (
              <div key={scheme.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900">{scheme.name}</h3>
                        <StatusBadge status={scheme.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {scheme.positions.map(p => POSITION_LABELS[p] || p).join('�?)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scheme.cycle === 'monthly' ? '月度考核' : '季度考核'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calculator className="w-3 h-3" />
                          {scheme.scoring_system === 'percentage' ? '百分比扣薪制' : '积分�?}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>创建: {new Date(scheme.created_at).toLocaleDateString()}</div>
                      {scheme.effective_period && <div>周期: {scheme.effective_period}</div>}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {/* 编辑：仅草稿状�?*/}
                    {scheme.status === 'draft' && (
                      <button
                        onClick={() => router.push(`/kpi-assessment/editor?schemeId=${scheme.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" /> 编辑
                      </button>
                    )}
                    {/* 发布：仅草稿状�?*/}
                    {scheme.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(scheme.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> 发布
                      </button>
                    )}
                    {/* 发起考核：仅已发布状�?*/}
                    {scheme.status === 'published' && (
                      <button
                        onClick={() => router.push(`/kpi-assessment/execute?schemeId=${scheme.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <PlayCircle className="w-3 h-3" /> 发起考核
                      </button>
                    )}
                    {/* 归档：仅已发布状�?*/}
                    {scheme.status === 'published' && (
                      <button
                        onClick={() => handleArchive(scheme.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Archive className="w-3 h-3" /> 归档
                      </button>
                    )}
                    {/* 删除：仅草稿状�?*/}
                    {scheme.status === 'draft' && (
                      <button
                        onClick={() => handleDelete(scheme.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> 删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
