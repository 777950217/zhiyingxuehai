'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAiCheckup } from '@/hooks/use-ai-checkup';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { loadProductProfile, buildProductContext, type ProductProfile } from '@/lib/product-profile-helper';
import Link from 'next/link';
import { Package, ArrowRight, Download, Upload } from 'lucide-react';
import { downloadCheckupTemplate, importCheckupSheet } from '@/lib/checkup-template-helper';

interface Gap { scenario: string; severity: string; description: string }
interface Compliance { clause: string; issue: string; suggestion: string }
interface Upgrade { area: string; bestPractice: string; action: string }

interface SopResult {
  gaps: Gap[];
  compliance: Compliance[];
  upgrades: Upgrade[];
}

function parseResults(raw: string): SopResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* ignore */ }
  return null;
}

const SEVERITY_COLOR: Record<string, string> = {
  '�?: 'bg-red-100 text-red-700',
  '�?: 'bg-orange-100 text-orange-700',
  '�?: 'bg-green-100 text-green-700',
};

/* ─── 三维框架 Mock 数据 ─── */
const SOP_STANDARDS = [
  { label: '场景覆盖�?, benchmark: '�?0%', desc: 'SOP必须覆盖90%以上的常见场�?, color: 'border-blue-300 bg-blue-50/50' },
  { label: '合规达标�?, benchmark: '100%', desc: 'SOP条款不能与平台规则冲�?, color: 'border-orange-300 bg-orange-50/50' },
  { label: '最佳实践对�?, benchmark: '�?0%', desc: '与行业Top10%流程对齐的比�?, color: 'border-green-300 bg-green-50/50' },
];

const REVIEW_QUESTIONS = [
  '1. 哪些缺口场景是最容易引发客诉的？',
  '2. 合规问题的根源是SOP过时还是对规则不了解�?,
  '3. 缺口场景中，哪些可以快速补上，哪些需要时间？',
  '4. 合规冲突的条款，是主动写的还是照搬旧版本�?,
  '5. 升级建议中，哪些是目前团队能力范围内可以做到的？',
  '6. 补全缺口后，SOP的执行难度会不会增加�?,
  '7. 是否需要针对不同平台写不同版本的SOP�?,
  '8. 下次更新SOP前，能否先做一次规则变更排查？',
];

export default function SopCheckupPage() {
  const [input, setInput] = useState('');
  const [name, setName] = useState('');
  const { loading, result, error, usageCount, limitReached, startCheckup, reset } = useAiCheckup();
  const { profile, authFetch } = useAuth();
  const parsed = result ? parseResults(result) : null;
  const [productProfile, setProductProfile] = useState<ProductProfile | null>(null);
  const [expandedReview, setExpandedReview] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => { setProductProfile(loadProductProfile()); }, []);

  const handleStart = () => {
    if (!input.trim()) return;
    if (limitReached) { toast.error('体检次数已达上限，解锁专业版享受无限次体检'); return; }
    const fullInput = name ? `SOP名称�?{name}\n\n${input}` : input;
    const ctx = productProfile ? buildProductContext(productProfile) : null;
    startCheckup('sop', fullInput, undefined, ctx, profile?.role || 'personal_user');
  };

  const handleSave = useCallback(async () => {
    if (!result || !profile) return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.companyId || null,
          category: 'SOP体检',
          content: result,
          question: name ? `SOP名称�?{name}\n${input}` : input,
          answer: parsed ? `缺口${parsed.gaps.length}�?合规${parsed.compliance.length}�?升级${parsed.upgrades.length}项` : 'SOP体检结果',
          scene: name ? `SOP体检 - ${name}` : 'SOP体检',
          tags: `${name || 'SOP'},SOP体检`,
          is_preset: false,
          created_by: profile.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '保存失败');
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : '保存失败');
    }
  }, [result, profile, name, input, parsed, authFetch]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📋 SOP体检</h1>
        <p className="text-lg text-gray-500 mt-1">查漏补缺，让你的流程更完�?/p>
        <p className="text-base text-gray-400 mt-1">上传你的SOP，AI帮你找出漏掉的场景和违规条款</p>
        {productProfile && productProfile.category && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 border border-blue-200">
              <Package className="w-3.5 h-3.5" />
              基于{productProfile.category}行业标准优化
            </div>
            <Link href="/product-profile-personal" className="text-xs text-gray-400 hover:text-blue-600">修改</Link>
          </div>
        )}
      </div>

      {/* ══�?🎯 目标板块：SOP标准 ══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 完整SOP标准</h2>
        <p className="text-base text-gray-500 mb-4">一份合格SOP必须达到的三大基�?/p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SOP_STANDARDS.map((s, i) => (
            <div key={i} className={`p-4 rounded-xl border-2 ${s.color}`}>
              <div className="text-base font-bold text-gray-800">{s.label}</div>
              <div className="text-3xl font-black mt-1">{s.benchmark}</div>
              <div className="text-sm text-gray-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ══�?🛤�?路径板块：用户提交SOP ══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🛤�?提交你的SOP</h2>
        <p className="text-base text-gray-500 mb-3">粘贴你的SOP内容，AI将按上方标准进行体检</p>

        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 space-y-2 mb-4">
          <p className="text-blue-700 font-medium text-base">💡 这个页面能帮你：</p>
          <ul className="text-sm text-gray-800 space-y-1 ml-5 list-disc">
            <li>检查你的SOP有没有漏掉常见场景，别等出了问题才发现没覆盖</li>
            <li>扫描SOP里跟平台规则冲突的条款，提前规避风险</li>
            <li>按行业最佳实践帮你补全缺失环节，让流程更完整</li>
          </ul>
          <p className="text-xs text-gray-500">使用方法：在下方粘贴你的SOP内容，点「开始体检」就能拿到诊断报�?/p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">SOP名称</label>
            <input
              type="text"
              className="w-full p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：售后退款SOP"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">SOP内容</label>
            <textarea
              className="w-full h-56 p-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="粘贴你的SOP完整内容..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => downloadCheckupTemplate('sop', !['personal_user','efficiency_user'].includes(profile?.role || ''))}
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
                    const rows = await importCheckupSheet(file, 'sop');
                    if (rows.length > 0) {
                      const text = rows.map(r => `${r['流程环节'] || ''}�?{r['当前操作'] || ''}（耗时${r['耗时(分钟)'] || '?'}分钟�?{r['问题类型'] || ''}）`).join('\n');
                      setInput(prev => prev ? prev + '\n' + text : text);
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
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '🩺 体检�?..' : '🩺 开始体检'}
            </button>
            {limitReached && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <p className="text-amber-700 font-medium">体检次数已达上限�?次）</p>
                <Link href="/membership" className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">解锁专业�?· 无限次体检</Link>
              </div>
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
          <span className="text-lg text-gray-500">AI正在体检你的SOP...</span>
        </div>
      )}

      {!loading && parsed && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 体检结果</h2>
          <p className="text-base text-gray-500 mb-4">缺口(�? + 合规(�? + 升级(�? 三色分类</p>
          <div className="space-y-6">
            {/* Gaps */}
            {parsed.gaps && parsed.gaps.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                  🔴 缺口扫描 �?未覆盖的场景
                  <button
                    onClick={() => setExpandedReview(prev => ({ ...prev, gaps: !prev.gaps }))}
                    className="text-sm text-red-600 font-bold hover:text-red-700 underline"
                  >
                    ⚠️ 未达�?�?{expandedReview.gaps ? '收起复盘' : '查看复盘'}
                  </button>
                </h3>
                <div className="space-y-2">
                  {parsed.gaps.map((g, i) => (
                    <div key={i} className="p-4 border-2 border-red-200 rounded-lg bg-red-50/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-sm font-bold ${SEVERITY_COLOR[g.severity] || 'bg-gray-100 text-gray-700'}`}>
                          {g.severity}
                        </span>
                        <span className="font-bold text-base text-gray-800">{g.scenario}</span>
                      </div>
                      <p className="text-sm text-gray-600 ml-16">{g.description}</p>
                      <Link
                        href="/after-sales-guide/create"
                        className="inline-flex items-center gap-1 ml-16 mt-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                      >
                        ✏️ 去补一条售后攻�?
                      </Link>
                    </div>
                  ))}
                </div>
                {expandedReview.gaps && (
                  <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-base font-bold text-red-700 mb-3">🔍 缺口复盘8�?/div>
                    <div className="space-y-2">
                      {REVIEW_QUESTIONS.map((q, qi) => (
                        <div key={qi} className="text-sm text-gray-700">{q}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compliance */}
            {parsed.compliance && parsed.compliance.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-orange-700 mb-3 flex items-center gap-2">
                  🟠 合规检�?�?与规则冲突的条款
                  <button
                    onClick={() => setExpandedReview(prev => ({ ...prev, compliance: !prev.compliance }))}
                    className="text-sm text-orange-600 font-bold hover:text-orange-700 underline"
                  >
                    ⚠️ 未达�?�?{expandedReview.compliance ? '收起复盘' : '查看复盘'}
                  </button>
                </h3>
                <div className="space-y-2">
                  {parsed.compliance.map((c, i) => (
                    <div key={i} className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50/50">
                      <div className="font-bold text-base text-gray-800 mb-1">{c.clause}</div>
                      <div className="text-sm text-orange-700 mb-1">问题：{c.issue}</div>
                      <div className="text-sm text-green-700">建议：{c.suggestion}</div>
                    </div>
                  ))}
                </div>
                {expandedReview.compliance && (
                  <div className="mt-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-base font-bold text-orange-700 mb-3">🔍 合规复盘8�?/div>
                    <div className="space-y-2">
                      {REVIEW_QUESTIONS.map((q, qi) => (
                        <div key={qi} className="text-sm text-gray-700">{q}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upgrades */}
            {parsed.upgrades && parsed.upgrades.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-green-700 mb-3">🟢 升级建议 �?行业最佳实�?/h3>
                <div className="space-y-2">
                  {parsed.upgrades.map((u, i) => (
                    <div key={i} className="p-4 border-2 border-green-200 rounded-lg bg-green-50/50">
                      <div className="font-bold text-base text-gray-800 mb-1">{u.area}</div>
                      <div className="text-sm text-gray-600 mb-1">最佳实践：{u.bestPractice}</div>
                      <div className="text-sm text-green-700">行动：{u.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className={`px-5 py-2.5 rounded-lg text-base font-bold transition-colors ${
                  saveStatus === 'saved' ? 'bg-green-600 text-white' :
                  saveStatus === 'error' ? 'bg-red-500 text-white' :
                  saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                  'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saveStatus === 'saving' ? '�?保存�?..' :
                 saveStatus === 'saved' ? '�?已保存到我的知识�? :
                 saveStatus === 'error' ? '�?保存失败' :
                 '💾 保存到我的知识库'}
              </button>
              <button className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-base font-bold hover:bg-green-700 transition-colors">
                📥 一键导出优化版SOP
              </button>
            </div>
            {saveError && <p className="text-sm text-red-500 mt-1">{saveError}</p>}
          </div>
        </div>
      )}

      {!loading && result && !parsed && (
        <div className="p-4 bg-gray-50 border rounded-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-2">📊 体检结果</h2>
          <div className="text-base text-gray-700 whitespace-pre-wrap">{result}</div>
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                saveStatus === 'saved' ? 'bg-green-600 text-white' :
                saveStatus === 'error' ? 'bg-red-500 text-white' :
                saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saveStatus === 'saving' ? '�?保存�?..' :
               saveStatus === 'saved' ? '�?已保存到我的知识�? :
               saveStatus === 'error' ? '�?保存失败' :
               '💾 保存到我的知识库'}
            </button>
            {saveError && <p className="text-sm text-red-500 mt-1">{saveError}</p>}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-300 text-center pt-4 border-t">
        提交的数据将用于优化AI分析能力，帮你和更多人获得更好的结果，我们不会泄露您的商业信�?
      </p>
    </div>
  );
}
