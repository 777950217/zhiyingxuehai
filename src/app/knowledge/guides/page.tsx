'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Guide {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  created_at: string;
}

const categories = [
  { value: 'all', label: '全部' },
  { value: 'return', label: '退换货流程' },
  { value: 'installation', label: '安装投诉处理' },
  { value: 'quality', label: '产品质量问题' },
  { value: 'logistics', label: '物流破损' },
  { value: 'communication', label: '售后沟通话术' },
];

const categoryLabels: Record<string, string> = {
  return: '退换货流程',
  installation: '安装投诉处理',
  quality: '产品质量问题',
  logistics: '物流破损',
  communication: '售后沟通话术',
};

const mockGuides: Guide[] = [
  {
    id: '1',
    title: '七天无理由退换货流程指南',
    content: '第一步：客户申请退货，客服需在24小时内响应...',
    category: 'return',
    tags: ['退货', '流程', '售后'],
    views: 156,
    created_at: '2024-01-15',
  },
  {
    id: '2',
    title: '安装投诉处理标准流程',
    content: '收到安装投诉后，首先安抚客户情绪...',
    category: 'installation',
    tags: ['安装', '投诉', '处理'],
    views: 89,
    created_at: '2024-01-18',
  },
  {
    id: '3',
    title: '产品质量问题处理规范',
    content: '遇到产品质量问题，先确认问题类型...',
    category: 'quality',
    tags: ['质量', '问题', '规范'],
    views: 234,
    created_at: '2024-01-20',
  },
  {
    id: '4',
    title: '物流破损处理流程',
    content: '客户反馈物流破损，需先核实物流信息...',
    category: 'logistics',
    tags: ['物流', '破损', '处理'],
    views: 112,
    created_at: '2024-01-22',
  },
  {
    id: '5',
    title: '售后沟通话术模板',
    content: '面对客户投诉时，保持耐心和专业...',
    category: 'communication',
    tags: ['话术', '沟通', '模板'],
    views: 312,
    created_at: '2024-01-25',
  },
];

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  useEffect(() => {
    const fetchGuides = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        let query = supabase.from('knowledge_guides').select('*');
        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          setGuides(data as Guide[]);
        } else {
          setGuides(mockGuides);
        }
      } catch (err) {
        console.error('获取攻略失败:', err);
        setGuides(mockGuides);
      }
      setLoading(false);
    };

    fetchGuides();
  }, []);

  const filteredGuides = guides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">售后攻略</h1>
          <p className="text-slate-500 text-sm mt-1">精选售后处理流程和沟通技巧，提升服务效率</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索攻略关键词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-500">加载中...</p>
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="mt-4 text-slate-500">暂无相关攻略</p>
            </div>
          ) : (
            filteredGuides.map(guide => (
              <div
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {categoryLabels[guide.category] || guide.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {guide.views}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{guide.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{guide.content}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {guide.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">{formatDate(guide.created_at)}</p>
              </div>
            ))
          )}
        </div>

        {selectedGuide && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {categoryLabels[selectedGuide.category] || selectedGuide.category}
                  </span>
                  <h2 className="text-xl font-semibold text-slate-800 mt-2">{selectedGuide.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {selectedGuide.views} 次浏览
                  </span>
                  <span>{formatDate(selectedGuide.created_at)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedGuide.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedGuide.content}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}