'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Version {
  id: string;
  version: string;
  updated_at: string;
  updated_by: string;
  updated_by_name: string;
  change_note: string;
  content: string;
  is_active: boolean;
}

const mockVersions: Version[] = [
  { id: '1', version: 'v1.2', updated_at: '2024-01-15 10:30:00', updated_by: '1', updated_by_name: '张三', change_note: '更新保修期限说明', content: '尊敬的客户，感谢您购买我们的产品。根据保修政策：\n\n1. 产品自购买之日起享受一年免费保修服务\n2. 保修范围包括产品本身质量问题\n3. 人为损坏不在保修范围内\n4. 保修时请提供购买凭证和产品序列号\n\n如有任何问题，请联系客服热线：400-xxx-xxxx', is_active: true },
  { id: '2', version: 'v1.1', updated_at: '2024-01-10 14:20:00', updated_by: '2', updated_by_name: '李四', change_note: '补充联系方式', content: '尊敬的客户，感谢您购买我们的产品。根据保修政策：\n\n1. 产品自购买之日起享受一年免费保修服务\n2. 保修范围包括产品本身质量问题\n3. 人为损坏不在保修范围内\n4. 保修时请提供购买凭证和产品序列号', is_active: false },
  { id: '3', version: 'v1.0', updated_at: '2024-01-05 09:15:00', updated_by: '1', updated_by_name: '张三', change_note: '初始版本', content: '尊敬的客户，感谢您购买我们的产品。根据保修政策：\n\n1. 产品自购买之日起享受一年免费保修服务\n2. 保修范围包括产品本身质量问题\n3. 人为损坏不在保修范围内', is_active: false },
];

export default function VersionsPage() {
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);

  const guideId = '1';

  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setVersions(mockVersions);
      setSelectedVersion(mockVersions[0]);
      setLoading(false);
    };

    fetchVersions();
  }, [guideId]);

  const handleRestore = (version: Version) => {
    if (version.is_active) {
      alert('这已经是当前生效版本');
      return;
    }

    if (confirm(`确定要将版本 ${version.version} 恢复为当前生效版本吗？`)) {
      alert(`版本 ${version.version} 已恢复为当前生效版本！`);
      setVersions(prev => prev.map(v => ({
        ...v,
        is_active: v.id === version.id
      })));
      setSelectedVersion({ ...version, is_active: true });
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">版本管理</h1>
            <p className="text-slate-500 text-sm mt-1">管理知识文档的版本历史</p>
          </div>
          <a
            href="/team-knowledge/library"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            返回列表
          </a>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-medium text-slate-800">版本历史</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">暂无版本记录</p>
                  </div>
                ) : (
                  versions.map(version => (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedVersion?.id === version.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800">{version.version}</span>
                        {version.is_active && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            当前版本
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">{formatTime(version.updated_at)}</div>
                      <div className="text-sm text-slate-600 mt-1">{version.change_note}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedVersion ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">{selectedVersion.version}</span>
                        {selectedVersion.is_active && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            当前生效版本
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        更新人: {selectedVersion.updated_by_name} | {formatTime(selectedVersion.updated_at)}
                      </p>
                    </div>
                    {!selectedVersion.is_active && (
                      <button
                        onClick={() => handleRestore(selectedVersion)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        恢复为当前版本
                      </button>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-500 mb-1">变更说明</label>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                      {selectedVersion.change_note}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">版本内容</label>
                    <div className="bg-slate-50 rounded-lg p-4 min-h-[200px]">
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedVersion.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">选择一个版本查看</h3>
                <p className="text-sm text-slate-500">从左侧列表选择版本，查看历史版本内容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}