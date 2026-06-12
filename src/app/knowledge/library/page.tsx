'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface LibraryItem {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  tags: string[];
  favorites: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

const categories = [
  { value: 'all', label: '全部' },
  { value: 'concept', label: '概念卡' },
  { value: 'phrase', label: '话术' },
  { value: 'solution', label: '方案' },
  { value: 'rule', label: '规则' },
];

const categoryLabels: Record<string, string> = {
  concept: '概念卡',
  phrase: '话术',
  solution: '方案',
  rule: '规则',
};

const sourceLabels: Record<string, string> = {
  'manual': '手动录入',
  'sop': 'SOP优化',
  'ai': 'AI生成',
};

const mockItems: LibraryItem[] = [
  {
    id: '1',
    title: '客户投诉处理标准话术',
    content: '尊敬的客户，非常抱歉给您带来不便...',
    category: 'phrase',
    source: 'sop',
    tags: ['投诉', '话术', '客服'],
    favorites: 23,
    likes: 45,
    created_at: '2024-01-15',
    updated_at: '2024-01-20',
  },
  {
    id: '2',
    title: '售后服务流程规范',
    content: '1. 客户咨询 -> 2. 问题诊断 -> 3. 解决方案...',
    category: 'rule',
    source: 'manual',
    tags: ['流程', '规范', '售后'],
    favorites: 15,
    likes: 32,
    created_at: '2024-01-18',
    updated_at: '2024-01-22',
  },
  {
    id: '3',
    title: '退换货政策说明',
    content: '本公司支持7天无理由退换货...',
    category: 'concept',
    source: 'manual',
    tags: ['退换货', '政策', '说明'],
    favorites: 8,
    likes: 19,
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
  {
    id: '4',
    title: '客户满意度提升方案',
    content: '通过以下几个方面提升客户满意度...',
    category: 'solution',
    source: 'ai',
    tags: ['满意度', '方案', '客户'],
    favorites: 31,
    likes: 56,
    created_at: '2024-01-22',
    updated_at: '2024-01-25',
  },
  {
    id: '5',
    title: '常见问题解答话术',
    content: 'Q: 产品保修多久？A: 本产品保修3年...',
    category: 'phrase',
    source: 'sop',
    tags: ['FAQ', '话术', '问答'],
    favorites: 17,
    likes: 41,
    created_at: '2024-01-25',
    updated_at: '2024-01-26',
  },
];

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        let query = supabase.from('phrase_library').select('*');
        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          setItems(data as LibraryItem[]);
        } else {
          setItems(mockItems);
        }
      } catch (err) {
        console.error('获取知识库失败:', err);
        setItems(mockItems);
      }
      setLoading(false);
    };

    fetchItems();
  }, []);

  useEffect(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.id] = item.likes;
    });
    setLikeCounts(counts);
  }, [items]);

  const filteredItems = items.filter(item => {
    return selectedCategory === 'all' || item.category === selectedCategory;
  });

  const handleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const handleLike = async (id: string) => {
    const newCounts = { ...likeCounts };
    newCounts[id] = (newCounts[id] || 0) + 1;
    setLikeCounts(newCounts);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await supabase
        .from('phrase_library')
        .update({ likes: newCounts[id] })
        .eq('id', id);
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">我的知识库</h1>
            <p className="text-slate-500 text-sm mt-1">管理和收藏团队知识库内容</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            + 新建知识
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-500">加载中...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="mt-4 text-slate-500">暂无知识库内容</p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                开始添加
              </button>
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {categoryLabels[item.category] || item.category}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        {sourceLabels[item.source] || item.source}
                      </span>
                    </div>
                    <button
                      onClick={() => handleFavorite(item.id)}
                      className={`text-lg transition-colors ${
                        favorites.has(item.id) ? 'text-red-500' : 'text-slate-300 hover:text-red-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={favorites.has(item.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{item.content}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                      <span>创建: {formatDate(item.created_at)}</span>
                      <span>更新: {formatDate(item.updated_at)}</span>
                    </div>
                    <button
                      onClick={() => handleLike(item.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {likeCounts[item.id] || 0}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}