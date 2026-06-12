'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Phrase {
  id: string;
  title: string;
  category: string;
  version: number;
  created_by: string;
  updated_at: string;
  status: string;
  content: string;
}

const categories = [
  { value: 'all', label: '全部' },
  { value: 'return', label: '退换货' },
  { value: 'installation', label: '安装投诉' },
  { value: 'quality', label: '产品质量' },
  { value: 'logistics', label: '物流破损' },
  { value: 'communication', label: '售后沟通' },
  { value: 'other', label: '其他' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '生效', color: 'text-green-700', bg: 'bg-green-100' },
  draft: { label: '草稿', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  offline: { label: '已下线', color: 'text-slate-700', bg: 'bg-slate-100' },
};

const categoryLabels: Record<string, string> = {
  return: '退换货',
  installation: '安装投诉',
  quality: '产品质量',
  logistics: '物流破损',
  communication: '售后沟通',
  other: '其他',
};

const mockPhrases: Phrase[] = [
  { id: '1', title: '退换货标准话术', category: 'return', version: 2, created_by: '张三', updated_at: '2024-01-15', status: 'active', content: '尊敬的客户，非常抱歉给您带来不便...' },
  { id: '2', title: '安装投诉处理话术', category: 'installation', version: 1, created_by: '李四', updated_at: '2024-01-14', status: 'active', content: '收到您的投诉，我们会尽快处理...' },
  { id: '3', title: '产品质量问题回复', category: 'quality', version: 3, created_by: '王五', updated_at: '2024-01-13', status: 'active', content: '关于产品质量问题，我们深表歉意...' },
  { id: '4', title: '物流破损处理流程', category: 'logistics', version: 1, created_by: '赵六', updated_at: '2024-01-12', status: 'draft', content: '物流破损处理流程说明...' },
  { id: '5', title: '售后沟通技巧', category: 'communication', version: 2, created_by: '钱七', updated_at: '2024-01-11', status: 'offline', content: '售后沟通技巧分享...' },
];

export default function LibraryPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhrases = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('phrase_library').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setPhrases(data as Phrase[]);
        } else {
          setPhrases(mockPhrases);
        }
      } catch (err) {
        console.error('获取话术失败:', err);
        setPhrases(mockPhrases);
      }
      setLoading(false);
    };

    fetchPhrases();
  }, []);

  const filteredPhrases = phrases.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">话术库</h1>
            <p className="text-slate-500 text-sm mt-1">团队共享AI话术管理</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            + 新建话术
          </button>
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
                  placeholder="搜索话术标题..."
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[{ value: 'all', label: '全部' }, { value: 'active', label: '生效' }, { value: 'draft', label: '草稿' }, { value: 'offline', label: '已下线' }].map(status => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === status.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">话术标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">分类</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">版本</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">创建人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">更新时间</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-slate-500">加载中...</p>
                  </td>
                </tr>
              ) : filteredPhrases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-slate-500">暂无话术</p>
                  </td>
                </tr>
              ) : (
                filteredPhrases.map(phrase => {
                  const status = statusConfig[phrase.status] || { label: phrase.status, color: 'text-slate-700', bg: 'bg-slate-100' };
                  return (
                    <tr key={phrase.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-800">{phrase.title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {categoryLabels[phrase.category] || phrase.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-slate-600">v{phrase.version}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">
                            {phrase.created_by[0]}
                          </div>
                          <span className="text-sm text-slate-700">{phrase.created_by}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">{phrase.updated_at}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedPhrase(phrase)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedPhrase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mr-2">
                    {categoryLabels[selectedPhrase.category] || selectedPhrase.category}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(statusConfig[selectedPhrase.status] || { bg: 'bg-slate-100', color: 'text-slate-700' }).bg} ${(statusConfig[selectedPhrase.status] || { bg: 'bg-slate-100', color: 'text-slate-700' }).color}`}>
                    {(statusConfig[selectedPhrase.status] || { label: selectedPhrase.status }).label}
                  </span>
                  <h2 className="text-xl font-semibold text-slate-800 mt-2">{selectedPhrase.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedPhrase(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
                  <span>版本: v{selectedPhrase.version}</span>
                  <span>创建人: {selectedPhrase.created_by}</span>
                  <span>更新时间: {selectedPhrase.updated_at}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedPhrase.content}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}