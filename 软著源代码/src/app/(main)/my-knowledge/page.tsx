'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  BookOpen, Headphones, ShieldCheck, Settings, Package, BarChart3, GraduationCap,
  Search, ChevronRight, ChevronDown, Trash2, Clock, Tag, Sparkles, Lock, AlertCircle,
  Database, CloudOff, Copy, Check, Plus, X, Loader2
} from 'lucide-react';

// ─── Types ───
interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  createdAt: string;
  expiresAt?: string | null;
  freshnessStatus?: string | null;
  originalData?: Record<string, unknown>;
}

interface SubCategory {
  key: string;
  label: string;
  dataSource: 'phrase_library' | 'quality_feedbacks' | 'product_profiles' | 'cost_records' | 'localStorage' | 'coming_soon';
  category?: string;
  storageKey?: string;
  comingSoon?: boolean;
  localStorageNote?: boolean;
}

interface TopCategory {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPlans: CompanyPlan[];
  subs: SubCategory[];
}

type CompanyPlan = 'basic' | 'pro' | 'enterprise';

// ─── Config ───
const CATEGORIES: TopCategory[] = [
  {
    key: 'speech',
    label: '客服话术',
    description: '客户接待沟�?,
    icon: Headphones,
    requiredPlans: ['basic', 'pro', 'enterprise'],
    subs: [
      { key: 'speech-library', label: '话术�?, dataSource: 'phrase_library', category: '话术�? },
      { key: 'speech-checkup', label: 'AI话术体检结果', dataSource: 'phrase_library', category: '话术体检' },
      { key: 'speech-custom', label: '我的快捷�?, dataSource: 'phrase_library', category: '自定�? },
    ],
  },
  {
    key: 'aftersales',
    label: '售后实战',
    description: '售后问题处理与复�?,
    icon: BookOpen,
    requiredPlans: ['basic', 'pro', 'enterprise'],
    subs: [
      { key: 'guide', label: '售后标准攻略', dataSource: 'phrase_library', category: '售后攻略' },
      { key: 'sop-checkup', label: 'SOP流程体检结果', dataSource: 'phrase_library', category: 'SOP体检' },
      { key: 'case-checkup', label: '售后案例复盘', dataSource: 'phrase_library', category: '案例体检' },
    ],
  },
  {
    key: 'quality',
    label: '质检管理',
    description: '服务质量管控与闭�?,
    icon: ShieldCheck,
    requiredPlans: ['enterprise'],
    subs: [
      { key: 'quality-checkup', label: '质检体检结果', dataSource: 'phrase_library', category: '质检体检' },
      { key: 'quality-feedback', label: '团队改善闭环', dataSource: 'quality_feedbacks' },
    ],
  },
  {
    key: 'management',
    label: '管理方案',
    description: '团队管理策略与模�?,
    icon: Settings,
    requiredPlans: ['enterprise'],
    subs: [
      { key: 'plan-checkup', label: '管理方案体检结果', dataSource: 'phrase_library', category: '方案体检' },
      { key: 'mgmt-templates', label: '通用管理模板', dataSource: 'phrase_library', category: '管理模板' },
      { key: 'custom-rules', label: '自定义规则库', dataSource: 'phrase_library', category: '判断规则' },
      { key: 'promo-plans', label: '团队激励与晋升方案', dataSource: 'phrase_library', category: '晋升方案' },
    ],
  },
  {
    key: 'product',
    label: '产品知识',
    description: '业务资料与经验沉淀',
    icon: Package,
    requiredPlans: ['basic', 'pro', 'enterprise'],
    subs: [
      { key: 'product-profiles', label: '产品官方档案', dataSource: 'product_profiles' },
      { key: 'knowledge-notes', label: '个人知识笔记', dataSource: 'phrase_library', category: '知识笔记' },
    ],
  },
  {
    key: 'business',
    label: '经营数据',
    description: '成本与运营数据记�?,
    icon: BarChart3,
    requiredPlans: ['enterprise'],
    subs: [
      { key: 'cost-records', label: '售后成本明细', dataSource: 'cost_records' },
      { key: 'cash-flow', label: '经营现金流数�?, dataSource: 'phrase_library', category: '现金�? },
      { key: 'team-ops', label: '团队运营数据', dataSource: 'coming_soon', comingSoon: true },
    ],
  },
  {
    key: 'learning',
    label: '学习成长',
    description: '个人能力提升记录',
    icon: GraduationCap,
    requiredPlans: ['basic', 'pro', 'enterprise'],
    subs: [
      {
        key: 'learning-progress',
        label: '课程学习进度',
        dataSource: 'localStorage',
        storageKey: 'learning-path-progress',
        localStorageNote: true,
      },
      { key: 'ai-dialogs', label: 'AI对话急救记录', dataSource: 'phrase_library', category: 'AI对话精华' },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  speech: 'bg-blue-500',
  aftersales: 'bg-emerald-500',
  quality: 'bg-purple-500',
  management: 'bg-amber-500',
  product: 'bg-teal-500',
  business: 'bg-rose-500',
  learning: 'bg-indigo-500',
};

const CATEGORY_BG: Record<string, string> = {
  speech: 'bg-blue-50',
  aftersales: 'bg-emerald-50',
  quality: 'bg-purple-50',
  management: 'bg-amber-50',
  product: 'bg-teal-50',
  business: 'bg-rose-50',
  learning: 'bg-indigo-50',
};

const SOURCE_LABELS: Record<string, string> = {
  'phrase_library': '知识�?,
  'quality_feedbacks': '质检反馈',
  'product_profiles': '产品档案',
  'cost_records': '成本记录',
  'localStorage': '本地存储',
  'coming_soon': '即将开�?,
};

/** Escape special chars for safe use in ilike/search patterns (%_\) */
function escapeSearchQuery(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&');
}

export default function MyKnowledgePage() {
  const { authFetch, profile } = useAuth();
  const companyPlan = profile?.companyPlan || 'basic';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create modal state (for 自定�?subcategory)
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', tags: '', validityDays: '180' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Filter categories by plan (memoized)
  const visibleCategories = useMemo(
    () => CATEGORIES.filter(c => c.requiredPlans.includes(companyPlan)),
    [companyPlan]
  );

  // Memoized filtered items for performance
  const filteredItems = useMemo(
    () => {
      if (!searchQuery.trim()) return items;
      const q = escapeSearchQuery(searchQuery.toLowerCase());
      return items.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    },
    [items, searchQuery]
  );

  // Fetch category counts for overview
  const fetchCategoryCounts = useCallback(async () => {
    if (!authFetch) return;
    const counts: Record<string, number> = {};
    for (const cat of visibleCategories) {
      let total = 0;
      for (const sub of cat.subs) {
        if (sub.dataSource === 'phrase_library' && sub.category) {
          try {
            const res = await authFetch(`/api/phrases?category=${encodeURIComponent(sub.category)}&is_preset=false&limit=0`);
            if (res.ok) {
              const data = await res.json();
              total += (data.data as unknown[])?.length || 0;
            }
          } catch { /* ignore */ }
        } else if (sub.dataSource === 'localStorage') {
          try {
            const uid = profile?.id || '';
            const key = sub.storageKey ? `${sub.storageKey}_${uid}` : '';
            const stored = key ? localStorage.getItem(key) : null;
            if (stored) {
              const parsed = JSON.parse(stored);
              total += Array.isArray(parsed) ? parsed.length : (typeof parsed === 'object' ? Object.keys(parsed).length : 1);
            }
          } catch { /* ignore */ }
        } else if (sub.dataSource === 'coming_soon') {
          // skip
        } else {
          // quality_feedbacks, product_profiles, cost_records - fetch counts
          try {
            let url = '';
            if (sub.dataSource === 'quality_feedbacks') url = '/api/quality-feedbacks?limit=0';
            else if (sub.dataSource === 'product_profiles') url = '/api/product-profile';
            else if (sub.dataSource === 'cost_records') url = '/api/cost-records?limit=0';
            if (url) {
              const res = await authFetch(url);
              if (res.ok) {
                const data = await res.json();
                total += (data.data as unknown[])?.length || 0;
              }
            }
          } catch { /* ignore */ }
        }
      }
      counts[cat.key] = total;
    }
    setCategoryCounts(counts);
  }, [authFetch, profile?.id, visibleCategories]);

  useEffect(() => { fetchCategoryCounts(); }, [fetchCategoryCounts]);

  // Fetch items for selected sub-category
  const fetchItems = useCallback(async () => {
    if (!authFetch || !selectedSub) return;
    setLoading(true);
    try {
      // Find the sub category config
      let subConfig: SubCategory | undefined;
      for (const cat of visibleCategories) {
        const found = cat.subs.find(s => s.key === selectedSub);
        if (found) { subConfig = found; break; }
      }
      if (!subConfig) return;

      let fetchedItems: KnowledgeItem[] = [];

      if (subConfig.dataSource === 'phrase_library' && subConfig.category) {
        const res = await authFetch(`/api/phrases?category=${encodeURIComponent(subConfig.category)}&is_preset=false`);
        if (res.ok) {
          const data = await res.json();
          const records = (data.data || []) as Record<string, unknown>[];
          fetchedItems = records.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            title: (r.question as string || r.content as string || '').slice(0, 30) || '未命�?,
            summary: (r.content as string || '').slice(0, 80) || '暂无内容',
            source: subConfig.category || '知识�?,
            category: r.category as string,
            createdAt: r.created_at as string || '',
            expiresAt: r.expires_at as string || null,
            freshnessStatus: r.freshness_status as string || null,
            originalData: r,
          }));
        }
      } else if (subConfig.dataSource === 'quality_feedbacks') {
        const uid = profile?.id || '';
        const res = await authFetch(`/api/quality-feedbacks?user_id=${uid}&role=staff`);
        if (res.ok) {
          const data = await res.json();
          const records = (data.data || []) as Record<string, unknown>[];
          fetchedItems = records.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            title: (r.issue_type as string || '').slice(0, 30) || '质检反馈',
            summary: (r.issue_description as string || '').slice(0, 80) || '暂无描述',
            source: '质检反馈',
            category: r.status as string || 'pending',
            createdAt: r.created_at as string || '',
            originalData: r,
          }));
        }
      } else if (subConfig.dataSource === 'product_profiles') {
        const res = await authFetch('/api/product-profile');
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const pd = data.data as Record<string, unknown>;
            const categories = (pd.categories as Record<string, unknown>[]) || [];
            fetchedItems = categories.map((c: Record<string, unknown>, i: number) => ({
              id: `profile-${i}`,
              title: (c.name as string) || `品类 ${i + 1}`,
              summary: `${(c.brands as unknown[])?.length || 0} 个品牌`,
              source: '产品档案',
              category: '产品档案',
              createdAt: '',
              originalData: c,
            }));
          }
        }
      } else if (subConfig.dataSource === 'cost_records') {
        const res = await authFetch('/api/cost-records');
        if (res.ok) {
          const data = await res.json();
          const records = (data.data || []) as Record<string, unknown>[];
          fetchedItems = records.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            title: (r.category as string || r.description as string || '').slice(0, 30) || '成本记录',
            summary: `${r.amount ? `¥${r.amount}` : ''} ${(r.description as string || '').slice(0, 50)}`,
            source: '成本记录',
            category: '经营数据',
            createdAt: r.created_at as string || '',
            originalData: r,
          }));
        }
      } else if (subConfig.dataSource === 'localStorage' && subConfig.storageKey) {
        const uid = profile?.id || '';
        const key = `${subConfig.storageKey}_${uid}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              fetchedItems = Object.entries(parsed).map(([k, v]) => ({
                id: `ls-${k}`,
                title: k,
                summary: typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80),
                source: '本地存储',
                category: '学习成长',
                createdAt: '',
              }));
            }
          } catch { /* ignore */ }
        }
      }

      setItems(fetchedItems);
    } catch (err) {
      console.error('Fetch items error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, profile?.id, selectedSub, searchQuery, visibleCategories]);

  useEffect(() => { if (selectedSub) fetchItems(); }, [fetchItems, selectedSub]);

  // Delete item
  const handleDelete = async (item: KnowledgeItem) => {
    if (!authFetch) return;
    if (!confirm('确定删除这条内容�?)) return;
    setDeleting(item.id);
    try {
      // Determine which API to call based on original data
      const cat = visibleCategories.find(c => c.subs.some(s => s.key === selectedSub));
      const sub = cat?.subs.find(s => s.key === selectedSub);
      if (sub?.dataSource === 'phrase_library') {
        const res = await authFetch(`/api/phrases?id=${item.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('删除失败');
      } else if (sub?.dataSource === 'quality_feedbacks') {
        const res = await authFetch(`/api/quality-feedbacks/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'resolved' }),
        });
        if (!res.ok) throw new Error('操作失败');
      } else if (sub?.dataSource === 'cost_records') {
        const res = await authFetch(`/api/cost-records?id=${item.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('删除失败');
      }
      setItems(prev => prev.filter(i => i.id !== item.id));
      fetchCategoryCounts();
    } catch (err) {
      alert('删除失败，请重试');
    } finally {
      setDeleting(null);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedCats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Copy content to clipboard
  const handleCopy = async (item: KnowledgeItem) => {
    const text = item.originalData?.answer as string || item.originalData?.content as string || item.summary;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  };

  // AI Refresh suggestion state
  const [refreshItem, setRefreshItem] = useState<KnowledgeItem | null>(null);
  const [refreshSuggestion, setRefreshSuggestion] = useState<{ updated_title: string; updated_content: string; update_notes: string } | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);

  const handleAiRefresh = async (item: KnowledgeItem) => {
    setRefreshItem(item);
    setRefreshSuggestion(null);
    setRefreshLoading(true);
    try {
      const res = await authFetch('/api/phrase-library/refresh-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase_id: item.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setRefreshSuggestion(data.suggestion);
      } else {
        const data = await res.json();
        toast.error(data.error || '生成更新建议失败');
      }
    } catch {
      toast.error('生成更新建议失败');
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleAdoptRefresh = async () => {
    if (!refreshItem || !refreshSuggestion) return;
    try {
      const res = await authFetch(`/api/phrases/${refreshItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: refreshSuggestion.updated_content,
          question: refreshSuggestion.updated_title,
        }),
      });
      if (res.ok) {
        toast.success('已采纳更新建�?);
        setRefreshItem(null);
        setRefreshSuggestion(null);
        // Reload current subcategory
        if (selectedSub) fetchItems();
      } else {
        toast.error('更新失败');
      }
    } catch {
      toast.error('更新失败');
    }
  };

  // Create new custom phrase
  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      setCreateError('场景和内容不能为�?);
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile?.companyId || null,
          category: '自定�?,
          content: createForm.content,
          question: createForm.title,
          answer: createForm.content,
          scene: `快捷�?- 自定义`,
          tags: createForm.tags ? `自定�?${createForm.tags}` : '自定�?快捷�?,
          is_preset: false,
          created_by: profile?.id,
          expires_at: createForm.validityDays === '0' ? null : new Date(Date.now() + parseInt(createForm.validityDays) * 86400000).toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      setShowCreate(false);
      setCreateForm({ title: '', content: '', tags: '', validityDays: '180' });
      fetchItems();
      fetchCategoryCounts();
    } catch {
      setCreateError('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleCategoryClick = (catKey: string) => {
    setSelectedCategory(catKey);
    setSelectedSub(null);
    setExpandedCats(prev => ({ ...prev, [catKey]: true }));
  };

  const handleSubClick = (catKey: string, subKey: string) => {
    setSelectedCategory(catKey);
    setSelectedSub(subKey);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch { return ''; }
  };

  const getCurrentSubConfig = (): SubCategory | undefined => {
    for (const cat of visibleCategories) {
      const found = cat.subs.find(s => s.key === selectedSub);
      if (found) return found;
    }
    return undefined;
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-500" />
            我的知识�?
          </h1>
          <p className="text-gray-500 mt-1">你的所有知识资产，一站式管理</p>
        </div>

        {/* Global Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索所有知识内�?.."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          {/* Left Nav */}
          <div className="w-60 shrink-0 hidden md:block">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-3 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">分类导航</span>
              </div>
              <nav className="p-2">
                {visibleCategories.map(cat => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.key;
                  const isLocked = !cat.requiredPlans.includes(companyPlan);
                  const isExpanded = expandedCats[cat.key];
                  return (
                    <div key={cat.key}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCategoryClick(cat.key)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCategoryClick(cat.key); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left">{cat.label}</span>
                        {isLocked && <Lock className="w-3 h-3 text-gray-400" />}
                        <span className="text-xs text-gray-400">{categoryCounts[cat.key] || 0}</span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleExpand(cat.key); }}
                          className="p-0.5 hover:bg-gray-200 rounded"
                          aria-label={isExpanded ? '收起' : '展开'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="ml-6 mt-0.5 space-y-0.5">
                          {cat.subs.map(sub => (
                            <button
                              key={sub.key}
                              onClick={() => handleSubClick(cat.key, sub.key)}
                              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
                                selectedSub === sub.key
                                  ? 'bg-blue-100 text-blue-700 font-medium'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {sub.comingSoon && (
                                <Sparkles className="w-3 h-3 text-amber-400" />
                              )}
                              {sub.localStorageNote && (
                                <CloudOff className="w-3 h-3 text-amber-400" />
                              )}
                              <span className="flex-1 text-left">{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Mobile Category Tabs */}
          <div className="md:hidden w-full mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {visibleCategories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryClick(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                      selectedCategory === cat.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {/* Mobile Sub-category selector when category is selected */}
            {selectedCategory && (
              <select
                value={selectedSub || ''}
                onChange={e => handleSubClick(selectedCategory, e.target.value)}
                className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>选择子类�?..</option>
                {visibleCategories.find(c => c.key === selectedCategory)?.subs.map(sub => (
                  <option key={sub.key} value={sub.key} disabled={sub.comingSoon}>
                    {sub.label}{sub.comingSoon ? ' (即将开�?' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Right Content */}
          <div className="flex-1 min-w-0">
            {!selectedCategory ? (
              /* Overview Mode - no category selected */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleCategories.map(cat => {
                  const Icon = cat.icon;
                  const isLocked = !cat.requiredPlans.includes(companyPlan);
                  return (
                    <div
                      key={cat.key}
                      onClick={() => handleCategoryClick(cat.key)}
                      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow ${
                        isLocked ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${CATEGORY_COLORS[cat.key]} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{cat.label}</h3>
                            {isLocked && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm font-medium text-gray-700">
                              {categoryCounts[cat.key] || 0} �?
                            </span>
                            <span className="text-xs text-gray-400">
                              {cat.subs.filter(s => s.dataSource !== 'coming_soon').length} 个子类目
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Category Detail Mode - category selected, show sub-tabs + content */
              <div>
                {/* Breadcrumb + Back */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => { setSelectedSub(null); setSelectedCategory(null); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    概览
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  {selectedSub ? (
                    <>
                      <button
                        onClick={() => setSelectedSub(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        {visibleCategories.find(c => c.key === selectedCategory)?.label}
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {getCurrentSubConfig()?.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {visibleCategories.find(c => c.key === selectedCategory)?.label}
                    </span>
                  )}
                </div>

                {/* Sub-tabs for current category */}
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                  {visibleCategories.find(c => c.key === selectedCategory)?.subs.map(sub => (
                    <button
                      key={sub.key}
                      onClick={() => handleSubClick(selectedCategory, sub.key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                        selectedSub === sub.key
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {sub.label}
                      {sub.comingSoon && (
                        <span className="ml-1 px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">即将开�?/span>
                      )}
                      {sub.localStorageNote && (
                        <span className="ml-1 px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">本地</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* When no sub selected: show subcategory summary cards */}
                {!selectedSub && (
                  <div className="space-y-3">
                    {visibleCategories.find(c => c.key === selectedCategory)?.subs.map(sub => (
                      <div
                        key={sub.key}
                        onClick={() => handleSubClick(selectedCategory, sub.key)}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">{sub.label}</span>
                            {sub.comingSoon && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">即将开�?/span>
                            )}
                            {sub.localStorageNote && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">本地存储</span>
                            )}
                            <span className="text-xs text-gray-400">{SOURCE_LABELS[sub.dataSource]}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create button for 自定�?subcategory */}
                {selectedSub && getCurrentSubConfig()?.category === '自定�? && !getCurrentSubConfig()?.comingSoon && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowCreate(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      新建快捷�?
                    </button>
                  </div>
                )}

                {/* Coming Soon State */}
                {selectedSub && getCurrentSubConfig()?.comingSoon && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <Sparkles className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-700">即将开�?/h3>
                    <p className="text-sm text-gray-500 mt-1">该功能正在开发中，敬请期�?/p>
                  </div>
                )}

                {/* LocalStorage Note */}
                {selectedSub && getCurrentSubConfig()?.localStorageNote && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <CloudOff className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-700">数据仅存于本地浏览器，即将升级至云端存储，实现跨设备同步</span>
                  </div>
                )}

                {/* Loading */}
                {selectedSub && loading && !getCurrentSubConfig()?.comingSoon && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">加载�?..</span>
                  </div>
                )}

                {/* Items List */}
                {selectedSub && !loading && !getCurrentSubConfig()?.comingSoon && (
                  <>
                    {filteredItems.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                        <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">暂无内容</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {getCurrentSubConfig()?.dataSource === 'phrase_library'
                            ? '去AI体检站或对应功能页创建内容，保存后自动出现在这里'
                            : '当前没有相关数据'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredItems.map(item => (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-gray-900 text-sm truncate">
                                    {item.title}
                                  </h4>
                                  {item.freshnessStatus === 'expired' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600">
                                      🔴 已过�?
                                    </span>
                                  )}
                                  {item.freshnessStatus === 'expiring' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600">
                                      🟡 即将过期
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    item.source.includes('体检')
                                      ? 'bg-purple-50 text-purple-600'
                                      : item.source === '质检反馈'
                                      ? 'bg-amber-50 text-amber-600'
                                      : item.source === '产品档案'
                                      ? 'bg-teal-50 text-teal-600'
                                      : item.source === '成本记录'
                                      ? 'bg-rose-50 text-rose-600'
                                      : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    <Tag className="w-2.5 h-2.5" />
                                    {item.source}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                                {item.createdAt && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(item.createdAt)}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleCopy(item)}
                                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="复制内容"
                                >
                                  {copiedId === item.id ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                {(item.freshnessStatus === 'expired' || item.freshnessStatus === 'expiring') && (
                                  <button
                                    onClick={() => handleAiRefresh(item)}
                                    className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="AI更新建议"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(item)}
                                  disabled={deleting === item.id}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Create Modal */}
    {showCreate && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">新建快捷�?/h3>
            <button onClick={() => { setShowCreate(false); setCreateError(''); }} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">场景/标题</label>
              <input
                type="text"
                value={createForm.title}
                onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="如：客户催发货怎么�?
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">内容</label>
              <textarea
                value={createForm.content}
                onChange={e => setCreateForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入快捷语内�?.."
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">标签（逗号分隔，可选）</label>
              <input
                type="text"
                value={createForm.tags}
                onChange={e => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="如：催发�?物流"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">有效�?/label>
              <select
                value={createForm.validityDays}
                onChange={e => setCreateForm(prev => ({ ...prev, validityDays: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="30">30�?/option>
                <option value="90">90�?/option>
                <option value="180">180天（默认�?/option>
                <option value="0">永不过期</option>
              </select>
            </div>
            {createError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {createError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
            <button
              onClick={() => { setShowCreate(false); setCreateError(''); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1.5"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              保存
            </button>
          </div>
        </div>
      </div>
    )}

    {/* AI Refresh Suggestion Modal */}
    {refreshItem && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" /> AI更新建议
            </h2>
            <button onClick={() => { setRefreshItem(null); setRefreshSuggestion(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* 原始内容 */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-700 mb-2">原始内容</h4>
              <p className="text-sm text-red-600 font-medium">{refreshItem.title}</p>
              <p className="text-sm text-red-500 mt-1">{refreshItem.summary}</p>
              {refreshItem.freshnessStatus === 'expired' && (
                <span className="inline-block mt-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">已过�?/span>
              )}
              {refreshItem.freshnessStatus === 'expiring' && (
                <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded">即将过期</span>
              )}
            </div>

            {/* AI建议 */}
            {refreshLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">AI正在分析并生成更新建�?..</p>
              </div>
            ) : refreshSuggestion ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-700 mb-2">AI更新建议</h4>
                <p className="text-sm text-green-600 font-medium">{refreshSuggestion.updated_title}</p>
                <p className="text-sm text-green-500 mt-1">{refreshSuggestion.updated_content}</p>
                {refreshSuggestion.update_notes && (
                  <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-600">
                    <strong>更新要点�?/strong>{refreshSuggestion.update_notes}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => { setRefreshItem(null); setRefreshSuggestion(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              忽略
            </button>
            <button
              onClick={handleAdoptRefresh}
              disabled={!refreshSuggestion || refreshLoading}
              className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> 采纳更新
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
