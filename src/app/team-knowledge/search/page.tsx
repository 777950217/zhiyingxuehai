'use client';

import { useState } from 'react';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  snippet: string;
  score: number;
}

const mockResults: SearchResult[] = [
  { id: '1', title: '产品保修政策说明', category: '售后政策', snippet: '根据保修政策，产品自购买之日起享受一年免费保修服务，保修范围包括产品本身质量问题。人为损坏不在保修范围内。', score: 95 },
  { id: '2', title: '平台售后规则', category: '平台规则', snippet: '平台售后规则规定，客户在收到商品后7天内可以申请无理由退换货。请确保商品完好无损并保留原始包装。', score: 88 },
  { id: '3', title: '物流配送指南', category: '物流规则', snippet: '物流配送通常需要3-5个工作日，偏远地区可能需要更长时间。如有延迟，请联系客服查询物流信息。', score: 72 },
];

const mockSummary = `根据知识库检索，关于您的问题"保修政策"，以下是关键信息：

**保修期限**：产品自购买之日起享受一年免费保修服务。

**保修范围**：包括产品本身质量问题，人为损坏不在保修范围内。

**保修流程**：保修时请提供购买凭证和产品序列号，联系客服热线：400-xxx-xxxx。

**退换货政策**：客户在收到商品后7天内可以申请无理由退换货，需确保商品完好无损并保留原始包装。

如需更详细的信息，请查看相关知识文档。`;

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');

  const categoryLabels: Record<string, string> = {
    'product': '产品知识',
    'policy': '售后政策',
    'installation': '安装规范',
    'logistics': '物流规则',
    'platform': '平台规则',
    'other': '其他',
  };

  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">$1</mark>');
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSummary('');

    await new Promise(resolve => setTimeout(resolve, 2000));

    setResults(mockResults);
    setSummary(mockSummary);
    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleFeedback = () => {
    if (!feedbackReason.trim()) {
      alert('请选择反馈原因');
      return;
    }
    alert('感谢您的反馈！我们会尽快处理。');
    setShowFeedback(false);
    setFeedbackReason('');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">AI智能搜索</h1>
          <p className="text-slate-500 text-sm mt-1">输入问题，AI帮您从知识库中查找答案</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的问题，例如：保修政策是什么？"
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 flex items-center gap-2"
            >
              {isSearching ? (
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  搜索
                </>
              )}
            </button>
          </div>
        </div>

        {isSearching ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">AI正在检索知识库...</h3>
            <p className="text-sm text-slate-500">请稍候，我们正在分析您的问题并查找相关知识</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-6">
            {summary && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">AI总结答案</h3>
                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightKeyword(summary, query) }}></div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200 flex items-center justify-between">
                  <span className="text-sm text-slate-500">AI已根据知识库内容为您整理答案</span>
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                    纠错反馈
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">
                  相关知识文档 <span className="text-slate-400 font-normal">（共 {results.length} 条）</span>
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {results.map((result, index) => (
                  <div key={result.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-slate-800 cursor-pointer hover:text-blue-600">
                            {result.title}
                          </h4>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {categoryLabels[result.category] || result.category}
                          </span>
                          <span className="text-xs text-slate-400">匹配度: {result.score}%</span>
                        </div>
                        <p className="text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: highlightKeyword(result.snippet, query) }}></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : query ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">未找到相关结果</h3>
            <p className="text-sm text-slate-500">请尝试使用其他关键词搜索，或联系管理员添加相关知识文档</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">开始搜索</h3>
            <p className="text-sm text-slate-500">在上方输入框中输入您的问题，AI将帮您从知识库中查找答案</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">保修政策</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">安装规范</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">物流配送</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">平台规则</span>
            </div>
          </div>
        )}

        {showFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-slate-800">反馈搜索结果</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">请告诉我们搜索结果有什么问题：</p>
                <div className="space-y-2">
                  {['答案不准确', '未找到相关内容', '结果重复', '其他问题'].map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                        feedbackReason === reason ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedback"
                        value={reason}
                        checked={feedbackReason === reason}
                        onChange={(e) => setFeedbackReason(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-slate-700">{reason}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleFeedback}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    提交反馈
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}