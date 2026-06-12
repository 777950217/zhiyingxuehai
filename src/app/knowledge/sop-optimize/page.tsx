'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface OptimizationResult {
  original: string;
  optimized: string;
  suggestions: string[];
  category: string;
}

const optimizationTypes = [
  {
    id: 'phrase',
    title: '快捷话术导入',
    description: '上传或粘贴客服话术文本',
    features: ['AI自动分类', '提取关键句', '优化建议'],
    icon: 'message-square',
  },
  {
    id: 'management',
    title: '管理方案导入',
    description: '上传或粘贴管理方案文档',
    features: ['萃取流程步骤', '责任节点', '质检点'],
    icon: 'file-text',
  },
  {
    id: 'auto',
    title: 'AI自动优化萃取',
    description: '对已有话术/方案一键优化',
    features: ['智能分析', '自动优化', '写入知识库'],
    icon: 'sparkles',
  },
];

const mockOptimizationResult: OptimizationResult = {
  original: '尊敬的客户，非常抱歉给您带来不便。关于您反馈的问题，我们会尽快处理，请您耐心等待。',
  optimized: '尊敬的客户，非常抱歉给您带来不便！针对您反馈的问题，我们已加急处理，请您放心等待处理结果。',
  suggestions: [
    '添加感叹号增强语气真诚度',
    '将"会尽快处理"优化为"已加急处理"，体现行动感',
    '添加"放心"一词增强客户信任感',
    '明确告知客户会有处理结果反馈',
  ],
  category: 'phrase',
};

export default function SOPOptimizePage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setInputContent('');
    setResult(null);
    setShowResult(false);
  };

  const handleOptimize = async () => {
    if (!inputContent.trim()) return;
    
    setIsOptimizing(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setResult(mockOptimizationResult);
    setShowResult(true);
    setIsOptimizing(false);
  };

  const handleSaveToLibrary = async () => {
    if (!result) return;

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.from('phrase_library').insert({
        title: 'AI优化话术',
        content: result.optimized,
        category: result.category === 'phrase' ? 'phrase' : 'solution',
        source: 'ai',
        tags: ['AI优化', '话术'],
        company_id: 'company_001',
      });

      if (error) throw error;

      alert('已保存到知识库！');
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'message-square':
        return (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'file-text':
        return (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'sparkles':
        return (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">SOP优化</h1>
          <p className="text-slate-500 text-sm mt-1">AI驱动的话术与方案智能优化工具</p>
        </div>

        {!selectedType ? (
          <div className="grid md:grid-cols-3 gap-6">
            {optimizationTypes.map(type => (
              <div
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                  {getIcon(type.icon)}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{type.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{type.description}</p>
                <div className="flex flex-wrap gap-2">
                  {type.features.map((feature, index) => (
                    <span key={index} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b">
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回
              </button>
              <h2 className="text-lg font-semibold text-slate-800">
                {optimizationTypes.find(t => t.id === selectedType)?.title}
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {selectedType === 'phrase' ? '话术文本' : selectedType === 'management' ? '方案文档' : '输入内容'}
                </label>
                <textarea
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="请粘贴或输入需要优化的文本内容..."
                  className="w-full h-40 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleOptimize}
                  disabled={!inputContent.trim() || isOptimizing}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      优化中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI优化
                    </>
                  )}
                </button>
                <button className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  上传文件
                </button>
              </div>
            </div>

            {showResult && result && (
              <div className="border-t">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">优化结果预览</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">原文</span>
                        <span className="text-xs text-slate-400">{result.original.length} 字</span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{result.original}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">优化后</span>
                        <span className="text-xs text-slate-400">{result.optimized.length} 字</span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{result.optimized}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4 mb-6">
                    <h4 className="font-medium text-amber-800 mb-3">优化建议</h4>
                    <ul className="space-y-2">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                          <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveToLibrary}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      保存到知识库
                    </button>
                    <button
                      onClick={() => {
                        setShowResult(false);
                        setResult(null);
                      }}
                      className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      重新优化
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}