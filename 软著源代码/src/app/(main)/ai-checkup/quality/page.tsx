'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAiCheckup } from '@/hooks/use-ai-checkup';
import { useAuth } from '@/lib/auth-context';
import { loadProductProfile, buildProductContext, type ProductProfile } from '@/lib/product-profile-helper';
import Link from 'next/link';
import { Package, ArrowRight, Download, Upload, Send, X } from 'lucide-react';
import { downloadCheckupTemplate, importCheckupSheet } from '@/lib/checkup-template-helper';

interface BlindSpot { dimension: string; importance: string; suggestedWeight: string }
interface Optimization { dimension: string; currentWeight: string; suggestedWeight: string; reason: string }
interface Benchmark { overallLevel: string; comparison: string }
interface QualityResult { benchmark: Benchmark; blindSpots: BlindSpot[]; optimization: Optimization[] }

function parseResults(raw: string): QualityResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* ignore */ }
  return null;
}

interface DimRow { name: string; weight: string }
interface DeductRow { item: string; value: string }

/* ─── 三维框架 Mock 数据 ─── */
const QUALITY_STANDARDS = [
  { label: '维度完整�?, benchmark: '�?�?, desc: '质检维度应覆盖响�?话术/解决�?满意度等核心指标', color: 'border-blue-300 bg-blue-50/50' },
  { label: '权重合理�?, benchmark: '行业对标', desc: '各维度权重应与行业Top团队对齐', color: 'border-orange-300 bg-orange-50/50' },
  { label: '盲区覆盖', benchmark: '0盲区', desc: '不能遗漏关键质检维度', color: 'border-red-300 bg-red-50/50' },
];

const REVIEW_QUESTIONS = [
  '1. 当前质检标准是偏严还是偏松？对团队士气有何影响？',
  '2. 哪些盲区维度如果加上，会让质检结果更公正？',
  '3. 扣分项是否过多导致客服不敢正常沟通？',
  '4. 行业对标后，最需要调整的是哪个维度的权重�?,
  '5. 质检结果与客户满意度是否正相关？',
  '6. 是否存在"质检高分但客诉多"的矛盾？',
  '7. 盲区维度的建议权重，团队是否能接受？',
  '8. 下次更新质检标准前，是否需要先做一次客服反馈调研？',
];

export default function QualityCheckupPage() {
  const [dimensions, setDimensions] = useState<DimRow[]>([
    { name: '响应速度', weight: '20' },
    { name: '话术规范', weight: '25' },
    { name: '问题解决�?, weight: '30' },
    { name: '客户满意�?, weight: '25' },
  ]);
  const [deductions, setDeductions] = useState<DeductRow[]>([
    { item: '未使用标准话�?, value: '-5' },
    { item: '超时回复', value: '-3' },
  ]);
  const { loading, result, error, startCheckup, reset, usageCount, limitReached } = useAiCheckup();
  const { profile, authFetch } = useAuth();
  const isLimited = profile?.role === 'personal_user' || profile?.role === 'staff' || profile?.role === 'efficiency_user';
  const role = profile?.role || 'personal_user';
  const parsed = result ? parseResults(result) : null;
  const [productProfile, setProductProfile] = useState<ProductProfile | null>(null);
  const [expandedReview, setExpandedReview] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  // 推给员工改善
  const [showPushModal, setShowPushModal] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; position: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [pushIssue, setPushIssue] = useState('');
  const [pushSuggestion, setPushSuggestion] = useState('');
  const [pushStatus, setPushStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [pushError, setPushError] = useState('');

  const handleSave = useCallback(async () => {
    if (!profile?.id || !result) return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const dimNames = dimensions.filter(d => d.name.trim()).map(d => d.name).join(',');
      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.companyId || null,
          category: '质检体检',
          content: result,
          question: `质检维度: ${dimNames || '默认'}`,
          answer: parsed ? `基准等级: ${parsed.benchmark?.overallLevel || 'N/A'} | 盲区: ${parsed.blindSpots?.length || 0}�?| 优化建议: ${parsed.optimization?.length || 0}项` : result.slice(0, 200),
          scene: `质检体检 - ${dimNames || '默认维度'}`,
          tags: `${dimNames},质检体检`,
          is_preset: false,
          created_by: profile.id,
        }),
      });
      if (!res.ok) throw new Error('保存失败');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : '保存失败');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [profile, result, parsed, dimensions, authFetch]);

  // 打开推给员工弹窗
  const handleOpenPush = useCallback(async () => {
    setShowPushModal(true);
    setPushStatus('idle');
    setPushError('');
    // 自动填充问题和建�?
    if (parsed) {
      const issues: string[] = [];
      if (parsed.blindSpots?.length) issues.push(...parsed.blindSpots.map(b => `${b.dimension}: ${b.importance}`));
      if (parsed.optimization?.length) issues.push(...parsed.optimization.map(o => `${o.dimension}: ${o.reason}`));
      setPushIssue(issues.slice(0, 5).join('\n'));
      const suggestions: string[] = [];
      if (parsed.optimization?.length) suggestions.push(...parsed.optimization.map(o => `${o.dimension}: 建议权重�?{o.currentWeight}调整�?{o.suggestedWeight}`));
      setPushSuggestion(suggestions.slice(0, 5).join('\n'));
    } else if (result) {
      setPushIssue(result.slice(0, 300));
      setPushSuggestion('');
    }
    // 获取员工列表
    try {
      const res = await authFetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        const list = data?.data || data || [];
        setAgents(Array.isArray(list) ? list.map((a: { id: string; name: string; position: string }) => ({ id: a.id, name: a.name, position: a.position || '' })) : []);
      }
    } catch { /* ignore */ }
  }, [parsed, result, authFetch]);

  // 推送反�?
  const handlePushFeedback = useCallback(async () => {
    if (!profile?.id || !selectedAgent) return;
    setPushStatus('sending');
    setPushError('');
    try {
      const res = await authFetch('/api/quality-feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.companyId || null,
          from_user_id: profile.id,
          to_user_id: selectedAgent,
          issue_type: '质检改善',
          issue_description: pushIssue,
          suggestion: pushSuggestion,
        }),
      });
      if (!res.ok) throw new Error('推送失�?);
      setPushStatus('sent');
      setTimeout(() => { setShowPushModal(false); setPushStatus('idle'); }, 2000);
    } catch (err: unknown) {
      setPushStatus('error');
      setPushError(err instanceof Error ? err.message : '推送失�?);
    }
  }, [profile, selectedAgent, pushIssue, pushSuggestion, authFetch]);

  useEffect(() => { setProductProfile(loadProductProfile()); }, []);

  const addDimension = () => setDimensions([...dimensions, { name: '', weight: '' }]);
  const removeDimension = (i: number) => setDimensions(dimensions.filter((_, idx) => idx !== i));
  const updateDimension = (i: number, field: keyof DimRow, val: string) => {
    const next = [...dimensions];
    next[i] = { ...next[i], [field]: val };
    setDimensions(next);
  };

  const addDeduction = () => setDeductions([...deductions, { item: '', value: '' }]);
  const removeDeduction = (i: number) => setDeductions(deductions.filter((_, idx) => idx !== i));
  const updateDeduction = (i: number, field: keyof DeductRow, val: string) => {
    const next = [...deductions];
    next[i] = { ...next[i], [field]: val };
    setDeductions(next);
  };

  const handleStart = () => {
    const dimStr = dimensions.filter(d => d.name).map(d => `${d.name}(${d.weight}%)`).join('�?);
    const dedStr = deductions.filter(d => d.item).map(d => `${d.item}(${d.value}�?`).join('�?);
    const input = `我的质检评分标准：\n评分维度�?{dimStr}\n扣分项：${dedStr}`;
    const ctx = productProfile ? buildProductContext(productProfile) : null;
    startCheckup('quality', input, undefined, ctx, role);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 质检体检</h1>
        <p className="text-lg text-gray-500 mt-1">你的标准严了还是松了</p>
        <p className="text-base text-gray-400 mt-1">上传质检评分标准，AI帮你对标行业+找出盲区</p>
        {productProfile && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 border border-blue-200">
              <Package className="w-3.5 h-3.5" />
              基于{productProfile.brand}{productProfile.category}优化
            </div>
            <Link href="/product-profile-personal" className="text-xs text-gray-400 hover:text-blue-600">修改</Link>
          </div>
        )}
      </div>

      {/* ══�?🎯 目标板块 ══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 行业质检标准</h2>
        <p className="text-base text-gray-500 mb-4">你的质检标准将按以下基准体检</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUALITY_STANDARDS.map((s, i) => (
            <div key={i} className={`p-4 rounded-xl border-2 ${s.color}`}>
              <div className="text-base font-bold text-gray-800">{s.label}</div>
              <div className="text-3xl font-black mt-1">{s.benchmark}</div>
              <div className="text-sm text-gray-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ══�?🛤�?路径板块：用户提交质检维度 ══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🛤�?提交质检标准</h2>
        <p className="text-base text-gray-500 mb-3">添加你的评分维度和扣分项，AI将按上方基准体检</p>

        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 space-y-2 mb-4">
          <p className="text-blue-700 font-medium text-base">💡 这个页面能帮你：</p>
          <ul className="text-sm text-gray-800 space-y-1 ml-5 list-disc">
            <li>对标行业标准，看看你的质检标准是偏严了还是偏松�?/li>
            <li>找出你漏掉的质检维度，别让盲区拖了团队后�?/li>
            <li>调整权重建议，让质检真正有效提升服务质量</li>
          </ul>
          <p className="text-xs text-gray-500">使用方法：添加你的评分维度和扣分项，点「开始体检」就能拿到对标报�?/p>
        </div>

        <div className="space-y-4">
          {/* Dimensions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium text-gray-700">评分维度</label>
              <button onClick={addDimension} className="text-sm text-blue-600 hover:text-blue-700 font-bold">+ 添加维度</button>
            </div>
            <div className="space-y-2">
              {dimensions.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                    placeholder="维度名称"
                    value={d.name}
                    onChange={(e) => updateDimension(i, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-24 p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                    placeholder="权重%"
                    value={d.weight}
                    onChange={(e) => updateDimension(i, 'weight', e.target.value)}
                  />
                  <span className="text-sm text-gray-400">%</span>
                  {dimensions.length > 1 && (
                    <button onClick={() => removeDimension(i)} className="text-gray-400 hover:text-red-500 text-lg">�?/button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium text-gray-700">扣分�?/label>
              <button onClick={addDeduction} className="text-sm text-blue-600 hover:text-blue-700 font-bold">+ 添加扣分�?/button>
            </div>
            <div className="space-y-2">
              {deductions.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                    placeholder="扣分项名�?
                    value={d.item}
                    onChange={(e) => updateDeduction(i, 'item', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-24 p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                    placeholder="分�?
                    value={d.value}
                    onChange={(e) => updateDeduction(i, 'value', e.target.value)}
                  />
                  <span className="text-sm text-gray-400">�?/span>
                  {deductions.length > 1 && (
                    <button onClick={() => removeDeduction(i)} className="text-gray-400 hover:text-red-500 text-lg">�?/button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadCheckupTemplate('quality', !['personal_user','efficiency_user'].includes(profile?.role || ''))}
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
                  const rows = await importCheckupSheet(file, 'quality');
                  if (rows.length > 0) {
                    const first = rows[0];
                    if (first['质检维度']) {
                      setDimensions(prev => [...prev, { name: first['质检维度'] || '', weight: first['评分(1-10)'] || '10' }]);
                    }
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleStart}
              disabled={loading || limitReached}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '🩺 体检�?..' : '🩺 开始体检'}
            </button>
            {limitReached && (
              <div className="w-full mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                🎯 体验次数已用完（{usageCount}/3次）�?a href="/membership" className="underline font-semibold text-amber-900 hover:text-amber-700">解锁专业�?/a>无限使用
              </div>
            )}
            {isLimited && !limitReached && (
              <span className="text-xs text-gray-400 self-center ml-2">剩余{3 - usageCount}次体�?/span>
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
          <span className="text-lg text-gray-500">AI正在体检你的质检标准...</span>
        </div>
      )}

      {!loading && parsed && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 体检结果</h2>
          <p className="text-base text-gray-500 mb-4">扣分�?+ 行业对标 + 盲区提醒</p>
          <div className="space-y-6">
            {/* Benchmark */}
            <div className={`p-4 border-2 rounded-xl ${
              parsed.benchmark?.overallLevel === '偏严' ? 'border-orange-200 bg-orange-50/50' :
              parsed.benchmark?.overallLevel === '偏松' ? 'border-red-200 bg-red-50/50' :
              'border-green-200 bg-green-50/50'
            }`}>
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                📈 行业对标
                {(parsed.benchmark?.overallLevel === '偏严' || parsed.benchmark?.overallLevel === '偏松') && (
                  <button
                    onClick={() => setExpandedReview(prev => ({ ...prev, benchmark: !prev.benchmark }))}
                    className="text-sm text-red-600 font-bold hover:text-red-700 underline"
                  >
                    ⚠️ 未达�?�?{expandedReview.benchmark ? '收起复盘' : '查看复盘'}
                  </button>
                )}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-base text-gray-700">你的标准�?/span>
                <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                  parsed.benchmark?.overallLevel === '偏严' ? 'bg-orange-100 text-orange-700' :
                  parsed.benchmark?.overallLevel === '偏松' ? 'bg-red-100 text-red-700' :
                  'bg-green-100 text-green-700'
                }`}>{parsed.benchmark?.overallLevel}</span>
              </div>
              <p className="text-base text-gray-600">{parsed.benchmark?.comparison}</p>
              {expandedReview.benchmark && (
                <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-base font-bold text-red-700 mb-3">🔍 对标复盘8�?/div>
                  <div className="space-y-2">
                    {REVIEW_QUESTIONS.map((q, qi) => (
                      <div key={qi} className="text-sm text-gray-700">{q}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Blind Spots */}
            {parsed.blindSpots && parsed.blindSpots.length > 0 && (
              <div className="p-4 border-2 border-red-200 rounded-xl bg-red-50/50">
                <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                  🔴 盲区提醒 �?你漏了这�?
                  <button
                    onClick={() => setExpandedReview(prev => ({ ...prev, blindSpots: !prev.blindSpots }))}
                    className="text-sm text-red-600 font-bold hover:text-red-700 underline"
                  >
                    ⚠️ 未达�?�?{expandedReview.blindSpots ? '收起复盘' : '查看复盘'}
                  </button>
                </h3>
                <div className="space-y-2">
                  {parsed.blindSpots.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-base">
                      <span className="font-bold text-gray-800 shrink-0">{b.dimension}</span>
                      <span className="text-gray-500">�?{b.importance}</span>
                      <span className="text-sm text-blue-600 shrink-0">建议权重 {b.suggestedWeight}</span>
                    </div>
                  ))}
                </div>
                {expandedReview.blindSpots && (
                  <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-base font-bold text-red-700 mb-3">🔍 盲区复盘8�?/div>
                    <div className="space-y-2">
                      {REVIEW_QUESTIONS.map((q, qi) => (
                        <div key={qi} className="text-sm text-gray-700">{q}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Optimization */}
            {parsed.optimization && parsed.optimization.length > 0 && (
              <div className="p-4 border-2 border-green-200 rounded-xl bg-green-50/50">
                <h3 className="text-lg font-bold text-green-700 mb-3">🟢 优化建议</h3>
                <div className="space-y-2">
                  {parsed.optimization.map((o, i) => (
                    <div key={i} className="text-base">
                      <span className="font-bold text-gray-800">{o.dimension}</span>
                      <span className="text-gray-500">：{o.currentWeight} �?</span>
                      <span className="text-green-700 font-bold">{o.suggestedWeight}</span>
                      <span className="text-gray-400 ml-2">({o.reason})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              {profile?.role !== 'personal_user' && (
                <button
                  onClick={handleOpenPush}
                  className="px-5 py-2.5 rounded-lg text-base font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> 推给员工改善
                </button>
              )}
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

      {/* 推给员工改善弹窗 */}
      {showPushModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
            <button onClick={() => setShowPushModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-gray-800 mb-4">📤 推给员工改善</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">选择员工</label>
                <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:outline-none">
                  <option value="">请选择员工</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.position ? ` (${a.position})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">问题摘要</label>
                <textarea value={pushIssue} onChange={e => setPushIssue(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="AI自动填充，可修改" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">改善建议</label>
                <textarea value={pushSuggestion} onChange={e => setPushSuggestion(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="AI自动填充，可修改" />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handlePushFeedback}
                disabled={!selectedAgent || pushStatus === 'sending'}
                className={`px-5 py-2.5 rounded-lg text-base font-bold transition-colors ${
                  pushStatus === 'sent' ? 'bg-green-500 text-white' :
                  pushStatus === 'error' ? 'bg-red-500 text-white' :
                  !selectedAgent || pushStatus === 'sending' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                  'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {pushStatus === 'sending' ? '�?推送中...' :
                 pushStatus === 'sent' ? '�?已推�? :
                 pushStatus === 'error' ? '�?推送失�? :
                 '确认推�?}
              </button>
              {pushError && <span className="text-sm text-red-600">{pushError}</span>}
              <button onClick={() => setShowPushModal(false)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-base">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
