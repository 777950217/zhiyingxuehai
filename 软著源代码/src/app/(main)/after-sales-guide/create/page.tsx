'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  Search,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

/* ══════════════════════════════════════════════════════════�?*/
/* sessionStorage persistence for 5-step flow                  */
/* ══════════════════════════════════════════════════════════�?*/

const SS_KEY = 'guide_create_state';

function saveStepState(data: { step: number; problemDesc: string; problemType: string; qaAnswers: Record<string, string>; guideText: string; guideName: string }) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function loadStepState(): { step: number; problemDesc: string; problemType: string; qaAnswers: Record<string, string>; guideText: string; guideName: string } | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearStepState() {
  try { sessionStorage.removeItem(SS_KEY); } catch { /* ignore */ }
}

/* ══════════════════════════════════════════════════════════�?*/
/* Types                                                      */
/* ══════════════════════════════════════════════════════════�?*/

interface SeedMatch {
  id: string;
  title: string;
  category: string;
  preview: string;
  matchScore: number;
  content?: string;
  question?: string;
}

interface QAStep {
  question: string;
  options: string[];
  key: string;
}

const STEPS = [
  { label: '描述问题', icon: '1' },
  { label: '匹配攻略', icon: '2' },
  { label: 'AI引导', icon: '3' },
  { label: '预览确认', icon: '4' },
  { label: '保存', icon: '5' },
];

/* ══════════════════════════════════════════════════════════�?*/
/* Keyword matching helper                                    */
/* ══════════════════════════════════════════════════════════�?*/

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[，。、；：？！\s]+/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

function calcMatchScore(userTokens: string[], targetText: string): number {
  if (userTokens.length === 0) return 0;
  const targetLower = targetText.toLowerCase();
  const matched = userTokens.filter(t => targetLower.includes(t));
  return Math.min(Math.round((matched.length / userTokens.length) * 100), 95);
}

/* ══════════════════════════════════════════════════════════�?*/
/* Component                                                  */
/* ══════════════════════════════════════════════════════════�?*/

export default function AfterSalesGuideCreatePage() {
  const { authFetch } = useAuth();

  // Restore from sessionStorage on mount
  const restored = useRef(loadStepState());

  // Step 1: Problem description
  const [problemDesc, setProblemDesc] = useState(restored.current?.problemDesc || '');
  const [problemType, setProblemType] = useState(restored.current?.problemType || '');
  const [showPolished, setShowPolished] = useState(false);
  const [polishedText, setPolishedText] = useState('');
  const [polishing, setPolishing] = useState(false);

  // Step 2: Seed matching
  const [seedMatches, setSeedMatches] = useState<SeedMatch[]>([]);
  const [seedSearching, setSeedSearching] = useState(false);
  const [seedSearched, setSeedSearched] = useState(false);

  // Step 3: AI guided Q&A
  const [qaSteps, setQaSteps] = useState<QAStep[]>([]);
  const [qaAnswers, setQaAnswers] = useState<Record<string, string>>(restored.current?.qaAnswers || {});
  const [qaCustomInputs, setQaCustomInputs] = useState<Record<string, string>>({});
  const [currentQAStep, setCurrentQAStep] = useState(0);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState('');

  // Step 4: Preview
  const [guideText, setGuideText] = useState(restored.current?.guideText || '');
  const [guideGenerating, setGuideGenerating] = useState(false);
  const [guideError, setGuideError] = useState('');
  const [editingGuide, setEditingGuide] = useState(false);

  // Step 5: Save
  const [guideName, setGuideName] = useState(restored.current?.guideName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Current step (0-indexed)
  const [currentStep, setCurrentStep] = useState(restored.current?.step || 0);

  // Auto-save to sessionStorage whenever step data changes
  useEffect(() => {
    saveStepState({ step: currentStep, problemDesc, problemType, qaAnswers, guideText, guideName });
  }, [currentStep, problemDesc, problemType, qaAnswers, guideText, guideName]);

  // Ref for editable guide
  const guideEditRef = useRef<HTMLTextAreaElement>(null);

  /* ─── Step 1: AI polish ─── */
  const handlePolish = useCallback(async () => {
    if (!problemDesc.trim()) return;
    setPolishing(true);
    try {
      const res = await authFetch('/api/after-sales-guide/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: problemDesc,
          context: '卫浴售后',
        }),
      });
      if (!res.ok) throw new Error('润色失败');
      const data = await res.json();
      setPolishedText(data.result || problemDesc);
      setShowPolished(true);
    } catch {
      // Fallback: simple polish
      setPolishedText(problemDesc.trim());
      setShowPolished(true);
    } finally {
      setPolishing(false);
    }
  }, [problemDesc, authFetch]);

  /* ─── Step navigation ─── */
  const goNext = useCallback(() => setCurrentStep(s => Math.min(s + 1, 4)), []);
  const goPrev = useCallback(() => setCurrentStep(s => Math.max(s - 1, 0)), []);

  /* ─── Step 2: Real seed matching ─── */
  const goToStep2 = useCallback(async () => {
    setCurrentStep(1);
    setSeedSearching(true);
    setSeedSearched(false);
    setSeedMatches([]);

    try {
      const userTokens = tokenize(problemDesc);
      if (userTokens.length === 0) {
        setSeedSearching(false);
        setSeedSearched(true);
        return;
      }

      // Fetch existing guides from phrase_library
      const categories = ['售后攻略', 'SOP体检', '案例体检'];
      const allResults: SeedMatch[] = [];

      for (const cat of categories) {
        try {
          const res = await authFetch(`/api/phrases?category=${encodeURIComponent(cat)}`);
          if (!res.ok) continue;
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.data || [];

          for (const item of items) {
            const targetText = `${item.question || ''} ${item.content || ''} ${item.title || item.scene || ''}`;
            const score = calcMatchScore(userTokens, targetText);
            if (score >= 30) {
              allResults.push({
                id: item.id || String(Math.random()),
                title: item.question || item.title || '未命名攻�?,
                category: cat,
                preview: (item.content || item.answer || '').slice(0, 120),
                matchScore: score,
                content: item.content || '',
                question: item.question || '',
              });
            }
          }
        } catch {
          // Skip failed category
        }
      }

      // Sort by match score descending
      allResults.sort((a, b) => b.matchScore - a.matchScore);
      setSeedMatches(allResults);

      // If no matches, auto-advance to Step 3
      if (allResults.length === 0) {
        setTimeout(() => {
          setCurrentStep(2);
          loadQASteps();
        }, 800);
      }
    } catch {
      // On error, proceed to Step 3
      setCurrentStep(2);
      loadQASteps();
    } finally {
      setSeedSearching(false);
      setSeedSearched(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemDesc, authFetch]);

  /* ─── Use existing guide ─── */
  const handleUseSeed = useCallback((seed: SeedMatch) => {
    const content = seed.content || seed.preview;
    setGuideText(content);
    setGuideName(seed.title);
    setCurrentStep(3); // Jump to Step 4 (preview)
  }, []);

  /* ─── Step 3: Load AI Q&A ─── */
  const loadQASteps = useCallback(async () => {
    setQaLoading(true);
    setQaError('');
    setQaSteps([]);
    setCurrentQAStep(0);
    setQaAnswers({});
    setQaCustomInputs({});

    try {
      const res = await authFetch('/api/after-sales-guide/generate-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: problemDesc,
          problemType: problemType || '通用',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'AI问答生成失败');
      }
      const data = await res.json();
      const steps: QAStep[] = data.steps || [];
      if (steps.length === 0) throw new Error('AI未返回问答题�?);
      setQaSteps(steps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI问答生成失败，请重试';
      setQaError(msg);
      // Fallback Q&A
      setQaSteps([
        { question: '问题出现在哪个子系统�?, options: ['冲水系统', '加热系统', '控制系统', '排水系统', '不确�?], key: 'subsystem' },
        { question: '问题是持续存在还是间歇出现？', options: ['持续存在', '间歇出现', '偶尔出现', '仅特定条件下出现', '不确�?], key: 'frequency' },
        { question: '最近是否有安装、移动或维修过？', options: ['是，刚安�?, '是，移动�?, '是，维修�?, '�?, '不确�?], key: 'recent_change' },
        { question: '用户描述的最明显症状是？', options: ['完全无法使用', '功能部分异常', '有异�?异味', '指示灯异�?, '不确�?], key: 'symptom' },
      ]);
    } finally {
      setQaLoading(false);
    }
  }, [problemDesc, problemType, authFetch]);

  /* ─── Step 3�?: Generate guide from Q&A answers ─── */
  const generateGuide = useCallback(async () => {
    setGuideGenerating(true);
    setGuideError('');

    const answers = qaSteps.map(step => ({
      question: step.question,
      answer: qaAnswers[step.key] === '__custom__'
        ? qaCustomInputs[step.key] || '不确�?
        : qaAnswers[step.key] || '未作�?,
    }));

    try {
      const res = await authFetch('/api/after-sales-guide/generate-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: problemDesc,
          problemType: problemType || '通用',
          qaAnswers: answers,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '攻略生成失败');
      }
      const data = await res.json();
      setGuideText(data.content || data.guide || '');
      if (data.title) setGuideName(data.title);
      setCurrentStep(3); // Go to Step 4 (preview)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '攻略生成失败';
      setGuideError(msg);
      // Fallback: generate simple IF-THEN from answers
      let fallback = `�?{problemDesc.slice(0, 30)}】排查攻略\n\n`;
      answers.forEach((a, i) => {
        fallback += `步骤${i + 1}�?{a.question}\n  �?${a.answer}\n\n`;
      });
      fallback += '---\n如以上排查无效，建议联系厂家技术支持�?;
      setGuideText(fallback);
      setCurrentStep(3);
    } finally {
      setGuideGenerating(false);
    }
  }, [problemDesc, problemType, qaSteps, qaAnswers, qaCustomInputs, authFetch]);

  /* ─── Step 5: Save ─── */
  const handleSave = useCallback(async () => {
    if (!guideName.trim()) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: '售后攻略',
          content: guideText,
          question: problemDesc,
          answer: guideText.slice(0, 200),
          scene: problemType || '售后',
          tags: ['售后攻略', problemType || '通用'].filter(Boolean),
          is_preset: false,
          expires_at: new Date(Date.now() + 180 * 86400000).toISOString(), // 180天有效期
        }),
      });
      if (!res.ok) throw new Error('保存失败');
      setSaveSuccess(true);
      clearStepState(); // Clear sessionStorage on successful save
    } catch {
      setSaveError('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [guideName, guideText, problemDesc, problemType, authFetch]);

  /* ─── QA answer handler ─── */
  const handleQAAnswer = useCallback((key: string, value: string) => {
    setQaAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleQACustom = useCallback((key: string, value: string) => {
    setQaCustomInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const isCurrentQAAnswered = currentQAStep < qaSteps.length
    && (qaAnswers[qaSteps[currentQAStep]?.key]
      && (qaAnswers[qaSteps[currentQAStep].key] !== '__custom__'
        || qaCustomInputs[qaSteps[currentQAStep].key]?.trim()));

  /* ══════════════════════════════════════════════════════════�?*/
  /* Render                                                     */
  /* ══════════════════════════════════════════════════════════�?*/

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/after-sales-guide" className="text-sm text-gray-500 hover:text-gray-700 transition">
            �?返回售后攻略
          </Link>
          <h1 className="font-bold text-gray-900">创建售后攻略</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Step indicator - scrollable on narrow screens */}
        <div className="flex items-center justify-start sm:justify-center gap-1 mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition min-w-max ${
                i < currentStep ? 'bg-green-100 text-green-700' :
                i === currentStep ? 'bg-indigo-100 text-indigo-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < currentStep ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <span>{step.icon}</span>}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.icon}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-4 sm:w-6 h-0.5 mx-0.5 sm:mx-1 shrink-0 ${i < currentStep ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════�?*/}
        {/* STEP 1: Describe problem                    */}
        {/* ══════════════════════════════════════════�?*/}
        {currentStep === 0 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">用大白话描述你遇到的售后问题</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">越具体越好，比如「客户说智能马桶大小冲没区别，按哪个键出水都一样�?/p>
              <textarea
                value={problemDesc}
                onChange={e => setProblemDesc(e.target.value)}
                placeholder="描述你遇到的售后问题..."
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none ${problemDesc.length > 2000 ? 'border-amber-300' : 'border-gray-200'}`}
              />
              {problemDesc.length > 1500 && (
                <div className={`text-xs mt-1 ${problemDesc.length > 2000 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                  {problemDesc.length > 2000 ? '描述较长，建议精简�?000字以内以获得更好的AI润色效果' : `已输�?{problemDesc.length}字，建议控制�?000字以内`}
                </div>
              )}
              <button
                onClick={handlePolish}
                disabled={!problemDesc.trim() || polishing}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {polishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {polishing ? 'AI润色�?..' : 'AI润色'}
              </button>

              {showPolished && polishedText && (
                <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
                  <p className="text-xs text-indigo-500 mb-1 font-medium">润色后：</p>
                  <p className="text-sm text-gray-800">{polishedText}</p>
                </div>
              )}
            </div>

            {/* Problem type selector */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">问题类型（可选）</h3>
              <div className="flex flex-wrap gap-2">
                {['功能故障', '安装问题', '漏水问题', '异响异味', '加热问题', '冲水问题', '外观问题', '其他'].map(type => (
                  <button
                    key={type}
                    onClick={() => setProblemType(type === problemType ? '' : type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      type === problemType
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={goToStep2}
                disabled={!problemDesc.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                下一�?<ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════�?*/}
        {/* STEP 2: Seed matching                       */}
        {/* ══════════════════════════════════════════�?*/}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">匹配已有攻略</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                正在从攻略库中搜索与「{problemDesc.slice(0, 30)}...」匹配的攻略
              </p>

              {seedSearching && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-sm text-gray-500">搜索�?..</span>
                </div>
              )}

              {!seedSearching && seedSearched && seedMatches.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-green-600 font-medium">
                    找到 {seedMatches.length} 条相关攻�?
                  </p>
                  {seedMatches.map(seed => (
                    <div
                      key={seed.id}
                      className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:border-indigo-200 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">{seed.title}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{seed.preview}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600">{seed.category}</span>
                            <span className="text-xs text-gray-400">匹配�?{seed.matchScore}%</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUseSeed(seed)}
                          className="ml-3 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition shrink-0"
                        >
                          使用此攻�?
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!seedSearching && seedSearched && seedMatches.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">未找到相似攻略，将为你创建自定义攻略</p>
                </div>
              )}
            </div>

            {seedMatches.length > 0 && (
              <div className="flex items-center justify-between">
                <button onClick={goPrev} className="text-sm text-gray-500 hover:text-gray-700 transition">
                  上一�?
                </button>
                <button
                  onClick={() => { setCurrentStep(2); loadQASteps(); }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm transition"
                >
                  继续创建自定义攻�?<ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════�?*/}
        {/* STEP 3: AI guided Q&A                       */}
        {/* ══════════════════════════════════════════�?*/}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">AI引导排查</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">回答几个问题，AI帮你生成专业排查攻略</p>

              {qaLoading && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-sm text-gray-500">AI正在生成排查问题...</span>
                </div>
              )}

              {qaError && !qaLoading && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700 mb-4">
                  {qaError}（已使用默认问题�?
                </div>
              )}

              {!qaLoading && qaSteps.length > 0 && (
                <div className="space-y-6">
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    {qaSteps.map((_, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full transition ${
                        i <= currentQAStep ? 'bg-indigo-500' : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>

                  {/* Current question */}
                  {currentQAStep < qaSteps.length && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">问题 {currentQAStep + 1}/{qaSteps.length}</p>
                      <h3 className="text-base font-semibold text-gray-900 mb-4">
                        {qaSteps[currentQAStep].question}
                      </h3>
                      <div className="space-y-2">
                        {qaSteps[currentQAStep].options.map(option => (
                          <button
                            key={option}
                            onClick={() => handleQAAnswer(qaSteps[currentQAStep].key, option)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition ${
                              qaAnswers[qaSteps[currentQAStep].key] === option
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 border'
                                : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                        {/* Custom input option */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQAAnswer(qaSteps[currentQAStep].key, '__custom__')}
                            className={`px-4 py-3 rounded-lg text-sm transition ${
                              qaAnswers[qaSteps[currentQAStep].key] === '__custom__'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 border'
                                : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-indigo-200'
                            }`}
                          >
                            自己�?
                          </button>
                          {qaAnswers[qaSteps[currentQAStep].key] === '__custom__' && (
                            <input
                              value={qaCustomInputs[qaSteps[currentQAStep].key] || ''}
                              onChange={e => handleQACustom(qaSteps[currentQAStep].key, e.target.value)}
                              placeholder="输入你的答案..."
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All questions answered */}
                  {currentQAStep >= qaSteps.length && (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-700 font-medium">所有问题已回答，AI将为你生成攻�?/p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={goPrev} className="text-sm text-gray-500 hover:text-gray-700 transition">
                上一�?
              </button>
              <div className="flex items-center gap-3">
                {currentQAStep < qaSteps.length && (
                  <button
                    onClick={() => isCurrentQAAnswered && setCurrentQAStep(s => s + 1)}
                    disabled={!isCurrentQAAnswered}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    下一�?<ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {currentQAStep >= qaSteps.length && (
                  <button
                    onClick={generateGuide}
                    disabled={guideGenerating}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {guideGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> AI生成攻略�?..</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> 生成攻略</>
                    )}
                  </button>
                )}
              </div>
            </div>
            {guideError && <p className="text-sm text-red-500 text-center">{guideError}</p>}
          </div>
        )}

        {/* ══════════════════════════════════════════�?*/}
        {/* STEP 4: Preview & Edit                      */}
        {/* ══════════════════════════════════════════�?*/}
        {currentStep === 3 && !saveSuccess && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-gray-900">预览攻略</h2>
                </div>
                <button
                  onClick={() => setEditingGuide(!editingGuide)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 transition"
                >
                  {editingGuide ? '完成编辑' : '编辑'}
                </button>
              </div>

              {editingGuide ? (
                <textarea
                  ref={guideEditRef}
                  value={guideText}
                  onChange={e => setGuideText(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-y"
                />
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {guideText}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={goPrev} className="text-sm text-gray-500 hover:text-gray-700 transition">
                上一�?
              </button>
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm transition"
              >
                下一步：保存攻略 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════�?*/}
        {/* STEP 5: Save                                */}
        {/* ══════════════════════════════════════════�?*/}
        {currentStep === 4 && !saveSuccess && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Save className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">给攻略起个名�?/h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">好的名字方便团队下次快速找到，建议包含品类+问题</p>
              <input
                value={guideName}
                onChange={e => setGuideName(e.target.value)}
                placeholder="例如：智能马桶大小冲没区别排查攻�?
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400">推荐命名�?/span>
                {['智能马桶大小冲排查攻�?, '大小冲没区别-4步排查法', '冲水异常通用攻略'].map(name => (
                  <button
                    key={name}
                    onClick={() => setGuideName(name)}
                    className="px-3 py-1 rounded-lg text-xs text-gray-600 bg-gray-50 border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={goPrev} className="text-sm text-gray-500 hover:text-gray-700 transition">
                上一�?
              </button>
              <button
                onClick={handleSave}
                disabled={!guideName.trim() || isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存�?..</> : <><Save className="w-4 h-4" /> 保存攻略</>}
              </button>
            </div>
            {saveError && <p className="mt-2 text-sm text-red-500 text-center">{saveError}</p>}
          </div>
        )}

        {/* Save Success */}
        {currentStep === 4 && saveSuccess && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">攻略保存成功�?/h2>
            <p className="text-gray-500 mb-8">「{guideName}」已保存到我的知识库，团队可随时调用</p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/my-knowledge"
                className="px-6 py-2.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
              >
                <BookOpen className="w-4 h-4 inline mr-1" /> 查看我的知识�?
              </Link>
              <button
                onClick={() => {
                  clearStepState();
                  setCurrentStep(0);
                  setProblemDesc('');
                  setProblemType('');
                  setShowPolished(false);
                  setPolishedText('');
                  setSeedMatches([]);
                  setSeedSearched(false);
                  setQaSteps([]);
                  setQaAnswers({});
                  setQaCustomInputs({});
                  setCurrentQAStep(0);
                  setGuideText('');
                  setGuideName('');
                  setSaveSuccess(false);
                  setEditingGuide(false);
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm transition"
              >
                <Sparkles className="w-4 h-4 inline mr-1" /> 继续创建
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
