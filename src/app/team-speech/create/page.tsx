'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface GeneratedPhrase {
  id: number;
  content: string;
}

const categories = [
  { value: 'return', label: '退换货' },
  { value: 'installation', label: '安装投诉' },
  { value: 'quality', label: '产品质量' },
  { value: 'logistics', label: '物流破损' },
  { value: 'communication', label: '售后沟通' },
  { value: 'other', label: '其他' },
];

export default function CreatePage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [scenario, setScenario] = useState('');
  const [content, setContent] = useState('');
  const [generatedPhrases, setGeneratedPhrases] = useState<GeneratedPhrase[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<number | null>(null);
  const [saveOption, setSaveOption] = useState<'push' | 'draft'>('draft');

  const handleGenerate = async () => {
    if (!scenario.trim()) return;
    
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setGeneratedPhrases([
      { id: 1, content: `尊敬的客户，非常抱歉给您带来不便！针对${scenario}的问题，我们非常重视，将立即为您处理。请您提供相关订单信息，以便我们更快地为您解决问题。` },
      { id: 2, content: `您好！关于您反馈的${scenario}问题，我们深表歉意。为了更好地帮助您，我需要了解一些详细信息。请问您是否方便提供具体情况描述？我们会尽快给出解决方案。` },
      { id: 3, content: `感谢您的反馈！我们已收到您关于${scenario}的问题。为了确保服务质量，我们会在24小时内与您联系处理。请保持电话畅通，感谢您的理解与支持！` },
    ]);
    
    setIsGenerating(false);
  };

  const handleSelectPhrase = (id: number) => {
    setSelectedPhrase(id);
    const phrase = generatedPhrases.find(p => p.id === id);
    if (phrase) {
      setContent(phrase.content);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !category || !content.trim()) {
      alert('请填写完整信息');
      return;
    }

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.from('phrase_library').insert({
        title,
        content,
        category,
        source: 'ai',
        tags: [category],
        status: saveOption === 'push' ? 'active' : 'draft',
        company_id: 'company_001',
      });

      if (error) throw error;

      alert(saveOption === 'push' ? '话术已保存并推送全队！' : '话术已保存为草稿！');
      setTitle('');
      setCategory('');
      setScenario('');
      setContent('');
      setGeneratedPhrases([]);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">新建话术</h1>
          <p className="text-slate-500 text-sm mt-1">创建团队共享的AI话术</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">话术标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入话术标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择分类</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">适用场景</label>
              <input
                type="text"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入场景关键词，如：客户投诉物流破损"
              />
            </div>

            {scenario && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-slate-400 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    AI生成中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI辅助生成话术
                  </>
                )}
              </button>
            )}

            {generatedPhrases.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">AI生成结果（点击选择）</label>
                <div className="space-y-3">
                  {generatedPhrases.map(phrase => (
                    <div
                      key={phrase.id}
                      onClick={() => handleSelectPhrase(phrase.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPhrase === phrase.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">方案{phrase.id}</span>
                        {selectedPhrase === phrase.id && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">已选择</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{phrase.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">正文内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-40 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="输入话术正文内容..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">保存选项</h3>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              saveOption === 'push' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="saveOption"
                value="push"
                checked={saveOption === 'push'}
                onChange={(e) => setSaveOption(e.target.value as 'push' | 'draft')}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-slate-800">推送全队</div>
                <div className="text-sm text-slate-500">保存后立即推送给所有客服</div>
              </div>
            </label>
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              saveOption === 'draft' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="saveOption"
                value="draft"
                checked={saveOption === 'draft'}
                onChange={(e) => setSaveOption(e.target.value as 'push' | 'draft')}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-slate-800">仅保存草稿</div>
                <div className="text-sm text-slate-500">保存为草稿，稍后再编辑</div>
              </div>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {saveOption === 'push' ? '保存并推送' : '保存草稿'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}