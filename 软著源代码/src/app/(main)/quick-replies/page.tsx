'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Search, Plus, Copy, Trash2, X, BookOpen, Check, Loader2, MessageSquare } from 'lucide-react';

const CATEGORY_TABS = [
  { key: '全部', label: '全部' },
  { key: '话术体检', label: '话术体检' },
  { key: 'SOP体检', label: 'SOP体检' },
  { key: '案例体检', label: '案例体检' },
  { key: '质检体检', label: '质检体检' },
  { key: '方案体检', label: '方案体检' },
  { key: '售后攻略', label: '售后攻略' },
  { key: '自定�?, label: '自定�? },
];

const CATEGORY_COLORS: Record<string, string> = {
  '话术体检': 'bg-blue-100 text-blue-700',
  'SOP体检': 'bg-purple-100 text-purple-700',
  '案例体检': 'bg-amber-100 text-amber-700',
  '质检体检': 'bg-rose-100 text-rose-700',
  '方案体检': 'bg-teal-100 text-teal-700',
  '售后攻略': 'bg-indigo-100 text-indigo-700',
  '自定�?: 'bg-gray-100 text-gray-700',
};

interface PhraseItem {
  id: string;
  category: string;
  content: string;
  question?: string | null;
  answer?: string | null;
  scene?: string | null;
  tags?: string | null;
  is_preset: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export default function QuickRepliesPage() {
  const { authFetch, profile } = useAuth();
  const [items, setItems] = useState<PhraseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 新建弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', category: '自定�? });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (profile?.companyId) params.set('company_id', profile.companyId);
      if (activeTab !== '全部') params.set('category', activeTab);
      const res = await authFetch(`/api/phrases?${params.toString()}`);
      if (!res.ok) throw new Error('获取失败');
      const data = await res.json();
      // 只看用户自建�?
      const userItems = (data.data || []).filter((p: PhraseItem) => !p.is_preset);
      setItems(userItems);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, profile?.companyId, activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.content?.toLowerCase().includes(q)) ||
      (item.question?.toLowerCase().includes(q)) ||
      (item.scene?.toLowerCase().includes(q)) ||
      (item.tags?.toLowerCase().includes(q))
    );
  });

  const handleCopy = async (item: PhraseItem) => {
    const text = item.answer || item.content;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条快捷语？')) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/phrases?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      setCreateError('标题和内容不能为�?);
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
          category: createForm.category,
          content: createForm.content,
          question: createForm.title,
          answer: createForm.content,
          scene: `快捷�?- ${createForm.category}`,
          tags: `${createForm.category},快捷语`,
          is_preset: false,
          created_by: profile?.id,
        }),
      });
      if (!res.ok) throw new Error();
      setShowCreate(false);
      setCreateForm({ title: '', content: '', category: '自定�? });
      fetchItems();
    } catch {
      setCreateError('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的快捷�?/h1>
            <p className="text-sm text-gray-500 mt-1">AI体检和售后攻略产出的快捷话术，一键复制到聊天窗口</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" /> 新建快捷�?
          </button>
        </div>

        {/* ─── Search ─── */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索快捷语内�?.."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Content ─── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">加载�?..</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-2">
              {searchQuery ? '没有找到匹配的快捷语' : '还没有快捷语'}
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mb-4">
              {searchQuery
                ? '换个关键词试�?
                : '去AI体检站分析话术、在售后攻略创建攻略，产出会自动存到这里'}
            </p>
            {!searchQuery && (
              <div className="flex gap-3">
                <a
                  href="/ai-checkup/speech"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  去话术体检 �?
                </a>
                <a
                  href="/after-sales-guide"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  去售后攻�?�?
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
              >
                {/* 标签�?*/}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}>
                    {item.category}
                  </span>
                  {item.scene && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[160px]">{item.scene}</span>
                  )}
                </div>

                {/* 内容预览 */}
                <p className="text-sm text-gray-800 line-clamp-3 mb-3 leading-relaxed">
                  {item.answer || item.content}
                </p>

                {/* 原始问题（如果有�?*/}
                {item.question && (
                  <p className="text-xs text-gray-400 line-clamp-1 mb-3">
                    原始输入：{item.question}
                  </p>
                )}

                {/* 底部操作 */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-300">{formatDate(item.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(item)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition"
                      title="复制内容"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                      title="删除"
                    >
                      {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Count ─── */}
        {!loading && filteredItems.length > 0 && (
          <p className="text-center text-xs text-gray-300 mt-6">
            �?{filteredItems.length} 条快捷语
          </p>
        )}
      </div>

      {/* ─── 创建弹窗 ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">新建快捷�?/h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-md">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="给这条快捷语起个名字"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* 分类 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={createForm.category}
                  onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="自定�?>自定�?/option>
                  <option value="话术体检">话术体检</option>
                  <option value="SOP体检">SOP体检</option>
                  <option value="案例体检">案例体检</option>
                  <option value="质检体检">质检体检</option>
                  <option value="方案体检">方案体检</option>
                  <option value="售后攻略">售后攻略</option>
                </select>
              </div>
              {/* 内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea
                  value={createForm.content}
                  onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="输入快捷语内容，如客户问XXX时回�?.."
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存�?/> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
