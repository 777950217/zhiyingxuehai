'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAiCheckup } from '@/hooks/use-ai-checkup';
import { useAuth } from '@/lib/auth-context';
import { loadProductProfile, buildProductContext, type ProductProfile } from '@/lib/product-profile-helper';
import Link from 'next/link';
import { ArrowRight, Download, Upload } from 'lucide-react';
import { downloadCheckupTemplate, importCheckupSheet } from '@/lib/checkup-template-helper';

interface Feasibility { module: string; difficulty: number; note: string }
interface Vulnerability { gap: string; impact: string; priority: string }
interface ActionStep { step: string; priority: number; timeline: string; prerequisite: string }
interface PlanResult { feasibility: Feasibility[]; vulnerabilities: Vulnerability[]; actionPlan: ActionStep[] }

function parseResults(raw: string): PlanResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* ignore */ }
  return null;
}

const PRIORITY_COLOR: Record<string, string> = {
  '�?: 'bg-red-100 text-red-700',
  '�?: 'bg-orange-100 text-orange-700',
  '�?: 'bg-green-100 text-green-700',
};

/* ─── 三维框架 Mock 数据 ─── */
const PLAN_STANDARDS = [
  { label: '可行性评�?, benchmark: '�?.5/5', desc: '各模块落地难度评估，低于3.5分需重新规划', color: 'border-blue-300 bg-blue-50/50' },
  { label: '漏洞清零', benchmark: '0个高优先�?, desc: '方案中不能有高优先级漏洞未修�?, color: 'border-red-300 bg-red-50/50' },
  { label: '行动覆盖', benchmark: '100%', desc: '每个漏洞必须有对应的行动清单和时间线', color: 'border-green-300 bg-green-50/50' },
];

const REVIEW_QUESTIONS = [
  '1. 方案中哪个模块的可行性最低？主要障碍是什么？',
  '2. 高优先级漏洞如果不修复，最严重的后果是什么？',
  '3. 行动清单中的前置条件，目前是否已满足�?,
  '4. 方案执行需要多少人力投入？当前团队够吗�?,
  '5. 哪些行动项的时间线过于紧张？需要调整吗�?,
  '6. 方案执行过程中，最大的风险点在哪里�?,
  '7. 是否有替代方案可以降低执行难度？',
  '8. 下次提交方案前，能否先自查这些漏洞点�?,
];

export default function PlanCheckupPage() {
  const [input, setInput] = useState('');
  const { profile, authFetch } = useAuth();
  const role = profile?.role || 'personal_user';
  const isLimited = role === 'personal_user' || role === 'staff' || role === 'efficiency_user';
  const [planName, setPlanName] = useState('');
  const { loading, result, error, startCheckup, reset, usageCount, limitReached } = useAiCheckup();
  const parsed = result ? parseResults(result) : null;
  const [productProfile, setProductProfile] = useState<ProductProfile | null>(null);
  const [expandedReview, setExpandedReview] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

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
          category: '方案体检',
          content: result,
          question: planName ? `方案名称�?{planName}\n${input}` : input,
          answer: parsed ? `可行�?{parsed.feasibility.length}�?漏洞${parsed.vulnerabilities.length}�?行动${parsed.actionPlan.length}步` : '方案体检结果',
          scene: `方案体检 - ${planName || '管理方案'}`,
          tags: `${planName || '管理方案'},方案体检`,
          is_preset: false,
          created_by: profile.id,
        }),
      });
      if (!res.ok) throw new Error('保存失败');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      setSaveStatus('error');
      setSaveError(e instanceof Error ? e.message : '保存失败');
    }
  }, [result, profile, input, planName, parsed, authFetch]);

  useEffect(() => { setProductProfile(loadProductProfile()); }, []);

  const handleStart = () => {
    if (!input.trim()) return;
    const fullInput = planName ? `方案名称�?{planName}\n\n${input}` : input;
    const ctx = productProfile ? buildProductContext(productProfile) : null;
    startCheckup('plan', fullInput, undefined, ctx, role);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎓 方案体检</h1>
        <p className="text-lg text-gray-500 mt-1">你的管理方案能不能落�?/p>
        <p className="text-base text-gray-400 mt-1">提交毕业管理方案，AI帮你评估可行�?找漏�?/p>
        {productProfile && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 border border-blue-200">
              基于{productProfile.brand}{productProfile.category}优化
            </div>
            <Link href="/product-profile-personal" className="text-xs text-gray-400 hover:text-blue-600">修改</Link>
          </div>
        )}
      </div>

      {/* ══�?🎯 目标板块 ══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 可行性与完整性标�?/h2>
        <p className="text-base text-gray-500 mb-4">一份合格方案必须达到的三大基准</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_STANDARDS.map((s, i) => (
            <div key={i} className={`p-4 rounded-xl border-2 ${s.color}`}>
              <div className="text-base font-bold text-gray-800">{s.label}</div>
              <div className="text-3xl font-black mt-1">{s.benchmark}</div>
              <div className="text-sm text-gray-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ══�?🛤�?路径板块：用户提交方�?══�?*/}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🛤�?提交方案</h2>
        <p className="text-base text-gray-500 mb-3">粘贴你的管理方案内容，AI将按上方基准体检</p>

        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 space-y-2 mb-4">
          <p className="text-blue-700 font-medium text-base">💡 这个页面能帮你：</p>
          <ul className="text-sm text-gray-800 space-y-1 ml-5 list-disc">
            <li>评估你的管理方案能不能真正落地，不是纸上谈兵</li>
            <li>找出方案里的关键漏洞，别等执行了才发现缺环节</li>
            <li>按优先级给你行动清单，知道先做什么后做什�?/li>
          </ul>
          <p className="text-xs text-gray-500">使用方法：在下方粘贴你的管理方案内容，点「开始体检」就能拿到评估报�?/p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">方案名称</label>
            <input
              type="text"
              className="w-full p-2.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：我的客服团队管理方�?
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">方案内容</label>
            <textarea
              className="w-full h-64 p-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="粘贴你的管理方案完整内容，包括：&#10;- 团队架构与分�?#10;- 工作流程SOP&#10;- KPI考核方案&#10;- 培训计划&#10;- 话术管理方案&#10;- 质检标准&#10;..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                const isEnterprise = ['enterprise_manager', 'enterprise_admin', 'admin'].includes(role);
                downloadCheckupTemplate('plan', isEnterprise);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
            >
              <Download className="w-4 h-4" /> 下载模板
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-200 text-green-700 rounded-md hover:bg-green-50 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" /> 导入表格
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const rows = await importCheckupSheet(file, 'plan');
                  if (rows.length > 0) {
                    const text = rows.map(r => `${r['问题类型']||''}: ${r['当前方案']||''}`).filter(Boolean).join('\n');
                    setInput((prev) => prev ? prev + '\n\n' + text : text);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="flex gap-3">
            {limitReached ? (
              <button
                onClick={() => window.location.href = '/membership'}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-lg text-lg font-bold hover:from-blue-700 hover:to-sky-600 transition-colors"
              >
                🔓 解锁专业�?�?无限次体检
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '🩺 体检�?..' : '🩺 开始体检'}
              </button>
            )}
            {isLimited && !limitReached && (
              <span className="text-sm text-gray-500 self-center">剩余 {3 - usageCount}/3 �?/span>
            )}
            {result && (
              <button onClick={reset} className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                重新体检
              </button>
            )}
            {result && (
              <Link href="/learning-path" className="inline-flex items-center gap-1 text-base text-sky-600 hover:text-sky-700 ml-2">
                返回课程继续学习 <ArrowRight className="w-4 h-4" />
              </Link>
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
          <span className="text-lg text-gray-500">AI正在体检你的方案...</span>
        </div>
      )}

      {!loading && parsed && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 体检结果</h2>
          <p className="text-base text-gray-500 mb-4">评分 + 漏洞清单 + 行动清单</p>
          <div className="space-y-6">
            {/* Feasibility */}
            {parsed.feasibility && parsed.feasibility.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                  📊 可行性评�?
                  {parsed.feasibility.some(f => f.difficulty < 4) && (
                    <button
                      onClick={() => setExpandedReview(prev => ({ ...prev, feasibility: !prev.feasibility }))}
                      className="text-sm text-red-600 font-bold hover:text-red-700 underline"
                    >
                      ⚠️ 未达�?�?{expandedReview.feasibility ? '收起复盘' : '查看复盘'}
                    </button>
                  )}
                </h3>
                <div className="space-y-2">
                  {parsed.feasibility.map((f, i) => (
                    <div key={i} className={`p-4 border-2 rounded-xl flex items-center gap-4 ${f.difficulty < 4 ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                      <div className="flex-1">
                        <div className="font-bold text-base text-gray-800">{f.module}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{f.note}</div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-xl ${star <= f.difficulty ? 'text-yellow-400' : 'text-gray-200'}`}>�?/span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {expandedReview.feasibility && (
                  <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-base font-bold text-red-700 mb-3">🔍 可行性复�?�?/div>
                    <div className="space-y-2">
                      {REVIEW_QUESTIONS.map((q, qi) => (
                        <div key={qi} className="text-sm text-gray-700">{q}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vulnerabilities */}
            {parsed.vulnerabilities && parsed.vulnerabilities.length > 0 && (
              <div className="p-4 border-2 border-red-200 rounded-xl bg-red-50/50">
                <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                  ⚠️ 漏洞提醒
                  <button
                    onClick={() => setExpandedReview(prev => ({ ...prev, vulnerabilities: !prev.vulnerabilities }))}
                    className="text-sm text-red-600 font-bold hover:text-red-700 underline"
                  >
                    ⚠️ 未达�?�?{expandedReview.vulnerabilities ? '收起复盘' : '查看复盘'}
                  </button>
                </h3>
                <div className="space-y-3">
                  {parsed.vulnerabilities.map((v, i) => (
                    <div key={i} className="text-base">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-sm font-bold ${PRIORITY_COLOR[v.priority] || 'bg-gray-100 text-gray-700'}`}>
                          {v.priority}优先�?
                        </span>
                        <span className="font-bold text-gray-800">{v.gap}</span>
                      </div>
                      <p className="text-sm text-gray-600 ml-16">不补上的后果：{v.impact}</p>
                    </div>
                  ))}
                </div>
                {expandedReview.vulnerabilities && (
                  <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-base font-bold text-red-700 mb-3">🔍 漏洞复盘8�?/div>
                    <div className="space-y-2">
                      {REVIEW_QUESTIONS.map((q, qi) => (
                        <div key={qi} className="text-sm text-gray-700">{q}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Plan */}
            {parsed.actionPlan && parsed.actionPlan.length > 0 && (
              <div className="p-4 border-2 border-green-200 rounded-xl bg-green-50/50">
                <h3 className="text-lg font-bold text-green-700 mb-3">🚀 落地行动清单（按优先级排序）</h3>
                <div className="space-y-2">
                  {parsed.actionPlan
                    .sort((a, b) => a.priority - b.priority)
                    .map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-green-50">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-green-600 text-white text-sm flex items-center justify-center font-bold">
                          {a.priority}
                        </span>
                        <div className="flex-1">
                          <div className="font-bold text-base text-gray-800">{a.step}</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            建议时间：{a.timeline}
                            {a.prerequisite && <span className="ml-2">前置条件：{a.prerequisite}</span>}
                          </div>
                        </div>
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
