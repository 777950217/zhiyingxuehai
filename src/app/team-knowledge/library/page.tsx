'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface KnowledgeGuide {
  id: string;
  title: string;
  category: string;
  version: string;
  updated_by: string;
  updated_by_name: string;
  updated_at: string;
  status: string;
  permission_level: string;
  content: string;
}

const categoryLabels: Record<string, string> = {
  'product': '产品知识',
  'policy': '售后政策',
  'installation': '安装规范',
  'logistics': '物流规则',
  'platform': '平台规则',
  'other': '其他',
};

const permissionLabels: Record<string, { label: string; icon: string }> = {
  'admin': { label: '管理员', icon: '👑' },
  'manager': { label: '主管', icon: '✏️' },
  'agent': { label: '客服', icon: '👁' },
};

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  'active': { label: '生效', color: 'text-green-700', bg: 'bg-green-100' },
  'draft': { label: '草稿', color: 'text-yellow-700', bg: 'bg-yellow-100' },
};

const mockGuides: KnowledgeGuide[] = [
  { id: '1', title: '产品保修政策说明', category: 'policy', version: 'v1.2', updated_by: '1', updated_by_name: '张三', updated_at: '2024-01-15 10:30:00', status: 'active', permission_level: 'manager', content: '详细的产品保修政策说明...' },
  { id: '2', title: '安装流程规范', category: 'installation', version: 'v2.0', updated_by: '2', updated_by_name: '李四', updated_at: '2024-01-14 14:20:00', status: 'active', permission_level: 'agent', content: '安装流程详细步骤...' },
  { id: '3', title: '平台售后规则', category: 'platform', version: 'v1.0', updated_by: '1', updated_by_name: '张三', updated_at: '2024-01-10 09:15:00', status: 'draft', permission_level: 'admin', content: '平台售后相关规则...' },
  { id: '4', title: '物流配送指南', category: 'logistics', version: 'v1.1', updated_by: '3', updated_by_name: '王五', updated_at: '2024-01-12 16:45:00', status: 'active', permission_level: 'agent', content: '物流配送相关说明...' },
  { id: '5', title: '产品功能介绍', category: 'product', version: 'v3.0', updated_by: '2', updated_by_name: '李四', updated_at: '2024-01-16 11:00:00', status: 'active', permission_level: 'manager', content: '产品功能详细介绍...' },
];

export default function LibraryPage() {
  const [guides, setGuides] = useState<KnowledgeGuide[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGuide, setSelectedGuide] = useState<KnowledgeGuide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuides = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('knowledge_guides').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setGuides(data as KnowledgeGuide[]);
        } else {
          setGuides(mockGuides);
        }
      } catch (err) {
        console.error('获取知识库失败:', err);
        setGuides(mockGuides);
      }
      setLoading(false);
    };

    fetchGuides();
  }, []);

  const filteredGuides = guides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || guide.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">知识库</h1>
            <p className="text-slate-500 text-sm mt-1">管理团队共享的知识文档</p>
          </div>
          <a
            href="/team-knowledge/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建知识
          </a>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索关键词..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部分类</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="active">生效</option>
                <option value="draft">草稿</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">标题</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">分类</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">版本号</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">权限</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">更新人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">更新时间</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                    </td>
                  </tr>
                ) : filteredGuides.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-500">暂无知识文档</p>
                    </td>
                  </tr>
                ) : (
                  filteredGuides.map(guide => {
                    const status = statusLabels[guide.status];
                    const permission = permissionLabels[guide.permission_level];
                    return (
                      <tr key={guide.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-800 cursor-pointer hover:text-blue-600" onClick={() => setSelectedGuide(guide)}>
                            {guide.title}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                            {categoryLabels[guide.category] || guide.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-slate-600 font-mono">{guide.version}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-slate-600">
                            {permission?.icon} {permission?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">{guide.updated_by_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">{formatTime(guide.updated_at)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedGuide(guide)}
                              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              查看
                            </button>
                            <a
                              href={`/team-knowledge/create?id=${guide.id}`}
                              className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              编辑
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedGuide && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {categoryLabels[selectedGuide.category]}
                    </span>
                    <span className="text-sm text-slate-500">{selectedGuide.version}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800">{selectedGuide.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedGuide.content}</p>
                </div>
              </div>
              <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  权限: {permissionLabels[selectedGuide.permission_level]?.icon} {permissionLabels[selectedGuide.permission_level]?.label} | 
                  更新人: {selectedGuide.updated_by_name} | 
                  更新时间: {formatTime(selectedGuide.updated_at)}
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/team-knowledge/create?id=${selectedGuide.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    编辑
                  </a>
                  <a
                    href={`/team-knowledge/versions?id=${selectedGuide.id}`}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                  >
                    版本管理
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}