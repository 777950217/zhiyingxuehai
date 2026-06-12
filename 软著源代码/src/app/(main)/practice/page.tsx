'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { PageHint } from '@/components/page-hint';
import { Swords, Copy, Check, Star, RotateCcw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import UpgradeHint from '@/components/upgrade-hint';

/* ─── 场景预设（按角色区分�?─── */
interface ScenePreset {
  label: string;
  value: string;
  emergency?: boolean;
  tips?: string;
  wrongExample?: string;
}

const SCENE_PRESETS_PERSONAL: ScenePreset[] = [
  { label: '售前咨询：尺码推�?, value: '客户问「这个尺码怎么选？我拿不准」，我该怎么引导式推荐，帮客户选对尺码' },
  { label: '价格异议：别家更便宜', value: '客户说「别家更便宜」，我该怎么重塑价值，让客户觉得我们值得�? },
  { label: '催单催发�?, value: '客户催问「怎么还不发货？」，怎么安抚客户情绪同时给出准确信息' },
  { label: '售后退换货处理', value: '客户说「我要退货」，怎么分级判断处理，能挽留的挽留，该退的顺畅退' },
  { label: '差评挽回', value: '客户说「我要给差评」，怎么快速降温、解决问题、挽回好�? },
  { label: '投诉升级：找你们领导', value: '客户说「找你们领导来」，怎么先降温安抚、再给出解决方案，避免升�? },
  { label: '重复催问高效解决', value: '客户说「这个问题我问了好几次了」，怎么一次性彻底解决、不再来�? },
  { label: '促销促单话术', value: '客户问「这个能优惠吗」，怎么用促销话术推动下单，不降价也能成交' },
  // 应急专�?
  { label: '客户情绪激动骂�?, emergency: true,
    value: '客户因为售后问题情绪失控，开始辱骂客服。AI请模拟一个极度愤怒、不听解释、威胁投诉的客户，我来练习应对话�?,
    tips: '正确应对：先降温→认同感受→给出解决方案→转接上�?,
    wrongExample: '�?错误示范：对�?争辩/沉默不回/威胁客户' },
  { label: '客户超额索赔', emergency: true,
    value: '客户要求赔偿金额远超实际损失，不满足就差评或投诉到平台。AI请模拟一个狮子大开口、拿差评威胁、拿平台投诉威胁的客户，我来练习应对话术',
    tips: '正确应对：坚持规则→解释政策→给合理方案→上报处�?,
    wrongExample: '�?错误示范：全盘答�?一口拒�?被威胁就退�? },
  { label: '需要转接上�?, emergency: true,
    value: '遇到超出自己权限或无法解决的问题，客户要求找领导，不相信普通客服。AI请模拟一个问题复杂、要求找领导、不相信客服的客户，我来练习转接话术',
    tips: '正确应对：先尝试解决→说明转接原因→安抚等待→交接信息完�?,
    wrongExample: '�?错误示范：直接甩给上�?不给上级背景/让客户自己找' },
];

const SCENE_PRESETS_STAFF: ScenePreset[] = [
  { label: '处理退货退�?, value: '客户要求退货退款，商品已拆封使用，如何按规定处�? },
  { label: '解答安装问题', value: '客户反馈安装后花洒漏水，如何指导排查并安�? },
  { label: '催付话术', value: '客户下单未付款，如何礼貌催付促成成交' },
  { label: '处理物流异常', value: '客户反馈快递破�?丢件，如何协调补发并安抚' },
  { label: '应对差评威胁', value: '客户以差评要挟要求额外补偿，如何规范处理' },
  { label: '解释保修范围', value: '客户要求保修但已过保或属人为损坏，如何说明政�? },
];

const SCENE_PRESETS_MANAGER: ScenePreset[] = [
  { label: '绩效面谈话术', value: '需要和连续3天KPI不达标的客服做绩效面谈，如何开口、怎么引导改进' },
  { label: '给客服做培训', value: '新客服上岗第一天，我要给她做产品知识培训，怎么讲才能让她记�? },
  { label: '跟老板汇报工作', value: '月度客服数据不好看，需要向老板汇报并给出改进方�? },
  { label: '处理团队冲突', value: '两个客服因为抢单产生矛盾，如何调解并制定规则' },
  { label: '制定质检标准', value: '需要制定一套客服质检评分标准，怎么设定才合�? },
  { label: '激励低士气团队', value: '大促后团队士气低迷，如何开动员会提振精�? },
];

/* ─── 5维评分类�?─── */
interface ScoreResult {
  empathy: number;       // 共情�?
  accuracy: number;      // 准确�?
  compliance: number;    // 合规�?
  efficiency: number;    // 效率
  professionalism: number; // 专业�?
  overall: number;       // 综合得分
  suggestion: string;    // 改进建议
}

function parseScoreFromText(text: string): ScoreResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*"overall"[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fallback */ }
  return null;
}

const SCORE_LABELS: Record<string, string> = {
  empathy: '共情�?,
  accuracy: '准确�?,
  compliance: '合规�?,
  efficiency: '效率',
  professionalism: '专业�?,
};

const SCORE_COLORS: Record<string, string> = {
  empathy: 'bg-pink-100 text-pink-700',
  accuracy: 'bg-blue-100 text-blue-700',
  compliance: 'bg-green-100 text-green-700',
  efficiency: 'bg-slate-100 text-blue-900',
  professionalism: 'bg-purple-100 text-purple-700',
};

function ScoreBar({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-14 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass.replace('text-', 'bg-').replace(/bg-(\w+)-100/, 'bg-$1-500')}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}</span>
    </div>
  );
}

/* ─── 主组�?─── */
export default function PracticePage() {
  const { profile, authFetch } = useAuth();
  const role = profile?.role || 'staff';
  const isPersonal = role === 'personal_user';
  const isManagerRole = role === 'enterprise_manager' || role === 'enterprise_admin' || role === 'admin';

  // 根据角色选择预设场景
  const scenePresets = isPersonal
    ? SCENE_PRESETS_PERSONAL
    : isManagerRole
      ? SCENE_PRESETS_MANAGER
      : SCENE_PRESETS_STAFF;
  const [sceneInput, setSceneInput] = useState('');
  const [customScene, setCustomScene] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedScore, setCopiedScore] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const [emergencyTips, setEmergencyTips] = useState<ScenePreset | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async () => {
    const scene = customScene || sceneInput;
    if (!scene.trim()) {
      toast.error('请选择或输入一个练习场�?);
      return;
    }
    if (!profile?.companyId) {
      toast.error('请先完成产品档案配置');
      return;
    }

    setLoading(true);
    setScriptText('');
    setScoreResult(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await authFetch('/api/ai/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `[练习模式] 场景�?{scene}。请给出推荐话术，并在话术末尾用JSON格式给出5维评�?1-10�?，维度包括：empathy(共情�?、accuracy(准确�?、compliance(合规�?、efficiency(效率)、professionalism(专业�?、overall(综合得分)和suggestion(改进建议，一句话)。`,
          category: '话术练习',
          userId: profile?.id,
          companyId: profile?.companyId,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `请求失败(${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应�?);

      let fullText = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullText += data.content;
                setScriptText(fullText);
              }
            } catch { /* skip */ }
          }
        }
      }

      // 解析评分
      const score = parseScoreFromText(fullText);
      if (score) setScoreResult(score);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error(err.message || '生成失败');
      }
    } finally {
      setLoading(false);
    }
  }, [customScene, sceneInput, profile, authFetch]);

  const handleCopy = async (text: string, type: 'script' | 'score') => {
    await navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedScore(true);
      setTimeout(() => setCopiedScore(false), 2000);
    }
    toast.success('已复�?);
  };

  const handleReset = () => {
    setSceneInput('');
    setCustomScene('');
    setScriptText('');
    setScoreResult(null);
    setShowPresets(true);
    setEmergencyTips(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-900/10 flex items-center justify-center">
            <Swords className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">话术练兵�?/h1>
              {isPersonal ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">通用�?/span>
              ) : isManagerRole ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">管理�?/span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">实战�?/span>
              )}
            </div>
            <PageHint text="练出好话术——AI生成+模拟对练+自动评分，越练越会说话�? />
          </div>
        </div>
        {(scriptText || customScene) && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />重置
          </Button>
        )}
      </div>

      {/* 场景选择�?*/}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowPresets(!showPresets)}
        >
          <span className="font-medium text-sm">快速选择场景</span>
          {!isPersonal && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              🎯 根据你的{isManagerRole ? '管理' : '客服'}角色推荐
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isManagerRole ? 'bg-purple-50 text-purple-600 border border-purple-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                {isManagerRole ? '管理�? : '实战�?}
              </span>
            </span>
          )}
          {showPresets ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
        {showPresets && (
          <div className="space-y-3">
            {/* 常规场景 */}
            <div className="flex flex-wrap gap-2">
              {scenePresets.filter(s => !s.emergency).map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setSceneInput(s.value); setCustomScene(''); setEmergencyTips(null); }}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    sceneInput === s.value && !customScene
                      ? 'bg-blue-900 text-white border-sky-400'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {/* 应急专�?*/}
            {isPersonal && scenePresets.some(s => s.emergency) && (
              <div className="border-t border-red-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">应�?/span>
                  <span className="text-xs text-red-600 font-medium">极端场景——新手最怕遇到的情况</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scenePresets.filter(s => s.emergency).map((s) => (
                    <button
                      key={s.label}
                      onClick={() => { setSceneInput(s.value); setCustomScene(''); setEmergencyTips(s); }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        sceneInput === s.value && !customScene
                          ? 'bg-red-600 text-white border-red-400'
                          : 'bg-red-50 text-red-700 border-red-200 hover:border-red-400 hover:bg-red-100'
                      }`}
                    >
                      🚨 {s.label}
                    </button>
                  ))}
                </div>
                {/* 应急场景提示卡�?*/}
                {emergencyTips && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <div className="text-sm font-medium text-red-800">�?{emergencyTips.tips}</div>
                    {emergencyTips.wrongExample && (
                      <div className="text-xs text-red-600">{emergencyTips.wrongExample}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">或自定义场景</label>
          <textarea
            value={customScene}
            onChange={(e) => { setCustomScene(e.target.value); if (e.target.value) setSceneInput(''); }}
            placeholder={isPersonal ? "如：客户说尺码不合适想退�?.." : "如：客户说浴室柜颜色和图片不一�?.."}
            className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400"
            rows={2}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading || (!sceneInput && !customScene)}
          className="w-full bg-blue-900 hover:bg-blue-900"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成�?..</> : <><Swords className="w-4 h-4 mr-2" />开始练�?/>}
        </Button>
      </div>

      {/* 话术输出�?*/}
      {scriptText && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm flex items-center gap-1.5">
              <Star className="w-4 h-4 text-sky-400" />推荐话术
            </span>
            <button
              onClick={() => handleCopy(scriptText, 'script')}
              className="text-xs text-gray-500 hover:text-sky-400 flex items-center gap-1"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedScript ? '已复�? : '复制话术'}
            </button>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 bg-gray-50 rounded-lg p-4">
            {scriptText}
          </div>
        </div>
      )}

      {/* 5维评分区 */}
      {scoreResult && (
        <div className="bg-white rounded-xl border p-4 space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm flex items-center gap-1.5">
              <Star className="w-4 h-4 text-slate-500" />5维评�?
            </span>
            <button
              onClick={() => handleCopy(
                `综合得分: ${scoreResult.overall}/10\n共情�? ${scoreResult.empathy} | 准确�? ${scoreResult.accuracy} | 合规�? ${scoreResult.compliance}\n效率: ${scoreResult.efficiency} | 专业�? ${scoreResult.professionalism}\n建议: ${scoreResult.suggestion}`,
                'score'
              )}
              className="text-xs text-gray-500 hover:text-sky-400 flex items-center gap-1"
            >
              {copiedScore ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedScore ? '已复�? : '复制评分'}
            </button>
          </div>

          {/* 综合得分 */}
          <div className="flex items-center justify-center py-3">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={scoreResult.overall >= 7 ? '#f97316' : scoreResult.overall >= 5 ? '#eab308' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={`${(scoreResult.overall / 10) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{scoreResult.overall}</span>
              </div>
            </div>
            <div className="ml-4 text-sm">
              <div className="font-medium">{scoreResult.overall >= 8 ? '优秀' : scoreResult.overall >= 6 ? '良好' : scoreResult.overall >= 4 ? '需改进' : '待提�?}</div>
              <div className="text-gray-500 text-xs">综合得分 / 10</div>
            </div>
          </div>

          {/* 5维明�?*/}
          <div className="space-y-2">
            {(['empathy', 'accuracy', 'compliance', 'efficiency', 'professionalism'] as const).map((key) => (
              <ScoreBar
                key={key}
                label={SCORE_LABELS[key]}
                value={scoreResult[key]}
                colorClass={SCORE_COLORS[key]}
              />
            ))}
          </div>

          {/* 改进建议 */}
          {scoreResult.suggestion && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-blue-900">
              <span className="font-medium">改进建议�?/span>{scoreResult.suggestion}
            </div>
          )}

          {/* 鼓励文案 */}
          <div className="text-center py-2">
            <p className="text-sm text-green-600 font-medium">💪 多练几次，分数会更高�?/p>
          </div>

          {/* 版本提示 - 仅个人版和客服显�?*/}
          {isPersonal && (
            <UpgradeHint
              title="💡 想让团队统一用这套话术？"
              description="解锁专业版，建立团队标准话术库，全员统一口径，AI自动评分"
            />
          )}
          {!isPersonal && !isManagerRole && (
            <UpgradeHint
              title="💡 想定制专属练习场景？"
              description="联系主管解锁旗舰版，解锁管理版场景库，AI针对性出�?
            />
          )}
        </div>
      )}
    </div>
  );
}
