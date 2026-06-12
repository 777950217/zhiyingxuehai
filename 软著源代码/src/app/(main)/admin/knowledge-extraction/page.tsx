'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Filter,
  BookOpen,
  ClipboardCheck,
  Library,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// ─── Types ───
type MaterialType = '话术体检' | '案例体检' | 'SOP体检' | '售后攻略' | '质检体检' | '方案体检' | '知识笔记' | '管理模板' | '自定�? | 'AI对话精华' | '质检反馈';
type ReviewStatus = '待审�? | '已采�? | '已废�?;

interface PhraseItem {
  id: string;
  company_id: string | null;
  category: string;
  content: string;
  is_preset: boolean;
  use_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  question: string | null;
  answer: string | null;
  scene: string | null;
  tags: string | null;
  review_status: ReviewStatus | null;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface FeedbackItem {
  id: string;
  company_id: string | null;
  category: '质检反馈';
  content: string; // issue_description
  is_preset: false;
  use_count: 0;
  created_by: string | null; // from_user_id
  created_at: string;
  updated_at: string | null;
  question: string | null; // issue_type
  answer: string | null; // suggestion
  scene: string | null;
  tags: string | null; // status
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null; // confirmed_at / resolved_at
  reviewed_by: string | null;
}

const MATERIAL_TYPES: MaterialType[] = ['话术体检', '案例体检', 'SOP体检', '售后攻略', '质检体检', '方案体检', '知识笔记', '管理模板', '自定�?, 'AI对话精华', '质检反馈'];

const RISK_BADGE: Record<string, string> = {
  '合规': 'bg-green-100 text-green-700 border-green-200',
  '有风�?: 'bg-orange-100 text-orange-700 border-orange-200',
  '高风�?: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_BADGE: Record<ReviewStatus, string> = {
  '待审�?: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '已采�?: 'bg-green-100 text-green-700 border-green-200',
  '已废�?: 'bg-gray-100 text-gray-500 border-gray-200',
};

type SubTab = '素材总览' | '审核操作' | '最佳实践库';

export default function KnowledgeExtractionPage() {
  const { authFetch, profile } = useAuth();
  const companyId = profile?.companyId ?? null;
  type MaterialItem = PhraseItem | FeedbackItem;
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('素材总览');

  // ─── 素材总览 filters ───
  const [overviewType, setOverviewType] = useState<MaterialType | '全部'>('全部');
  const [overviewStatus, setOverviewStatus] = useState<ReviewStatus | '全部'>('全部');
  const [overviewTimeRange, setOverviewTimeRange] = useState<string>('7d');
  const [viewItem, setViewItem] = useState<MaterialItem | null>(null);

  // ─── 审核 ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ─── 最佳实践库 ───
  const [practiceCategory, setPracticeCategory] = useState<MaterialType | '全部'>('全部');

  // ─── Fetch data ───
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyId) params.set('company_id', companyId);

      // Fetch phrase_library data
      const phrasesRes = await authFetch(`/api/phrases?${params.toString()}`);
      const phrasesJson = await phrasesRes.json();
      const phraseItems: MaterialItem[] = phrasesJson.data
        ? (phrasesJson.data as PhraseItem[]).filter(
            (p: PhraseItem) => !p.is_preset && MATERIAL_TYPES.includes(p.category as MaterialType)
          )
        : [];

      // Fetch quality_feedbacks data
      const feedbackItems: MaterialItem[] = [];
      try {
        const fbParams = new URLSearchParams();
        if (companyId) fbParams.set('company_id', companyId);
        fbParams.set('role', 'manager');
        const fbRes = await authFetch(`/api/quality-feedbacks?${fbParams.toString()}`);
        const fbJson = await fbRes.json();
        if (fbJson.data && Array.isArray(fbJson.data)) {
          for (const fb of fbJson.data) {
            feedbackItems.push({
              id: fb.id,
              company_id: fb.company_id ?? companyId,
              category: '质检反馈' as const,
              content: fb.issue_description || '',
              is_preset: false as const,
              use_count: 0 as const,
              created_by: fb.from_user_id || null,
              created_at: fb.created_at,
              updated_at: null,
              question: fb.issue_type || null,
              answer: fb.suggestion || null,
              scene: null,
              tags: fb.status || null,
              review_status: (fb.status === 'resolved' ? '已采�? : fb.status === 'confirmed' ? '已采�? : '待审�?) as ReviewStatus,
              review_note: null,
              reviewed_at: fb.confirmed_at || fb.resolved_at || null,
              reviewed_by: null,
            });
          }
        }
      } catch (fbErr) {
        console.error('[knowledge-extraction] feedback fetch error:', fbErr);
      }

      setMaterials([...phraseItems, ...feedbackItems]);
    } catch (err) {
      console.error('[knowledge-extraction] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, companyId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // ─── Time range filter ───
  const timeFiltered = useMemo(() => {
    if (overviewTimeRange === 'all') return materials;
    const days = overviewTimeRange === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return materials.filter(m => new Date(m.created_at) >= cutoff);
  }, [materials, overviewTimeRange]);

  // ─── Computed ───
  const filteredOverview = useMemo(() => {
    return timeFiltered.filter(m => {
      if (overviewType !== '全部' && m.category !== overviewType) return false;
      const status = m.review_status || '待审�?;
      if (overviewStatus !== '全部' && status !== overviewStatus) return false;
      return true;
    });
  }, [timeFiltered, overviewType, overviewStatus]);

  const pendingMaterials = useMemo(() => materials.filter(m => !m.review_status || m.review_status === '待审�?), [materials]);
  const adoptedMaterials = useMemo(() => materials.filter(m => m.review_status === '已采�?), [materials]);

  const adoptionRate = materials.length > 0
    ? Math.round((adoptedMaterials.length / materials.length) * 100)
    : 0;

  const practiceFiltered = useMemo(() => {
    return adoptedMaterials.filter(m => {
      if (practiceCategory !== '全部' && m.category !== practiceCategory) return false;
      return true;
    });
  }, [adoptedMaterials, practiceCategory]);

  // ─── Category stats ───
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; pending: number; adopted: number }> = {};
    for (const type of MATERIAL_TYPES) {
      const items = materials.filter(m => m.category === type);
      stats[type] = {
        total: items.length,
        pending: items.filter(m => !m.review_status || m.review_status === '待审�?).length,
        adopted: items.filter(m => m.review_status === '已采�?).length,
      };
    }
    return stats;
  }, [materials]);

  // ─── Actions ───
  const handleReview = async (id: string, status: ReviewStatus) => {
    setSaving(true);
    try {
      const note = reviewNotes[id] || '';
      const res = await authFetch('/api/phrases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          review_status: status,
          review_note: note || undefined,
          reviewed_at: new Date().toISOString(),
        }),
      });
      if (res.status === 409) {
        toast.error('数据已被修改，请刷新后重�?);
        fetchMaterials(); // Reload data
        return;
      }
      if (!res.ok) throw new Error('更新失败');
      setMaterials(prev => prev.map(m =>
        m.id === id ? { ...m, review_status: status, review_note: note || m.review_note, reviewed_at: new Date().toISOString() } : m
      ));
      setReviewNotes(prev => { const next = { ...prev }; delete next[id]; return next; });
    } catch (err) {
      console.error('[knowledge-extraction] review error:', err);
      toast.error('审核操作失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchReview = async (status: ReviewStatus) => {
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => {
        const note = reviewNotes[id] || '';
        return authFetch('/api/phrases', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            review_status: status,
            review_note: note || undefined,
            reviewed_at: new Date().toISOString(),
          }),
        });
      }));
      setMaterials(prev => prev.map(m =>
        selectedIds.has(m.id) ? { ...m, review_status: status, reviewed_at: new Date().toISOString() } : m
      ));
      setSelectedIds(new Set());
      setReviewNotes({});
    } catch (err) {
      console.error('[knowledge-extraction] batch review error:', err);
      toast.error('批量审核失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingMaterials.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingMaterials.map(m => m.id)));
    }
  };

  const handleExportCSV = () => {
    const headers = ['分类', '场景', '提交时间', '原文/问题', 'AI优化/回答', '审核状�?, '审核时间'];
    const rows = practiceFiltered.map(m => [
      m.category,
      m.scene || '',
      new Date(m.created_at).toLocaleString('zh-CN'),
      `"${(m.question || m.content || '').replace(/"/g, '""')}"`,
      `"${(m.answer || m.content || '').replace(/"/g, '""')}"`,
      m.review_status || '待审�?,
      m.reviewed_at ? new Date(m.reviewed_at).toLocaleString('zh-CN') : '',
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `最佳实践库_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const truncate = (str: string, len: number) =>
    str.length > len ? str.slice(0, len) + '...' : str;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // ─── Sub tabs ───
  const SUB_TABS: { id: SubTab; icon: React.ReactNode }[] = [
    { id: '素材总览', icon: <BookOpen className="w-4 h-4" /> },
    { id: '审核操作', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: '最佳实践库', icon: <Library className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Sub tab nav */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeSubTab === tab.id
                ? 'bg-blue-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.id}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={fetchMaterials} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载�?..
        </div>
      )}

      {/* ══════════�?Tab 1: 素材总览 ══════════�?*/}
      {!loading && activeSubTab === '素材总览' && (
        <div className="space-y-4">
          {/* Category stats cards */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {MATERIAL_TYPES.map(type => {
              const stat = categoryStats[type];
              return (
                <button
                  key={type}
                  onClick={() => setOverviewType(type === overviewType ? '全部' : type)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    overviewType === type
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <p className={`text-lg font-bold ${overviewType === type ? 'text-white' : 'text-gray-900'}`}>{stat.total}</p>
                  <p className={`text-xs ${overviewType === type ? 'text-blue-100' : 'text-gray-500'}`}>{type}</p>
                  <p className={`text-xs mt-0.5 ${overviewType === type ? 'text-blue-200' : 'text-orange-500'}`}>{stat.pending}待审</p>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={overviewType} onValueChange={v => setOverviewType(v as MaterialType | '全部')}>
              <SelectTrigger className="w-32"><SelectValue placeholder="素材类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部类型</SelectItem>
                {MATERIAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={overviewStatus} onValueChange={v => setOverviewStatus(v as ReviewStatus | '全部')}>
              <SelectTrigger className="w-28"><SelectValue placeholder="审核状�? /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部状�?/SelectItem>
                <SelectItem value="待审�?>待审�?/SelectItem>
                <SelectItem value="已采�?>已采�?/SelectItem>
                <SelectItem value="已废�?>已废�?/SelectItem>
              </SelectContent>
            </Select>
            <Select value={overviewTimeRange} onValueChange={setOverviewTimeRange}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">�?�?/SelectItem>
                <SelectItem value="30d">�?0�?/SelectItem>
                <SelectItem value="all">全部</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">�?{filteredOverview.length} �?/span>
          </div>

          {/* Table */}
          {filteredOverview.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>暂无素材数据</p>
              <p className="text-xs mt-1">团队成员使用AI体检站、售后攻略等功能后，内容会自动汇聚到这里</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-24">分类</TableHead>
                    <TableHead className="w-24">场景</TableHead>
                    <TableHead className="w-36">提交时间</TableHead>
                    <TableHead>原文/问题</TableHead>
                    <TableHead>AI优化/回答</TableHead>
                    <TableHead className="w-20">审核</TableHead>
                    <TableHead className="w-16">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverview.map(m => (
                    <TableRow key={m.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{m.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{m.scene ? truncate(m.scene, 12) : '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDate(m.created_at)}</TableCell>
                      <TableCell className="text-sm max-w-48">
                        <p className="truncate" title={m.question || m.content}>{truncate(m.question || m.content, 40)}</p>
                      </TableCell>
                      <TableCell className="text-sm max-w-48">
                        <p className="truncate text-blue-700" title={m.answer || m.content}>{truncate(m.answer || m.content, 40)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${STATUS_BADGE[m.review_status || '待审�?]}`}>{m.review_status || '待审�?}</Badge>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => setViewItem(m)} className="text-blue-600 hover:text-blue-800">
                          <Eye className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* View detail dialog */}
          <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>素材详情 �?{viewItem?.category}</DialogTitle>
              </DialogHeader>
              {viewItem && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">分类�?/span><Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{viewItem.category}</Badge></div>
                    <div><span className="text-gray-500">场景�?/span>{viewItem.scene || '-'}</div>
                    <div><span className="text-gray-500">提交时间�?/span>{formatDate(viewItem.created_at)}</div>
                    <div><span className="text-gray-500">审核状态：</span><Badge variant="outline" className={`text-xs ${STATUS_BADGE[viewItem.review_status || '待审�?]}`}>{viewItem.review_status || '待审�?}</Badge></div>
                    {viewItem.reviewed_at && <div><span className="text-gray-500">审核时间�?/span>{formatDate(viewItem.reviewed_at)}</div>}
                    {viewItem.tags && <div><span className="text-gray-500">标签�?/span>{viewItem.tags}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">原文/问题</p>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap border">{viewItem.question || viewItem.content}</div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-700">AI优化/回答</p>
                      <div className="p-3 bg-blue-50 rounded-lg text-sm whitespace-pre-wrap border border-blue-100">{viewItem.answer || viewItem.content}</div>
                    </div>
                  </div>
                  {viewItem.review_note && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">审核备注</p>
                      <p className="text-sm text-gray-600">{viewItem.review_note}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ══════════�?Tab 2: 审核操作 ══════════�?*/}
      {!loading && activeSubTab === '审核操作' && (
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><BookOpen className="w-5 h-5 text-blue-700" /></div>
                  <div>
                    <p className="text-2xl font-bold">{materials.length}</p>
                    <p className="text-sm text-gray-500">整体提交�?/p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-700" /></div>
                  <div>
                    <p className="text-2xl font-bold">{adoptedMaterials.length}</p>
                    <p className="text-sm text-gray-500">已采纳量</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-purple-700" /></div>
                  <div>
                    <p className="text-2xl font-bold">{adoptionRate}%</p>
                    <p className="text-sm text-gray-500">采纳�?/p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch actions */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">已�?{selectedIds.size} / {pendingMaterials.length} 条待审核</span>
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => handleBatchReview('已采�?)}
              disabled={selectedIds.size === 0 || saving}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> 批量标记可用
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
              onClick={() => handleBatchReview('已废�?)}
              disabled={selectedIds.size === 0 || saving}
            >
              <XCircle className="w-4 h-4 mr-1" /> 批量标记废弃
            </Button>
            {saving && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          </div>

          {/* Pending table */}
          {pendingMaterials.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
              <p>暂无待审核素�?/p>
              <p className="text-xs mt-1">所有内容均已审核完�?/p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === pendingMaterials.length && pendingMaterials.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead className="w-24">分类</TableHead>
                    <TableHead className="w-24">场景</TableHead>
                    <TableHead className="w-36">提交时间</TableHead>
                    <TableHead>原文/问题</TableHead>
                    <TableHead>AI优化/回答</TableHead>
                    <TableHead className="w-56">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMaterials.map(m => (
                    <TableRow key={m.id} className="hover:bg-gray-50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(m.id)}
                          onChange={() => toggleSelect(m.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{m.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{m.scene ? truncate(m.scene, 12) : '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDate(m.created_at)}</TableCell>
                      <TableCell className="text-sm max-w-40">
                        <p className="truncate" title={m.question || m.content}>{truncate(m.question || m.content, 35)}</p>
                      </TableCell>
                      <TableCell className="text-sm max-w-40">
                        <p className="truncate text-blue-700" title={m.answer || m.content}>{truncate(m.answer || m.content, 35)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 px-2"
                            onClick={() => handleReview(m.id, '已采�?)}
                            disabled={saving}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> 可用
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-gray-600 border-gray-300 hover:bg-gray-50 px-2"
                            onClick={() => handleReview(m.id, '已废�?)}
                            disabled={saving}
                          >
                            <XCircle className="w-3 h-3 mr-0.5" /> 废弃
                          </Button>
                        </div>
                        <Input
                          placeholder="审核备注"
                          className="mt-1.5 h-7 text-xs"
                          value={reviewNotes[m.id] || ''}
                          onChange={e => setReviewNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ══════════�?Tab 3: 最佳实践库 ══════════�?*/}
      {!loading && activeSubTab === '最佳实践库' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Library className="w-5 h-5 text-blue-700" />
              <h3 className="text-lg font-semibold">最佳实践库</h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">{practiceFiltered.length} �?/Badge>
            </div>
            <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={practiceFiltered.length === 0}>
              <Download className="w-4 h-4 mr-1" /> 导出CSV
            </Button>
          </div>

          <div className="flex gap-4">
            {/* Category sidebar */}
            <div className="w-36 flex-shrink-0">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b">
                  <p className="text-xs font-medium text-gray-500">分类筛�?/p>
                </div>
                {(['全部', ...MATERIAL_TYPES] as const).map(cat => {
                  const count = cat === '全部'
                    ? adoptedMaterials.length
                    : adoptedMaterials.filter(m => m.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setPracticeCategory(cat as MaterialType | '全部')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                        practiceCategory === cat
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className="text-xs text-gray-400 ml-1">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Material list */}
            <div className="flex-1 space-y-3">
              {practiceFiltered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Library className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>该分类暂无已采纳素材</p>
                  <p className="text-xs mt-1">审核通过的内容会自动归入最佳实践库</p>
                </div>
              ) : (
                practiceFiltered.map(m => (
                  <Card key={m.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{m.category}</Badge>
                          {m.scene && <Badge variant="outline" className="text-xs">{m.scene}</Badge>}
                          {m.tags && <Badge variant="outline" className="text-xs bg-gray-50">{m.tags}</Badge>}
                        </div>
                        <span className="text-xs text-gray-400">采纳�?{m.reviewed_at ? formatDate(m.reviewed_at) : '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500">原文/问题</p>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap border">{m.question || m.content}</div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-blue-600">AI优化/回答</p>
                          <div className="p-3 bg-blue-50 rounded-lg text-sm whitespace-pre-wrap border border-blue-100">{m.answer || m.content}</div>
                        </div>
                      </div>
                      {m.review_note && (
                        <p className="mt-2 text-xs text-gray-500">审核备注：{m.review_note}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
