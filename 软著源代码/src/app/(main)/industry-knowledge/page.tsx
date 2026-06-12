'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, BookOpen, Heart, Download, Plus, Award, Star, Filter, TrendingUp, ChevronLeft, ChevronRight, X, Sparkles, ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';

/* ========== 类型定义 ========== */

interface IndustryItem {
  id: string;
  source_user_id: string;
  source_company_id: string | null;
  category: string;
  title: string;
  content: string;
  tags: string[];
  usage_count: number;
  like_count: number;
  status: string;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  contribution_count: number;
  display_name: string;
}

interface ContributionStats {
  contributed_count: number;
  adopted_count: number;
  liked_count: number;
  score: number;
  level: string;
  level_color: string;
}

interface MyKnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[] | null;
}

/* ========== 常量 ========== */

const CATEGORIES = [
  { value: '话术', label: '话术精�?, icon: '💬', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'SOP', label: 'SOP流程', icon: '📋', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: '攻略', label: '售后攻略', icon: '🛠�?, color: 'bg-green-50 text-green-700 border-green-200' },
  { value: '模板', label: '管理模板', icon: '📄', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: '案例', label: '实战案例', icon: '💡', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

/* ========== 主组�?========== */

export default function IndustryKnowledgePage() {
  const { profile, authFetch } = useAuth();
  const companyId = profile?.companyId || '';

  const [items, setItems] = useState<IndustryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [myKnowledge, setMyKnowledge] = useState<MyKnowledgeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [contributeCategory, setContributeCategory] = useState('话术');

  // 加载行业知识�?
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (selectedCategory) params.set('category', selectedCategory);
      if (search) params.set('search', search);

      const res = await authFetch(`/api/industry-knowledge?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setLeaderboard(data.leaderboard || []);
      }
    } catch {
      toast.error('加载行业知识库失�?);
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, pageSize, selectedCategory, search]);

  // 加载贡献统计
  const loadStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/industry-knowledge/contribution-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // 加载我的知识库（贡献时选择�?
  const loadMyKnowledge = useCallback(async () => {
    try {
      const res = await authFetch(`/api/phrases?company_id=${companyId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setMyKnowledge((data.phrases || data || []).slice(0, 50));
      }
    } catch { /* ignore */ }
  }, [authFetch, companyId]);

  useEffect(() => {
    if (showContribute) loadMyKnowledge();
  }, [showContribute, loadMyKnowledge]);

  // 搜索
  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  // 点赞
  const handleLike = async (id: string) => {
    try {
      const res = await authFetch('/api/industry-knowledge/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_id: id }),
      });
      if (res.ok) {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, like_count: item.like_count + 1 } : item
        ));
        toast.success('点赞成功');
      }
    } catch {
      toast.error('点赞失败');
    }
  };

  // 采纳
  const handleAdopt = async (id: string) => {
    try {
      const res = await authFetch('/api/industry-knowledge/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_id: id }),
      });
      if (res.ok) {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, usage_count: item.usage_count + 1 } : item
        ));
        toast.success('已采纳到我的知识�?);
      } else {
        const data = await res.json();
        toast.error(data.error || '采纳失败');
      }
    } catch {
      toast.error('采纳失败');
    }
  };

  // 贡献选中�?
  const handleContribute = async () => {
    if (selectedItems.size === 0) {
      toast.error('请选择要贡献的条目');
      return;
    }

    try {
      let successCount = 0;
      for (const itemId of selectedItems) {
        const item = myKnowledge.find(k => k.id === itemId);
        if (!item) continue;

        const res = await authFetch('/api/industry-knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: contributeCategory,
            title: item.title,
            content: item.content,
            tags: item.tags || [],
          }),
        });
        if (res.ok) successCount++;
      }

      toast.success(`成功贡献 ${successCount} 条知识`);
      setSelectedItems(new Set());
      setShowContribute(false);
      loadItems();
      loadStats();
    } catch {
      toast.error('贡献失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-blue-600" />
              行业知识�?
            </h1>
            <p className="text-sm text-gray-500 mt-1">汇聚全行业智慧，让经验流动起�?/p>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="text-gray-500">我的贡献等级:</span>
                <span className={`font-bold ${stats.level_color}`}>{stats.level}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">贡献 {stats.contributed_count} �?/span>
              </div>
            )}
            <Button onClick={() => setShowContribute(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" /> 贡献知识
            </Button>
          </div>
        </div>

        {/* 搜索 + 分类 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-1">
            <Input
              placeholder="搜索知识..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-md"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={!selectedCategory ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedCategory(''); setPage(1); }}
            >
              全部
            </Button>
            {CATEGORIES.map(cat => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedCategory(cat.value); setPage(1); }}
                className="text-xs"
              >
                {cat.icon} {cat.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 主内容区 */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12 text-gray-400">加载�?..</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无知识条目</p>
                <p className="text-sm text-gray-400 mt-1">成为第一个贡献者吧�?/p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => {
                  const catConfig = CATEGORIES.find(c => c.value === item.category);
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className={`${catConfig?.color || 'bg-gray-50 text-gray-700 border-gray-200'} text-xs`}>
                          {catConfig?.icon} {item.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <ThumbsUp className="w-3 h-3" /> {item.like_count}
                          <Download className="w-3 h-3 ml-1" /> {item.usage_count}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2 line-clamp-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">{item.content}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1 mb-3 flex-wrap">
                          {item.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleLike(item.id)} className="text-xs">
                          <Heart className="w-3 h-3 mr-1" /> 点赞
                        </Button>
                        <Button size="sm" onClick={() => handleAdopt(item.id)} className="text-xs bg-blue-600 hover:bg-blue-700">
                          <Download className="w-3 h-3 mr-1" /> 采纳
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* 侧边栏：排行�?+ 我的统计 */}
          <div className="space-y-4">
            {/* 贡献统计 */}
            {stats && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> 我的贡献
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">贡献等级</span>
                    <span className={`font-bold ${stats.level_color}`}>{stats.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">贡献条目</span>
                    <span className="font-medium">{stats.contributed_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">被采纳次�?/span>
                    <span className="font-medium">{stats.adopted_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">获赞次数</span>
                    <span className="font-medium">{stats.liked_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">积分</span>
                    <span className="font-bold text-blue-600">{stats.score}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 排行�?*/}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" /> 贡献排行
              </h3>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无排行数据</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.user_id} className="flex items-center gap-3 text-sm">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-600' :
                        idx === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-gray-700">{entry.display_name}</span>
                      <span className="text-gray-500">{entry.contribution_count}�?/span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 贡献弹窗 */}
        {showContribute && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" /> 贡献知识到行业库
                </h2>
                <button onClick={() => { setShowContribute(false); setSelectedItems(new Set()); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 border-b">
                <label className="text-sm font-medium text-gray-700 mb-2 block">选择贡献分类</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <Button
                      key={cat.value}
                      variant={contributeCategory === cat.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContributeCategory(cat.value)}
                    >
                      {cat.icon} {cat.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">贡献时会自动脱敏公司名和人名信息</p>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-sm text-gray-500 mb-3">从我的知识库中选择要贡献的条目（已�?{selectedItems.size} 项）�?/p>
                {myKnowledge.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">暂无可贡献的知识条目</p>
                ) : (
                  <div className="space-y-2">
                    {myKnowledge.map(item => (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedItems.has(item.id) ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const next = new Set(selectedItems);
                            if (e.target.checked) next.add(item.id);
                            else next.delete(item.id);
                            setSelectedItems(next);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </div>
                          <p className="font-medium text-gray-800 text-sm truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.content}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowContribute(false); setSelectedItems(new Set()); }}>
                  取消
                </Button>
                <Button onClick={handleContribute} disabled={selectedItems.size === 0} className="bg-blue-600 hover:bg-blue-700">
                  确认贡献 ({selectedItems.size})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
