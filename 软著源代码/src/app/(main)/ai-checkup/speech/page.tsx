'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAiCheckup } from '@/hooks/use-ai-checkup';
import { useAuth } from '@/lib/auth-context';
import { loadProductProfile, buildProductContext, type ProductProfile } from '@/lib/product-profile-helper';
import Link from 'next/link';
import { Package, ArrowRight, Download, Upload, Check, Loader2 } from 'lucide-react';
import { downloadCheckupTemplate, importCheckupSheet } from '@/lib/checkup-template-helper';

interface SpeechChange {
  type: string;
  from: string;
  to: string;
  reason: string;
}

interface SpeechResult {
  original: string;
  optimized: string;
  changes: SpeechChange[];
}

const MODE_OPTIONS = [
  { value: 'eq', label: '高情商优化模�?, desc: '改语气、软化表达、提升共情、增强说服力', color: 'bg-blue-50 border-blue-300 text-blue-800' },
  { value: 'risk', label: '风控净化模�?, desc: '扫描敏感词、违规引导词，自动替换合规话�?, color: 'bg-red-50 border-red-300 text-red-800' },
  { value: 'all', label: '全能模式', desc: '同时优化语气+规避风控', color: 'bg-purple-50 border-purple-300 text-purple-800' },
];

/* ─── 三维框架 Mock 数据 ─── */
const MODE_BENCHMARKS: Record<string, { name: string; metrics: { label: string; benchmark: string; desc: string }[] }> = {
  eq: {
    name: '高情商优化模�?,
    metrics: [
      { label: '共情表达�?, benchmark: '�?0%', desc: '话术中包含共�?理解/道歉的比�? },
      { label: '语气软化�?, benchmark: '�?5%', desc: '生硬措辞→柔和表达的转化�? },
      { label: '客户好感�?, benchmark: '�?5%', desc: '优化后话术的客户接受度评�? },
    ],
  },
  risk: {
    name: '风控净化模�?,
    metrics: [
      { label: '违禁词清�?, benchmark: '100%', desc: '敏感�?违规引导词全部替�? },
      { label: '风控合规�?, benchmark: '�?5%', desc: '话术符合平台规则的比�? },
      { label: '处罚风险降级', benchmark: '0�?, desc: '使用优化话术后的平台处罚次数' },
    ],
  },
  all: {
    name: '全能模式',
    metrics: [
      { label: '共情表达�?, benchmark: '�?0%', desc: '话术中包含共情的比例' },
      { label: '风控合规�?, benchmark: '�?5%', desc: '话术符合平台规则的比�? },
      { label: '综合优化�?, benchmark: '�?5%', desc: '语气+风控双达标的比例' },
    ],
  },
};

const REVIEW_QUESTIONS = [
  '1. 哪些话术未达到评分基准？主要原因是什么？',
  '2. 客户对优化后话术的反馈如何？有没有更差的情况�?,
  '3. 风控替换后是否影响了表达的自然度�?,
  '4. 哪些类型的话术最难优化？瓶颈在哪�?,
  '5. 话术优化后，转化�?客诉率有没有变化�?,
  '6. 是否存在批量优化后风格不一致的问题�?,
  '7. 下次提交前，能否先自查哪些话术需要优化？',
  '8. 有没有话术是AI无法优化、必须人工调整的�?,
];

function parseResults(raw: string): SpeechResult[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* ignore */ }
  return [];
}

export default function SpeechCheckupPage() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('eq');
  const { loading, result, error, usageCount, limitReached, startCheckup, reset } = useAiCheckup();
  const { profile, authFetch } = useAuth();
  const [productProfile, setProductProfile] = useState<ProductProfile | null>(null);
  const [expandedReview, setExpandedReview] = useState<Record<number, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => { setProductProfile(loadProductProfile()); }, []);

  const parsed = result ? parseResults(result) : [];
  const benchmark = MODE_BENCHMARKS[mode];

  const handleStart = () => {
    if (!input.trim()) return;
    const ctx = productProfile ? buildProductContext(productProfile) : null;
    startCheckup('speech', input, mode, ctx, profile?.role || 'personal_user');
  };

  const handleSave = useCallback(async () => {
    if (!profile?.id || !parsed.length) return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const modeLabel = MODE_OPTIONS.find(o => o.value === mode)?.label || '话术体检';
      const optimizedText = parsed.map((item, i) => `【第${i + 1}条】\n原文: ${item.original}\n优化: ${item.optimized}${
        item.changes?.length ? '\n变更: ' + item.changes.map(c => `${c.from}�?{c.to}(${c.reason})`).join('; ') : ''
      }`).join('\n\n');

      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.companyId || null,
          category: '话术体检',
          content: optimizedText,
          question: input,
          answer: optimizedText,
          scene: `话术体检 - ${modeLabel}`,
          tags: [mode, '话术体检'].join(','),
          detail: { mode },
          is_preset: false,
          created_by: profile.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '保存失败');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : '保存失败');
    }
  }, [profile, parsed, input, mode]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🗣�?话术体检</h1>
        <p className="text-lg text-gray-500 mt-1">让你的话术更好听、更安全</p>
        <p className="text-base text-gray-400 mt-1">批量导入快捷语，AI自动优化语气+规避平台风控</p>
        {productProfile && productProfile.brand && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 border border-blue-200">
              <Package className="w-3.5 h-3.5" />
              基于{productProfile.brand}{productProfile.category}优化
            </div>
            <Link href="/product-profile-personal" className="text-xs text-gray-400 hover:text-blue-600">修改</Link>
          </div>
        )}
      </div>

      {/* ══�?🎯 目标板块：评分基�?══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 评分基准</h2>
        <p className="text-base text-gray-500 mb-4">{benchmark.name}的核心评分标准，你的话术将按此标准体检</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {benchmark.metrics.map((m, i) => (
            <div key={i} className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50">
              <div className="text-base font-bold text-gray-800">{m.label}</div>
              <div className="text-3xl font-black text-blue-700 mt-1">{m.benchmark}</div>
              <div className="text-sm text-gray-500 mt-1">{m.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-3">💡 基准值基于行业Top10%团队数据，可在KPI管理中自定义</p>
      </div>

      <hr className="border-gray-200" />

      {/* ══�?🛤�?路径板块：用户提�?══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🛤�?提交话术</h2>
        <p className="text-base text-gray-500 mb-3">粘贴你的快捷语，AI将按上方基准进行体检</p>

        {/* 引导说明 */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 space-y-2 mb-4">
          <p className="text-blue-700 font-medium text-base">💡 这个页面能帮你：</p>
          <ul className="text-sm text-gray-800 space-y-1 ml-5 list-disc">
            <li>把粗糙的话术改成高情商版本，让客户听着舒服、成交率更高</li>
            <li>一键扫描话术里的违禁词、敏感词，避免发出去被平台限流封�?/li>
            <li>批量导入，AI自动优化，改完直接复制就能用</li>
          </ul>
          <p className="text-xs text-gray-500">使用方法：在下方粘贴你的快捷语（一行一条），选择优化模式，点「开始体检」就能拿到优化版</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">话术内容</label>
            <textarea
              className="w-full h-48 p-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="一行一条话术，支持批量导入&#10;例如�?#10;亲，这个是最便宜的啦&#10;亲，我们保证质量最�?#10;亲，你放心买，出了问题我负责"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <p className="text-sm text-gray-400 mt-1">一行一条话术，支持批量导入</p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => downloadCheckupTemplate('speech', !['personal_user','efficiency_user'].includes(profile?.role || ''))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" /> 下载模板
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" /> 导入表格
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const rows = await importCheckupSheet(file, 'speech');
                    if (rows.length > 0) {
                      const text = rows.map(r => r['客户问题'] || '').filter(Boolean).join('\n');
                      setInput(prev => prev ? prev + '\n' + text : text);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">体检模式</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    mode === opt.value
                      ? opt.color + ' border-current'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-base">{opt.label}</div>
                  <div className="text-sm mt-1 opacity-80">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '🩺 体检�?..' : '🩺 开始体检'}
            </button>
            {result && (
              <>
                <button
                  onClick={reset}
                  className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  重新体检
                </button>
                <Link href="/learning-path" className="inline-flex items-center gap-1 text-base text-sky-600 hover:text-sky-700 ml-3">
                  返回课程继续学习 <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ══�?📊 结果板块：体检结果 ══�?*/}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-base">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mr-3" />
          <span className="text-lg text-gray-500">AI正在体检你的话术...</span>
        </div>
      )}

      {!loading && parsed.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 体检结果</h2>
          <p className="text-base text-gray-500 mb-4">原文 vs 优化版对�?+ 变更明细</p>
          <div className="space-y-4">
            {parsed.map((item, idx) => {
              const hasChanges = item.changes && item.changes.length > 0;
              const riskChanges = item.changes?.filter(c => c.type === '风控') || [];
              const hasRisk = riskChanges.length > 0;
              return (
                <div key={idx} className={`border-2 rounded-xl overflow-hidden ${hasRisk ? 'border-red-300' : 'border-green-300'}`}>
                  <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 font-medium flex items-center justify-between">
                    <span>�?{idx + 1} 条话�?/span>
                    {hasRisk && <span className="text-red-600 font-bold">⚠️ 含风控问�?/span>}
                    {!hasRisk && hasChanges && <span className="text-green-600 font-bold">�?已优�?/span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                    <div className="p-4">
                      <div className="text-sm font-bold text-gray-400 mb-1">原文</div>
                      <div className="text-base text-gray-800">{item.original}</div>
                    </div>
                    <div className="p-4 bg-green-50/50">
                      <div className="text-sm font-bold text-green-600 mb-1">优化�?/div>
                      <div className="text-base text-gray-800">{item.optimized}</div>
                    </div>
                  </div>
                  {hasChanges && (
                    <div className="px-4 py-3 border-t bg-gray-50/50">
                      <div className="text-sm font-bold text-gray-500 mb-2">变更明细</div>
                      <div className="space-y-1">
                        {item.changes.map((c, ci) => (
                          <div key={ci} className="flex items-center gap-2 text-sm">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              c.type === '风控' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {c.type}
                            </span>
                            <span className="text-gray-500 line-through">{c.from}</span>
                            <span className="text-gray-400">�?/span>
                            <span className="text-green-700 font-bold">{c.to}</span>
                            <span className="text-gray-400">({c.reason})</span>
                          </div>
                        ))}
                      </div>
                      {hasRisk && (
                        <button
                          onClick={() => setExpandedReview(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="mt-3 text-sm text-red-600 font-bold hover:text-red-700 underline"
                        >
                          ⚠️ 未达�?�?{expandedReview[idx] ? '收起复盘' : '查看复盘'}
                        </button>
                      )}
                      {hasRisk && expandedReview[idx] && (
                        <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-base font-bold text-red-700 mb-3">🔍 复盘8�?/div>
                          <div className="space-y-2">
                            {REVIEW_QUESTIONS.map((q, qi) => (
                              <div key={qi} className="text-sm text-gray-700">{q}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className={`px-5 py-2.5 rounded-lg text-base font-bold transition-colors flex items-center gap-2 ${
                saveStatus === 'saved'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : saveStatus === 'error'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <Check className="w-4 h-4" />}
              {saveStatus === 'saving' ? '保存�?..' : saveStatus === 'saved' ? '�?已保存到我的知识�? : '💾 一键保存到我的知识�?}
            </button>
            {saveError && <p className="text-sm text-red-600 mt-2">{saveError}</p>}
          </div>
        </div>
      )}

      {/* Fallback: raw result display */}
      {!loading && result && parsed.length === 0 && (
        <div className="p-4 bg-gray-50 border rounded-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-2">📊 体检结果</h2>
          <div className="text-base text-gray-700 whitespace-pre-wrap">{result}</div>
        </div>
      )}

      <p className="text-sm text-gray-300 text-center pt-4 border-t">
        提交的数据将用于优化AI分析能力，帮你和更多人获得更好的结果，我们不会泄露您的商业信�?
      </p>
    </div>
  );
}
