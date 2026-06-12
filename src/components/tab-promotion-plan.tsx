'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Flame, Users, MessageSquare, AlertTriangle, ChevronDown, ChevronRight,
  Copy, Check, Sparkles, Download, FileText, Clock, RotateCcw, Plus, Trash2
} from 'lucide-react';

/* ---------- Types ---------- */

interface PromoPlan {
  name: string;
  startDate: string;
  endDate: string;
  volumeMultiplier: string;
  activityType: string;
  teamSize: number;
  addStaffCount: number;
  maxWorkHours: number;
  tempStaff: string;
  // 话术
  rulesScript: string;
  stockOutScript: string;
  delayShipScript: string;
  refundScript: string;
  // 人员排班
  shifts: ShiftItem[];
  // 应急预案
  emergencyPlans: EmergencyPlan[];
  // 团队复盘字段
  attendanceRate: string;
  newProgress: string;
  complaintCount: string;
  moraleStatus: string;
  trainingRate: string;
}

interface ShiftItem {
  label: string;
  staff: string;
  hours: string;
}

interface EmergencyPlan {
  trigger: string;
  steps: string[];
  escalation: string;
}

interface PromoHistoryItem {
  id: string;
  name: string;
  date: string;
  type: string;
  plan: PromoPlan;
  aiResult: string;
  createdAt: string;
}

/* ---------- Defaults ---------- */

const DEFAULT_SHIFTS: ShiftItem[] = [
  { label: '早班 (8:00-16:00)', staff: '', hours: '8' },
  { label: '晚班 (16:00-24:00)', staff: '', hours: '8' },
  { label: '通宵班 (0:00-8:00)', staff: '', hours: '8' },
];

const DEFAULT_EMERGENCY: EmergencyPlan[] = [
  {
    trigger: '流量突增超过预估2倍',
    steps: ['启动备用客服账号，临时增开接待位', '调整自动回复，引导客户自助查询常见问题', '紧急调配其他岗位人员临时支援'],
    escalation: '持续1小时未缓解→通知主管，启动外部临时工方案',
  },
  {
    trigger: '客诉量暴增，差评率超过5%',
    steps: ['集中处理高优先级投诉（退款/换货）', '统一口径回复，避免不同客服说法不一', '记录典型客诉案例，活动后复盘'],
    escalation: '单日差评率超过10%→通知老板，启动专项赔偿方案',
  },
  {
    trigger: '系统/平台故障，无法正常接单',
    steps: ['立即切换到备用联系方式（电话/微信）', '在店铺首页公告故障情况+预计恢复时间', '故障恢复后优先处理积压订单'],
    escalation: '故障超过30分钟→通知老板，考虑活动延期或补偿方案',
  },
];

const getDefaultPromoPlan = (): PromoPlan => ({
  name: '',
  startDate: '',
  endDate: '',
  volumeMultiplier: '2',
  activityType: '大促',
  teamSize: 3,
  addStaffCount: 2,
  maxWorkHours: 10,
  tempStaff: '',
  rulesScript: '',
  stockOutScript: '',
  delayShipScript: '',
  refundScript: '',
  shifts: [...DEFAULT_SHIFTS],
  emergencyPlans: DEFAULT_EMERGENCY.map(e => ({ ...e, steps: [...e.steps] })),
  attendanceRate: '',
  newProgress: '',
  complaintCount: '',
  moraleStatus: '正常',
  trainingRate: '',
});

const ACTIVITY_TYPES = ['大促', '日常活动', '预售', '直播专场'];
const MULTIPLIER_OPTIONS = [
  { value: '1.5', label: '1.5倍' },
  { value: '2', label: '2倍' },
  { value: '3', label: '3倍' },
  { value: '5', label: '5倍' },
];

const PRESET_SCRIPTS: Record<string, Record<string, string>> = {
  rulesScript: {
    '大促': '亲，本次活动满XX减XX，可以和店铺优惠券叠加使用哦~凑单更划算！活动期间下单，预计XX天内发货，急单请联系客服备注~',
    '预售': '亲，预售商品需先付定金XX元，尾款在XX月XX日-XX日支付，逾期定金不退哦~付尾款后XX天内发货~',
    '直播专场': '亲，直播间专属价格仅限直播期间下单哦，下播后恢复原价~拍下后XX小时内发货~',
    '日常活动': '亲，当前活动为XX，优惠力度有限，建议尽快下单锁定价格~',
  },
  stockOutScript: {
    default: '亲，非常抱歉，该款式目前售罄了😭 我们正在紧急补货中，预计XX天到货。您可以先收藏，到货后第一时间通知您~或者看看其他款式？',
  },
  delayShipScript: {
    default: '亲，非常抱歉让您久等了！大促期间订单量激增，您的订单预计延迟XX天发货。我们会尽快安排，感谢您的耐心等待~如有急用可联系客服加急处理。',
  },
  refundScript: {
    default: '亲，大促期间退款处理可能稍有延迟，请您谅解~我们会在收到退货后XX小时内为您处理退款。如需换货，可以直接拍下新商品，退货运费由我们承担~',
  },
};

/* ---------- Component ---------- */

export default function TabPromotionPlan({ userId }: { userId: string }) {
  const [promoPlan, setPromoPlan] = useState<PromoPlan>(getDefaultPromoPlan());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true, staff: true, shifts: false, scripts: true, emergency: true, history: false,
  });
  const [promoResult, setPromoResult] = useState('');
  const [promoHistory, setPromoHistory] = useState<PromoHistoryItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  // Load from localStorage
  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(`promo_plan_${userId}`);
      if (saved) setPromoPlan(JSON.parse(saved));
      const hist = localStorage.getItem(`promo_history_${userId}`);
      if (hist) setPromoHistory(JSON.parse(hist));
    } catch {}
  }, [userId]);

  // Save to localStorage
  const savePlan = useCallback((plan: PromoPlan) => {
    if (!userId) return;
    try { localStorage.setItem(`promo_plan_${userId}`, JSON.stringify(plan)); } catch {}
  }, [userId]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updatePlan = (field: keyof PromoPlan, value: unknown) => {
    const newPlan = { ...promoPlan, [field]: value };
    setPromoPlan(newPlan);
    savePlan(newPlan);
  };

  const updateShift = (idx: number, field: keyof ShiftItem, value: string) => {
    const newShifts = promoPlan.shifts.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    updatePlan('shifts', newShifts);
  };

  const updateEmergencyStep = (planIdx: number, stepIdx: number, value: string) => {
    const newPlans = promoPlan.emergencyPlans.map((ep, i) => {
      if (i !== planIdx) return ep;
      const newSteps = ep.steps.map((s, j) => j === stepIdx ? value : s);
      return { ...ep, steps: newSteps };
    });
    updatePlan('emergencyPlans', newPlans);
  };

  const copyToClipboard = async (text: string, field: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch {}
  };

  const fillPresetScript = (field: 'rulesScript' | 'stockOutScript' | 'delayShipScript' | 'refundScript') => {
    const presets = PRESET_SCRIPTS[field];
    const key = field === 'rulesScript' ? promoPlan.activityType : 'default';
    const text = presets[key] || presets['default'] || '';
    updatePlan(field, text);
  };

  // AI generate
  const handleGeneratePromoPlan = async () => {
    setGenerating(true);
    setPromoResult('');
    try {
      const res = await fetch('/api/personal/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` },
        body: JSON.stringify({
          reportType: 'promo_plan',
          template: 'promo_plan',
          metrics: {
            activityName: promoPlan.name || '未命名活动',
            activityType: promoPlan.activityType,
            volumeMultiplier: promoPlan.volumeMultiplier,
            teamSize: promoPlan.teamSize,
            addStaffCount: promoPlan.addStaffCount,
            dateRange: `${promoPlan.startDate || '?'} ~ ${promoPlan.endDate || '?'}`,
          },
        }),
      });
      const data = await res.json();
      if (data.report) {
        setPromoResult(data.report);
        // Save to history
        const newItem: PromoHistoryItem = {
          id: Date.now().toString(),
          name: promoPlan.name || '未命名活动',
          date: new Date().toLocaleDateString('zh-CN'),
          type: promoPlan.activityType,
          plan: { ...promoPlan },
          aiResult: data.report,
          createdAt: new Date().toISOString(),
        };
        const newHistory = [newItem, ...promoHistory].slice(0, 10);
        setPromoHistory(newHistory);
        try { localStorage.setItem(`promo_history_${userId}`, JSON.stringify(newHistory)); } catch {}
      }
    } catch (err) {
      setPromoResult('生成失败，请稍后重试。');
    }
    setGenerating(false);
  };

  // Export as Markdown
  const exportPromoPlan = () => {
    const lines: string[] = [
      `# ${promoPlan.name || '大促预案'}`,
      '',
      `**活动时间**：${promoPlan.startDate || '?'} ~ ${promoPlan.endDate || '?'}`,
      `**活动类型**：${promoPlan.activityType}`,
      `**预估单量倍数**：${promoPlan.volumeMultiplier}倍`,
      '',
      '## 人员预案',
      `- 当前团队：${promoPlan.teamSize}人`,
      `- 需增人数：${promoPlan.addStaffCount}人`,
      `- 每人每日最长工时：${promoPlan.maxWorkHours}小时`,
      `- 临时工/借调：${promoPlan.tempStaff || '无'}`,
      '',
      '### 排班方案',
      ...promoPlan.shifts.map(s => `- ${s.label}：${s.staff || '待分配'}（${s.hours}小时）`),
      '',
      '## 话术预案',
      `### 活动规则话术\n${promoPlan.rulesScript || '未填写'}`,
      `### 库存不足话术\n${promoPlan.stockOutScript || '未填写'}`,
      `### 发货延迟话术\n${promoPlan.delayShipScript || '未填写'}`,
      `### 退款/售后话术\n${promoPlan.refundScript || '未填写'}`,
      '',
      '## 应急预案',
      ...promoPlan.emergencyPlans.map((ep, i) => [
        `### 预案${i + 1}：${ep.trigger}`,
        ...ep.steps.map((s, j) => `${j + 1}. ${s}`),
        `**升级条件**：${ep.escalation}`,
        '',
      ]).flat(),
    ];

    if (promoResult) {
      lines.push('---', '', '## AI生成建议', '', promoResult);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `大促预案-${promoPlan.name || '未命名'}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadHistory = (item: PromoHistoryItem) => {
    setPromoPlan(item.plan);
    setPromoResult(item.aiResult);
    savePlan(item.plan);
  };

  // Section wrapper
  const Section = ({ id, icon, title, color, children }: {
    id: string; icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
  }) => (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className={`w-full flex items-center justify-between px-4 py-3 ${color} text-left`}
      >
        <span className="flex items-center gap-2 font-semibold text-base">
          {icon} {title}
        </span>
        {expandedSections[id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {expandedSections[id] && <div className="p-4 space-y-4 bg-white">{children}</div>}
    </div>
  );

  // Input helper
  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
  );

  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <Section id="basic" icon={<Flame className="w-5 h-5" />} title="活动基本信息" color="bg-orange-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>活动名称</FieldLabel>
            <input
              type="text" value={promoPlan.name}
              onChange={e => updatePlan('name', e.target.value)}
              placeholder="如：618大促、双11、年货节"
              className="w-full px-3 py-2.5 border rounded-lg text-base"
            />
          </div>
          <div>
            <FieldLabel>活动类型</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {ACTIVITY_TYPES.map(t => (
                <button key={t}
                  onClick={() => updatePlan('activityType', t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    promoPlan.activityType === t
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>开始日期</FieldLabel>
            <input type="date" value={promoPlan.startDate}
              onChange={e => updatePlan('startDate', e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-base" />
          </div>
          <div>
            <FieldLabel>结束日期</FieldLabel>
            <input type="date" value={promoPlan.endDate}
              onChange={e => updatePlan('endDate', e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-base" />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>预估日单量（平时倍数）</FieldLabel>
            <div className="flex gap-2">
              {MULTIPLIER_OPTIONS.map(o => (
                <button key={o.value}
                  onClick={() => updatePlan('volumeMultiplier', o.value)}
                  className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${
                    promoPlan.volumeMultiplier === o.value
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                  }`}
                >{o.label}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 人员预案 */}
      <Section id="staff" icon={<Users className="w-5 h-5" />} title="人员预案" color="bg-orange-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel>当前团队人数</FieldLabel>
            <input type="number" min={1} max={50} value={promoPlan.teamSize}
              onChange={e => updatePlan('teamSize', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 border rounded-lg text-base" />
          </div>
          <div>
            <FieldLabel>大促需增人数（建议）</FieldLabel>
            <input type="number" min={0} max={20} value={promoPlan.addStaffCount}
              onChange={e => updatePlan('addStaffCount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border rounded-lg text-base" />
            <p className="text-xs text-gray-500 mt-1">
              按{promoPlan.volumeMultiplier}倍流量，建议增配 {Math.max(1, Math.round(promoPlan.teamSize * (parseFloat(promoPlan.volumeMultiplier) - 1) * 0.5))} 人
            </p>
          </div>
          <div>
            <FieldLabel>每人每日最长工时</FieldLabel>
            <input type="number" min={6} max={16} value={promoPlan.maxWorkHours}
              onChange={e => updatePlan('maxWorkHours', parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2.5 border rounded-lg text-base" />
          </div>
        </div>
        <div>
          <FieldLabel>临时工/借调人员安排</FieldLabel>
          <textarea value={promoPlan.tempStaff}
            onChange={e => updatePlan('tempStaff', e.target.value)}
            placeholder="如：临时工2人（需培训1天）、借调仓库1人"
            rows={2} className="w-full px-3 py-2.5 border rounded-lg text-base" />
        </div>
      </Section>

      {/* 排班方案 */}
      <Section id="shifts" icon={<Clock className="w-5 h-5" />} title="大促排班方案" color="bg-orange-50">
        <div className="space-y-3">
          {promoPlan.shifts.map((shift, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 min-w-[160px]">{shift.label}</span>
              <input type="text" value={shift.staff}
                onChange={e => updateShift(idx, 'staff', e.target.value)}
                placeholder="人员姓名" className="flex-1 px-3 py-2 border rounded-lg text-base" />
              <span className="text-sm text-gray-500">{shift.hours}h</span>
            </div>
          ))}
          <button
            onClick={() => updatePlan('shifts', [...promoPlan.shifts, { label: '新班次', staff: '', hours: '8' }])}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-4 h-4" /> 添加班次
          </button>
        </div>
      </Section>

      {/* 话术预案 */}
      <Section id="scripts" icon={<MessageSquare className="w-5 h-5" />} title="话术预案" color="bg-blue-50">
        <div className="space-y-4">
          {([
            ['rulesScript', '活动规则话术', '满减/凑单/预售尾款等'],
            ['stockOutScript', '库存不足话术', ''],
            ['delayShipScript', '发货延迟话术', ''],
            ['refundScript', '退款/售后话术', ''],
          ] as const).map(([field, label, hint]) => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1">
                <FieldLabel>{label}</FieldLabel>
                <div className="flex gap-2">
                  <button
                    onClick={() => fillPresetScript(field)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> 填充模板
                  </button>
                  <button
                    onClick={() => copyToClipboard(promoPlan[field], field)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {copiedField === field ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedField === field ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
              <textarea
                value={promoPlan[field]}
                onChange={e => updatePlan(field, e.target.value)}
                placeholder={hint || '输入话术内容...'}
                rows={3}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 应急预案 */}
      <Section id="emergency" icon={<AlertTriangle className="w-5 h-5" />} title="应急预案" color="bg-red-50">
        <div className="space-y-4">
          {promoPlan.emergencyPlans.map((ep, idx) => (
            <div key={idx} className="p-3 bg-red-50/50 border border-red-200 rounded-lg space-y-3">
              <div>
                <FieldLabel>触发条件</FieldLabel>
                <input type="text" value={ep.trigger}
                  onChange={e => {
                    const newPlans = promoPlan.emergencyPlans.map((p, i) => i === idx ? { ...p, trigger: e.target.value } : p);
                    updatePlan('emergencyPlans', newPlans);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-base font-medium text-red-700" />
              </div>
              <div>
                <FieldLabel>处理步骤</FieldLabel>
                <div className="space-y-2">
                  {ep.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-600 min-w-[24px]">{sIdx + 1}.</span>
                      <input type="text" value={step}
                        onChange={e => updateEmergencyStep(idx, sIdx, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-base" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>升级条件</FieldLabel>
                <input type="text" value={ep.escalation}
                  onChange={e => {
                    const newPlans = promoPlan.emergencyPlans.map((p, i) => i === idx ? { ...p, escalation: e.target.value } : p);
                    updatePlan('emergencyPlans', newPlans);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-base text-orange-700" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* AI生成 + 导出 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleGeneratePromoPlan}
          disabled={generating}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-semibold disabled:opacity-50 transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          {generating ? 'AI生成中...' : 'AI生成大促预案'}
        </button>
        <button
          onClick={exportPromoPlan}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-semibold transition-colors"
        >
          <Download className="w-5 h-5" /> 导出预案
        </button>
        <button
          onClick={() => { setPromoPlan(getDefaultPromoPlan()); setPromoResult(''); savePlan(getDefaultPromoPlan()); }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-base font-semibold transition-colors"
        >
          <RotateCcw className="w-5 h-5" /> 重置
        </button>
      </div>

      {/* AI结果 */}
      {promoResult && (
        <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl">
          <h3 className="text-lg font-bold text-orange-800 mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> AI生成的大促预案建议
          </h3>
          <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">{promoResult}</div>
        </div>
      )}

      {/* 历史预案 */}
      <Section id="history" icon={<FileText className="w-5 h-5" />} title="历史预案" color="bg-gray-50">
        {promoHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无历史预案，生成后会自动保存</p>
        ) : (
          <div className="space-y-2">
            {promoHistory.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{item.type} · {item.date}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadHistory(item)}
                    className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1">加载</button>
                  <button onClick={() => {
                    const newHist = promoHistory.filter(h => h.id !== item.id);
                    setPromoHistory(newHist);
                    try { localStorage.setItem(`promo_history_${userId}`, JSON.stringify(newHist)); } catch {}
                  }}
                    className="text-sm text-red-500 hover:text-red-700 px-2 py-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
