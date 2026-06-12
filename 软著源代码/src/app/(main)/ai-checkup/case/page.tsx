'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAiCheckup } from '@/hooks/use-ai-checkup';
import { useAuth } from '@/lib/auth-context';
import { loadProductProfile, buildProductContext, type ProductProfile } from '@/lib/product-profile-helper';
import Link from 'next/link';
import { Package, ArrowRight, Download, Upload } from 'lucide-react';
import { downloadCheckupTemplate, importCheckupSheet } from '@/lib/checkup-template-helper';

interface RootCause { directCause: string; systemicCause: string; probability: string }
interface Prevention { process: string[]; script: string[]; policy: string[] }
interface CostAnalysis { monthlyEstimate: string; savingsIfFixed: string; roiNote: string }
interface CaseResult { rootCause: RootCause; prevention: Prevention; costAnalysis: CostAnalysis }

function parseResults(raw: string): CaseResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* ignore */ }
  return null;
}

const PROBLEM_TYPES = ['物流问题', '质量问题', '售后退�?, '客服态度', '其他'];
const HANDLING_RESULTS = ['退�?, '换货', '补偿', '拒绝', '其他'];
const CUSTOMER_REACTIONS = ['满意', '一�?, '不满�?, '投诉'];

/* ─── 三维框架 Mock 数据 ─── */
const CASE_GOALS = [
  { label: '根因识别�?, benchmark: '�?0%', desc: '准确找到根本原因而非表面原因', color: 'border-red-300 bg-red-50/50' },
  { label: '防复发覆盖率', benchmark: '�?0%', desc: '防复发方案覆盖流�?话术+制度三个层面', color: 'border-blue-300 bg-blue-50/50' },
  { label: '成本控制�?, benchmark: '≤行业均�?, desc: '同类问题的处理成本不高于行业平均', color: 'border-green-300 bg-green-50/50' },
];

const REVIEW_QUESTIONS = [
  '1. 这类问题的根本原因是偶发还是系统性问题？',
  '2. 防复发方案中，哪个层面最难落地？',
  '3. 成本测算中，哪些费用是可以避免的�?,
  '4. 如果不处理，这类问题每月会带来多少损失？',
  '5. 之前有没有处理过类似问题？为什么复发了�?,
  '6. 防复发方案需要多少人力投入？ROI如何�?,
  '7. 客户对处理结果的满意度是否能提升�?,
  '8. 是否需要修改现有SOP来预防此类问题？',
];

export default function CaseCheckupPage() {
  const [form, setForm] = useState({
    problemType: '质量问题',
    amount: '',
    handlingResult: '退�?,
    customerReaction: '不满�?,
    description: '',
  });
  const { loading, result, error, startCheckup, reset, usageCount, limitReached } = useAiCheckup();
  const { profile, authFetch } = useAuth();
  const isLimited = profile?.role === 'personal_user' || profile?.role === 'staff' || profile?.role === 'efficiency_user';
  const parsed = result ? parseResults(result) : null;
  const [productProfile, setProductProfile] = useState<ProductProfile | null>(null);
  const [expandedReview, setExpandedReview] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => { setProductProfile(loadProductProfile()); }, []);

  const handleSave = useCallback(async () => {
    if (!profile?.id || !result) return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.companyId || null,
          category: '案例体检',
          content: result,
          question: `问题类型:${form.problemType} 金额:${form.amount || '未填�?} 处理:${form.handlingResult} 反应:${form.customerReaction}\n${form.description}`,
          answer: parsed ? `根因:${parsed.rootCause.directCause}/${parsed.rootCause.systemicCause} | 防复�?${parsed.prevention.process.length + parsed.prevention.script.length + parsed.prevention.policy.length}�?| 节省:${parsed.costAnalysis.savingsIfFixed}` : result,
          scene: `案例体检 - ${form.problemType}`,
          tags: [form.problemType, '案例体检'].join(','),
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
  }, [profile, result, parsed, form, authFetch]);

  useEffect(() => { setProductProfile(loadProductProfile()); }, []);

  const handleStart = () => {
    if (!form.description.trim()) return;
    const input = `问题类型�?{form.problemType}
问题金额�?{form.amount || '未填�?}�?
处理结果�?{form.handlingResult}
客户反应�?{form.customerReaction}
案例描述�?{form.description}`;
    const ctx = productProfile ? buildProductContext(productProfile) : null;
    startCheckup('case', input, undefined, ctx, profile?.role || 'personal_user');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">💰 案例体检</h1>
        <p className="text-lg text-gray-500 mt-1">算清楚亏在哪、怎么�?/p>
        <p className="text-base text-gray-400 mt-1">提交售后案例，AI帮你分析根因+防复发方�?/p>
        {productProfile && productProfile.category && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 border border-blue-200">
              <Package className="w-3.5 h-3.5" />
              基于{productProfile.category}赔付逻辑分析
            </div>
            <Link href="/product-profile-personal" className="text-xs text-gray-400 hover:text-blue-600">修改</Link>
          </div>
        )}
      </div>

      {/* ══�?🎯 目标板块 ══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 最优处理基�?/h2>
        <p className="text-base text-gray-500 mb-4">案例体检的三大评判标�?/p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CASE_GOALS.map((g, i) => (
            <div key={i} className={`p-4 rounded-xl border-2 ${g.color}`}>
              <div className="text-base font-bold text-gray-800">{g.label}</div>
              <div className="text-3xl font-black mt-1">{g.benchmark}</div>
              <div className="text-sm text-gray-500 mt-1">{g.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ══�?🛤�?路径板块：用户提交案�?══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🛤�?提交案例</h2>
        <p className="text-base text-gray-500 mb-3">填写售后案例信息，AI将按上方基准分析</p>

        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 space-y-2 mb-4">
          <p className="text-blue-700 font-medium text-base">💡 这个页面能帮你：</p>
          <ul className="text-sm text-gray-800 space-y-1 ml-5 list-disc">
            <li>分析售后问题的根本原因，不只是头疼医�?/li>
            <li>给你防复发方案，从流程、话术、制度三个层面堵住漏�?/li>
            <li>算清楚这类问题每月亏多少钱，堵住能省多少</li>
          </ul>
          <p className="text-xs text-gray-500">使用方法：填写售后案例信息，点「开始体检」就能拿到分析报�?/p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">问题类型</label>
              <select
                className="w-full p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                value={form.problemType}
                onChange={(e) => setForm({ ...form, problemType: e.target.value })}
              >
                {PROBLEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">问题金额（元�?/label>
              <input
                type="number"
                className="w-full p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                placeholder="例如�?50"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">处理结果</label>
              <select
                className="w-full p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                value={form.handlingResult}
                onChange={(e) => setForm({ ...form, handlingResult: e.target.value })}
              >
                {HANDLING_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">客户反应</label>
              <select
                className="w-full p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                value={form.customerReaction}
                onChange={(e) => setForm({ ...form, customerReaction: e.target.value })}
              >
                {CUSTOMER_REACTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">案例描述</label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="详细描述案例经过，包括客户问题、处理过程、最终结�?.."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => downloadCheckupTemplate('case', !['personal_user','efficiency_user'].includes(profile?.role || ''))}
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
                    const rows = await importCheckupSheet(file, 'case');
                    if (rows.length > 0) {
                      const text = rows.map(r => `案例�?{r['售后案例'] || ''} | 处理�?{r['处理过程'] || ''} | 反馈�?{r['客户反馈'] || ''} | 结果�?{r['解决结果'] || ''}`).join('\n');
                      setForm(prev => ({ ...prev, description: prev.description ? prev.description + '\n' + text : text }));
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={loading || !form.description.trim() || (isLimited && limitReached)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLimited && limitReached ? '🔒 已达上限' : loading ? '🩺 体检�?..' : '🩺 开始体检'}
            </button>
            {isLimited && limitReached && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                免费体验已达3次上限，<a href="/membership" className="underline font-medium text-blue-600 hover:text-blue-800">解锁专业�?/a>享受无限次体检
              </div>
            )}
            {isLimited && !limitReached && usageCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">本月已使�?{usageCount}/3 �?/p>
            )}
            {result && (
              <>
                <button onClick={reset} className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
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

      {/* ══�?📊 结果板块 ══�?*/}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-base">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mr-3" />
          <span className="text-lg text-gray-500">AI正在分析案例...</span>
        </div>
      )}

      {!loading && parsed && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 体检结果</h2>
          <p className="text-base text-gray-500 mb-4">根因分析 + 防复发方�?+ 成本测算</p>
          <div className="space-y-6">
            {/* Root Cause */}
            <div className="p-4 border-2 border-red-200 rounded-xl bg-red-50/50">
              <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                🔍 根因分析
                <button
                  onClick={() => setExpandedReview(prev => ({ ...prev, rootCause: !prev.rootCause }))}
                  className="text-sm text-red-600 font-bold hover:text-red-700 underline"
                >
                  ⚠️ 未达�?�?{expandedReview.rootCause ? '收起复盘' : '查看复盘'}
                </button>
              </h3>
              <div className="space-y-2 text-base">
                <div><span className="font-bold text-gray-700">直接原因�?/span>{parsed.rootCause?.directCause}</div>
                <div><span className="font-bold text-gray-700">系统性原因：</span>{parsed.rootCause?.systemicCause}</div>
                <div><span className="font-bold text-gray-700">再发概率�?/span>
                  <span className={`ml-1 px-2 py-0.5 rounded text-sm font-bold ${
                    parsed.rootCause?.probability === '�? ? 'bg-red-100 text-red-700' :
                    parsed.rootCause?.probability === '�? ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>{parsed.rootCause?.probability}</span>
                </div>
              </div>
              {expandedReview.rootCause && (
                <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-base font-bold text-red-700 mb-3">🔍 根因复盘8�?/div>
                  <div className="space-y-2">
                    {REVIEW_QUESTIONS.map((q, qi) => (
                      <div key={qi} className="text-sm text-gray-700">{q}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prevention */}
            <div className="p-4 border-2 border-blue-200 rounded-xl bg-blue-50/50">
              <h3 className="text-lg font-bold text-blue-700 mb-3">🛡�?防复发方�?/h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {parsed.prevention?.process && (
                  <div>
                    <div className="text-sm font-bold text-gray-500 mb-2">流程层面</div>
                    <ul className="space-y-1">
                      {parsed.prevention.process.map((p, i) => <li key={i} className="text-base text-gray-700">�?{p}</li>)}
                    </ul>
                  </div>
                )}
                {parsed.prevention?.script && (
                  <div>
                    <div className="text-sm font-bold text-gray-500 mb-2">话术层面</div>
                    <ul className="space-y-1">
                      {parsed.prevention.script.map((s, i) => <li key={i} className="text-base text-gray-700">�?{s}</li>)}
                    </ul>
                  </div>
                )}
                {parsed.prevention?.policy && (
                  <div>
                    <div className="text-sm font-bold text-gray-500 mb-2">制度层面</div>
                    <ul className="space-y-1">
                      {parsed.prevention.policy.map((p, i) => <li key={i} className="text-base text-gray-700">�?{p}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Cost Analysis */}
            <div className="p-4 border-2 border-green-200 rounded-xl bg-green-50/50">
              <h3 className="text-lg font-bold text-green-700 mb-3">💵 成本测算</h3>
              <div className="space-y-2 text-base">
                <div><span className="font-bold text-gray-700">月均亏损预估�?/span>{parsed.costAnalysis?.monthlyEstimate}</div>
                <div><span className="font-bold text-gray-700">堵住后可节省�?/span><span className="text-green-700 font-bold">{parsed.costAnalysis?.savingsIfFixed}</span></div>
                <div><span className="font-bold text-gray-700">投入产出�?/span>{parsed.costAnalysis?.roiNote}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`px-5 py-2.5 rounded-lg text-base font-bold transition-colors ${
                  saveStatus === 'saved' ? 'bg-green-500 text-white' :
                  saveStatus === 'error' ? 'bg-red-500 text-white' :
                  saveStatus === 'saving' ? 'bg-gray-400 text-white cursor-wait' :
                  'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {saveStatus === 'saving' ? '�?保存�?..' :
                 saveStatus === 'saved' ? '�?已保存到我的知识�? :
                 saveStatus === 'error' ? '�?保存失败' :
                 '💾 保存到我的知识库'}
              </button>
              {saveError && <span className="text-sm text-red-600">{saveError}</span>}
              <Link
                href="/after-sales-guide/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-base font-bold border-2 border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                📝 生成售后攻略
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && result && !parsed && (
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
