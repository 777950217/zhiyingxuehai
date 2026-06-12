'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  type PositionType,
  type ScoringSystem,
  type AssessmentCycle,
  type ExemptionType,
  type KpiDimension,
  type KpiIndicator,
  type KpiSchemeConfig,
  type CustomDimension,
  type CustomIndicator,
  type FaultToleranceConfig,
  presalesTemplate,
  aftersalesTemplate,
  positionTemplates,
  pointsResultMappings,
  percentageResultMapping,
  defaultFaultTolerance,
  defaultSpecialSceneAdaptation,
  exemptionLabels,
} from '@/lib/kpi-templates';
import {
  Target, ChevronRight, ChevronLeft, Download, Eye, Lock,
  CheckCircle2, AlertTriangle, Sparkles, Calculator, Shield,
  MessageSquare, Headphones, Clock, BarChart3, Lightbulb,
  Plus, Trash2, Zap, Info, FolderOpen,
} from 'lucide-react';

// ─── 步骤定义 ───
interface StepDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const ALL_STEPS: StepDef[] = [
  { key: 'position', label: '选岗�?, icon: <Target className="w-4 h-4" />, description: '选择考核岗位' },
  { key: 'cycle', label: '选周�?, icon: <Clock className="w-4 h-4" />, description: '月度或季�? },
  { key: 'scoring', label: '选计分体�?, icon: <Calculator className="w-4 h-4" />, description: '百分比扣�?积分�? },
  { key: 'focus', label: '选考核重点', icon: <BarChart3 className="w-4 h-4" />, description: '选择考核维度' },
  { key: 'weight', label: '调权�?, icon: <Shield className="w-4 h-4" />, description: '调整维度权重' },
  { key: 'tolerance', label: '容错与豁�?, icon: <CheckCircle2 className="w-4 h-4" />, description: '容错次数/豁免条件' },
  { key: 'custom', label: '自定义补�?, icon: <Plus className="w-4 h-4" />, description: '添加自定义指�? },
  { key: 'ai', label: 'AI评估', icon: <Sparkles className="w-4 h-4" />, description: '考核强度评估（旗舰版�? },
];

// ─── 岗位卡片 ───
const POSITION_OPTIONS: {
  type: PositionType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  gradient: string;
}[] = [
  {
    type: 'presales',
    label: '售前客服',
    desc: '覆盖咨询接待、转化推荐、订单规�?,
    icon: <MessageSquare className="w-8 h-8" />,
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    type: 'aftersales',
    label: '售后客服',
    desc: '覆盖问题解决、满意度、投诉退款控�?,
    icon: <Headphones className="w-8 h-8" />,
    gradient: 'from-purple-500 to-violet-600',
  },
];

// ─── 主组�?───
export default function KPIAssessmentPage() {
  const { profile, hasAccess, authFetch } = useAuth();
  const role = profile?.role;
  const userType = profile?.userType;

  // 权限判断
  const isReadOnly = role === 'personal_user';
  const isEnterprise = role === 'enterprise_admin' || role === 'admin';
  const maxStep = isEnterprise ? 8 : 7; // 非旗舰版无AI评估

  // 当前步骤�?-based�?
  const [currentStep, setCurrentStep] = useState(0);

  // ─── 方案配置状�?───
  const [selectedPositions, setSelectedPositions] = useState<PositionType[]>([]);
  const [cycle, setCycle] = useState<AssessmentCycle>('monthly');
  const [scoringSystem, setScoringSystem] = useState<ScoringSystem>('percentage');
  const [selectedDimensionIds, setSelectedDimensionIds] = useState<string[]>([]);
  const [dimensionWeights, setDimensionWeights] = useState<Record<string, number>>({});
  const [faultTolerance, setFaultTolerance] = useState<FaultToleranceConfig>(defaultFaultTolerance);
  const [customDimensions, setCustomDimensions] = useState<CustomDimension[]>([]);
  const [customIndicators, setCustomIndicators] = useState<CustomIndicator[]>([]);

  // ─── 计算属�?───

  // 根据选中岗位汇总所有维�?
  const allDimensions = useMemo<KpiDimension[]>(() => {
    const dims: KpiDimension[] = [];
    for (const pos of selectedPositions) {
      const tpl = positionTemplates[pos];
      if (tpl) dims.push(...tpl.dimensions);
    }
    return dims;
  }, [selectedPositions]);

  // 选中岗位后自动初始化维度和权�?
  const handlePositionChange = useCallback((pos: PositionType, checked: boolean) => {
    setSelectedPositions(prev => {
      const next = checked ? [...prev, pos] : prev.filter(p => p !== pos);
      // 重新计算维度和权�?
      const dims: KpiDimension[] = [];
      for (const p of next) {
        const tpl = positionTemplates[p];
        if (tpl) dims.push(...tpl.dimensions);
      }
      setSelectedDimensionIds(dims.map(d => d.id));
      const weights: Record<string, number> = {};
      const perDim = dims.length > 0 ? Math.floor(100 / dims.length) : 0;
      const remainder = dims.length > 0 ? 100 - perDim * dims.length : 0;
      dims.forEach((d, i) => {
        weights[d.id] = perDim + (i < remainder ? 1 : 0);
      });
      setDimensionWeights(weights);
      return next;
    });
  }, []);

  // 权重合计
  const weightTotal = useMemo(() => {
    return Object.values(dimensionWeights).reduce((s, w) => s + w, 0);
  }, [dimensionWeights]);

  // 当前步骤的方案配置快�?
  const schemeConfig: KpiSchemeConfig = useMemo(() => ({
    positions: selectedPositions,
    cycle,
    scoringSystem,
    selectedDimensionIds,
    dimensionWeights,
    faultTolerance,
    customDimensions,
    customIndicators,
  }), [selectedPositions, cycle, scoringSystem, selectedDimensionIds, dimensionWeights, faultTolerance, customDimensions, customIndicators]);

  // ─── 步骤是否可前�?───
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: return selectedPositions.length > 0;
      case 1: return !!cycle;
      case 2: return !!scoringSystem;
      case 3: return selectedDimensionIds.length > 0;
      case 4: return weightTotal === 100;
      case 5: return true;
      case 6: return true;
      case 7: return true;
      default: return false;
    }
  }, [currentStep, selectedPositions, cycle, scoringSystem, selectedDimensionIds, weightTotal]);

  // ─── 导航 ───
  const goNext = () => {
    if (currentStep < maxStep - 1 && canProceed) {
      setCurrentStep(currentStep + 1);
    }
  };
  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // ─── 自定义指标操�?───
  const addCustomDimension = () => {
    const id = `custom_dim_${Date.now()}`;
    setCustomDimensions(prev => [...prev, {
      id,
      name: '自定义维�?,
      weight: 0,
      indicators: [],
    }]);
  };
  const removeCustomDimension = (id: string) => {
    setCustomDimensions(prev => prev.filter(d => d.id !== id));
  };
  const updateCustomDimension = (id: string, field: 'name' | 'weight', value: string | number) => {
    setCustomDimensions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const addCustomIndicator = (dimensionId: string) => {
    const id = `custom_ind_${Date.now()}`;
    setCustomIndicators(prev => [...prev, {
      id,
      dimensionId,
      name: '自定义指�?,
      targetValue: '',
      customRule: '',
      dataSource: '',
    }]);
  };
  const removeCustomIndicator = (id: string) => {
    setCustomIndicators(prev => prev.filter(i => i.id !== id));
  };
  const updateCustomIndicator = (id: string, field: keyof CustomIndicator, value: string) => {
    setCustomIndicators(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  // ══════════════════════════════════════�?
  //  渲染各步骤内�?
  // ══════════════════════════════════════�?

  // ─── Step1: 选岗�?───
  const renderStepPosition = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-indigo-500" />
        <span className="text-sm text-gray-500">选择需要考核的岗位，可多选。选中后自动加载对应模板指标�?/span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {POSITION_OPTIONS.map(opt => {
          const checked = selectedPositions.includes(opt.type);
          return (
            <button
              key={opt.type}
              onClick={() => !isReadOnly && handlePositionChange(opt.type, !checked)}
              disabled={isReadOnly}
              className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                checked
                  ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'
              } ${isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
            >
              {checked && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                </div>
              )}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${opt.gradient} text-white mb-3`}>
                {opt.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{opt.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{opt.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {positionTemplates[opt.type].dimensions.map(d => (
                  <span key={d.id} className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">
                    {d.name} {d.defaultWeight}%
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ─── Step2: 选周�?───
  const renderStepCycle = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-indigo-500" />
        <span className="text-sm text-gray-500">选择考核周期。月度考核反馈快，季度考核更全面�?/span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          { value: 'monthly' as AssessmentCycle, label: '月度考核', desc: '每月结算一次，反馈周期短，适合快速迭代改�?, icon: '📅' },
          { value: 'quarterly' as AssessmentCycle, label: '季度考核', desc: '每季度结算一次，数据更稳定，适合成熟团队', icon: '📊' },
        ]).map(opt => {
          const active = cycle === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => !isReadOnly && setCycle(opt.value)}
              disabled={isReadOnly}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                active
                  ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-2">{opt.icon}</div>
              <h3 className="text-lg font-bold text-gray-900">{opt.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ─── Step3: 选计分体�?───
  const renderStepScoring = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-indigo-500" />
        <span className="text-sm text-gray-500">两种计分体系，影响指标扣罚规则的表达方式和员工感知�?/span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          {
            value: 'percentage' as ScoringSystem,
            label: '百分比扣薪制',
            subtitle: '直接扣底薪百分比',
            desc: '指标不达标时，直接从底薪中扣除对应百分比。规则直观，员工感知强�?,
            example: '例：响应超时�?.5%底薪/�?,
            perception: '员工感受：每笔扣款金额明确，紧迫感强',
            icon: <Calculator className="w-8 h-8" />,
            gradient: 'from-blue-500 to-indigo-600',
          },
          {
            value: 'points' as ScoringSystem,
            label: '积分�?,
            subtitle: '加分/扣分�?,
            desc: '�?00分为基准，达标加分、不达标扣分。月末按积分档位决定薪酬�?,
            example: '例：响应超时�?�?次，达标�?0�?,
            perception: '员工感受：有奖有罚，心理接受度更�?,
            icon: <Zap className="w-8 h-8" />,
            gradient: 'from-purple-500 to-violet-600',
          },
        ]).map(opt => {
          const active = scoringSystem === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => !isReadOnly && setScoringSystem(opt.value)}
              disabled={isReadOnly}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                active
                  ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${opt.gradient} text-white mb-3`}>
                {opt.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{opt.label}</h3>
              <p className="text-xs text-indigo-600 font-medium mt-0.5">{opt.subtitle}</p>
              <p className="text-sm text-gray-500 mt-2">{opt.desc}</p>
              <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs font-medium text-gray-700">{opt.example}</p>
              </div>
              <div className="mt-2 flex items-start gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">{opt.perception}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 结果应用预览 */}
      <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
        <h4 className="font-bold text-gray-800 mb-3">
          {scoringSystem === 'percentage' ? '百分比扣薪制 · 结果应用' : '积分�?· 结果应用'}
        </h4>
        {scoringSystem === 'percentage' ? (
          <div className="space-y-2 text-sm text-gray-600">
            <p>{percentageResultMapping.description}</p>
            <p className="text-xs text-gray-400">{percentageResultMapping.baseNote}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-200">
                  <th className="text-left py-2 text-gray-600 font-medium">积分�?/th>
                  <th className="text-left py-2 text-gray-600 font-medium">薪酬影响</th>
                  <th className="text-left py-2 text-gray-600 font-medium">HR动作</th>
                </tr>
              </thead>
              <tbody>
                {pointsResultMappings.map((m, i) => (
                  <tr key={i} className="border-b border-indigo-100">
                    <td className="py-2 text-gray-800 font-medium">{m.minScore}-{m.maxScore}�?/td>
                    <td className="py-2 text-gray-700">{m.salaryEffect}</td>
                    <td className="py-2 text-gray-600">{m.hrAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Step4: 选考核重点 ───
  const renderStepFocus = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-indigo-500" />
        <span className="text-sm text-gray-500">根据选中岗位自动推荐考核维度，取消勾选可排除不需要的维度�?/span>
      </div>
      {selectedPositions.map(pos => {
        const tpl = positionTemplates[pos];
        return (
          <div key={pos} className="space-y-3">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {tpl.name}考核维度
            </h4>
            {tpl.dimensions.map(dim => {
              const checked = selectedDimensionIds.includes(dim.id);
              return (
                <div
                  key={dim.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    checked ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (isReadOnly) return;
                        const next = checked
                          ? selectedDimensionIds.filter(id => id !== dim.id)
                          : [...selectedDimensionIds, dim.id];
                        setSelectedDimensionIds(next);
                        // 重新均分权重
                        const perDim = next.length > 0 ? Math.floor(100 / next.length) : 0;
                        const rem = next.length > 0 ? 100 - perDim * next.length : 0;
                        const newWeights: Record<string, number> = {};
                        next.forEach((id, i) => {
                          // 优先用默认权重，否则均分
                          const tplDim = allDimensions.find(d => d.id === id);
                          newWeights[id] = tplDim ? tplDim.defaultWeight : perDim + (i < rem ? 1 : 0);
                        });
                        // 校验合计是否100，不是则均分
                        const total = Object.values(newWeights).reduce((s, w) => s + w, 0);
                        if (total !== 100) {
                          const p = next.length > 0 ? Math.floor(100 / next.length) : 0;
                          const r = next.length > 0 ? 100 - p * next.length : 0;
                          next.forEach((id, i) => { newWeights[id] = p + (i < r ? 1 : 0); });
                        }
                        setDimensionWeights(newWeights);
                      }}
                      disabled={isReadOnly}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{dim.name}</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">
                          默认 {dim.defaultWeight}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{dim.description}</p>
                      {dim.tip && (
                        <div className="mt-1 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-400">{dim.tip}</span>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {dim.indicators.map(ind => (
                          <span key={ind.id} className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                            {ind.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ─── Step5: 调权�?───
  const renderStepWeight = () => {
    const isOverWeight = (id: string) => (dimensionWeights[id] || 0) > 40;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-indigo-500" />
          <span className="text-sm text-gray-500">调整各维度权重，合计必须等于100%。单个维度超�?0%会触发警告�?/span>
        </div>
        {/* 合计进度�?*/}
        <div className="p-4 rounded-xl bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">权重合计</span>
            <span className={`text-lg font-bold ${weightTotal === 100 ? 'text-green-600' : weightTotal > 100 ? 'text-red-600' : 'text-amber-600'}`}>
              {weightTotal}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                weightTotal === 100 ? 'bg-green-500' : weightTotal > 100 ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(weightTotal, 100)}%` }}
            />
          </div>
          {weightTotal !== 100 && (
            <p className="text-xs text-red-500 mt-2">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              权重合计必须等于100%，当前{weightTotal > 100 ? '超出' : '不足'}{Math.abs(weightTotal - 100)}%
            </p>
          )}
        </div>

        {/* 各维度权重滑�?*/}
        {selectedDimensionIds.map(id => {
          const dim = allDimensions.find(d => d.id === id);
          if (!dim) return null;
          const weight = dimensionWeights[id] || 0;
          const over = isOverWeight(id);
          return (
            <div key={id} className={`p-4 rounded-xl border-2 transition-all ${over ? 'border-red-300 bg-red-50/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-gray-900">{dim.name}</span>
                  <span className="ml-2 text-xs text-gray-400">默认{dim.defaultWeight}%</span>
                </div>
                <span className={`text-lg font-bold ${over ? 'text-red-600' : 'text-indigo-600'}`}>{weight}%</span>
              </div>
              <div className="relative w-full rounded-full h-2" style={{ background: '#e5e7eb' }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weight}
                  style={{ accentColor: '#3b82f6' }}
                  className="w-full h-2 cursor-pointer"
                  onChange={e => {
                    if (isReadOnly) return;
                    const newWeight = parseInt(e.target.value);
                  // 自动等比例调整其他权重，确保合计=100%
                  setDimensionWeights(prev => {
                    const otherIds = Object.keys(prev).filter(k => k !== id);
                    const otherTotal = otherIds.reduce((sum, k) => sum + (prev[k] || 0), 0);
                    const remaining = 100 - newWeight;
                    const next = { ...prev, [id]: newWeight };
                    if (otherTotal > 0 && remaining >= 0) {
                      // 按比例缩减其他维�?
                      otherIds.forEach(k => {
                        next[k] = Math.max(0, Math.round((prev[k] / otherTotal) * remaining));
                      });
                    } else if (remaining < 0) {
                      // 新权重超�?00%，其他归�?
                      otherIds.forEach(k => { next[k] = 0; });
                      next[id] = 100;
                    } else {
                      // otherTotal=0，剩余均�?
                      const each = otherIds.length > 0 ? Math.floor(remaining / otherIds.length) : 0;
                      const remainder = remaining - each * otherIds.length;
                      otherIds.forEach((k, i) => { next[k] = each + (i < remainder ? 1 : 0); });
                    }
                    // 修正舍入误差，确保合计精�?100
                    const total = Object.values(next).reduce((s: number, v: number) => s + v, 0);
                    if (total !== 100 && otherIds.length > 0) {
                      const diff = 100 - total;
                      const sorted = [...otherIds].sort((a: string, b: string) => (next[b] || 0) - (next[a] || 0));
                      for (let i = 0; i < Math.abs(diff); i++) {
                        const k = sorted[i % sorted.length];
                        next[k] = Math.max(0, (next[k] || 0) + (diff > 0 ? 1 : -1));
                      }
                    }
                    return next;
                  });
                }}
                disabled={isReadOnly}
              />
              {over && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  单维度权重超�?0%，考核重心过度集中
                </p>
              )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Step6: 容错与豁�?───
  const renderStepTolerance = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-indigo-500" />
        <span className="text-sm text-gray-500">设置容错次数和豁免条件，避免不可控因素影响考核公平性�?/span>
      </div>

      {/* 容错次数 */}
      <div className="p-5 rounded-xl bg-white border border-gray-200">
        <h4 className="font-bold text-gray-800 mb-3">轻微失误容错次数</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 rounded-full h-2" style={{ background: '#e5e7eb' }}>
            <input
              type="range"
              min={1}
              max={5}
              value={faultTolerance.maxMinorFaults}
              style={{ accentColor: '#3b82f6' }}
              onChange={e => {
                if (isReadOnly) return;
                setFaultTolerance(prev => ({ ...prev, maxMinorFaults: parseInt(e.target.value) }));
              }}
              disabled={isReadOnly}
              className="w-full h-2 cursor-pointer"
            />
          </div>
          <span className="text-2xl font-bold text-indigo-600 w-12 text-center">{faultTolerance.maxMinorFaults}</span>
          <span className="text-sm text-gray-400">�?�?/span>
        </div>
        <p className="text-xs text-gray-400 mt-2">每月允许的轻微失误次数，超出后才开始扣�?/p>

        {/* 轻微失误标准 */}
        <div className="mt-4 space-y-2">
          <h5 className="text-sm font-medium text-gray-700">轻微失误判定标准</h5>
          <div className="space-y-1.5">
            {([
              { key: 'verbal_slip' as const, label: '口误', desc: faultTolerance.minorFaultCriteria.verbal_slip },
              { key: 'operation_delay' as const, label: '操作延迟', desc: faultTolerance.minorFaultCriteria.operation_delay },
              { key: 'info_omission' as const, label: '信息疏漏', desc: faultTolerance.minorFaultCriteria.info_omission },
            ]).map(item => (
              <div key={item.key} className="flex items-start gap-2 text-sm">
                <span className="px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 whitespace-nowrap">{item.label}</span>
                <span className="text-gray-500">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 豁免条件 */}
      <div className="p-5 rounded-xl bg-white border border-gray-200">
        <h4 className="font-bold text-gray-800 mb-3">特殊豁免条件</h4>
        <p className="text-sm text-gray-500 mb-3">以下情况导致的指标异常不计入个人考核</p>
        <div className="space-y-3">
          {(Object.keys(exemptionLabels) as ExemptionType[]).map(key => {
            const info = exemptionLabels[key];
            const checked = faultTolerance.exemptions.includes(key);
            return (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (isReadOnly) return;
                    setFaultTolerance(prev => ({
                      ...prev,
                      exemptions: checked
                        ? prev.exemptions.filter(e => e !== key)
                        : [...prev.exemptions, key],
                    }));
                  }}
                  disabled={isReadOnly}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-medium text-gray-800">{info.label}</span>
                  <p className="text-xs text-gray-500">{info.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── Step7: 自定义补�?───
  const renderStepCustom = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-indigo-500" />
        <span className="text-sm text-gray-500">如果预设维度不够，可以添加自定义维度和指标�?/span>
      </div>

      {/* 自定义维度列�?*/}
      {customDimensions.map(dim => {
        const dimIndicators = customIndicators.filter(i => i.dimensionId === dim.id);
        return (
          <div key={dim.id} className="p-5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30">
            <div className="flex items-center justify-between mb-3">
              <input
                type="text"
                value={dim.name}
                onChange={e => updateCustomDimension(dim.id, 'name', e.target.value)}
                disabled={isReadOnly}
                className="text-lg font-bold bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none text-gray-900"
              />
              {!isReadOnly && (
                <button onClick={() => removeCustomDimension(dim.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">权重�?/span>
              <input
                type="number"
                min={0}
                max={100}
                value={dim.weight}
                onChange={e => updateCustomDimension(dim.id, 'weight', parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-16 px-2 py-1 text-sm border rounded text-center"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
            {/* 该维度下的指�?*/}
            {dimIndicators.map(ind => (
              <div key={ind.id} className="ml-4 mb-2 p-3 rounded-lg bg-white border border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">指标名称</label>
                    <input
                      type="text"
                      value={ind.name}
                      onChange={e => updateCustomIndicator(ind.id, 'name', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 text-sm border rounded mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">目标�?/label>
                    <input
                      type="text"
                      value={ind.targetValue}
                      onChange={e => updateCustomIndicator(ind.id, 'targetValue', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 text-sm border rounded mt-0.5"
                      placeholder="�?�?5%"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">扣罚规则</label>
                    <input
                      type="text"
                      value={ind.customRule}
                      onChange={e => updateCustomIndicator(ind.id, 'customRule', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 text-sm border rounded mt-0.5"
                      placeholder="�?不达标扣0.5%底薪"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">数据来源</label>
                      <input
                        type="text"
                        value={ind.dataSource}
                        onChange={e => updateCustomIndicator(ind.id, 'dataSource', e.target.value)}
                        disabled={isReadOnly}
                        className="w-full px-2 py-1 text-sm border rounded mt-0.5"
                        placeholder="�?质检系统"
                      />
                    </div>
                    {!isReadOnly && (
                      <button onClick={() => removeCustomIndicator(ind.id)} className="text-red-400 hover:text-red-600 pb-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!isReadOnly && (
              <button
                onClick={() => addCustomIndicator(dim.id)}
                className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-4 h-4" /> 添加指标
              </button>
            )}
          </div>
        );
      })}

      {!isReadOnly && (
        <button
          onClick={addCustomDimension}
          className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> 添加自定义维�?
        </button>
      )}

      {customDimensions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无自定义维度，如需补充可点击上方按钮添�?/p>
        </div>
      )}
    </div>
  );

  // ─── Step8: AI评估（旗舰版专属�?───
  const renderStepAI = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <span className="text-sm text-gray-500">AI自动评估当前方案的考核强度，识别过�?过松风险并给出调优建议�?/span>
      </div>

      {/* 一期占位：模拟AI评估 */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h4 className="font-bold text-gray-800">AI考核强度评估</h4>
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">旗舰�?/span>
        </div>

        {/* 评估维度表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-200">
                <th className="text-left py-2 text-gray-600 font-medium">评估维度</th>
                <th className="text-left py-2 text-gray-600 font-medium">强度</th>
                <th className="text-left py-2 text-gray-600 font-medium">AI提示</th>
                <th className="text-left py-2 text-gray-600 font-medium">建议</th>
                <th className="text-left py-2 text-gray-600 font-medium">数据来源</th>
              </tr>
            </thead>
            <tbody>
              {selectedDimensionIds.map(id => {
                const dim = allDimensions.find(d => d.id === id);
                if (!dim) return null;
                const w = dimensionWeights[id] || 0;
                const severity = w > 40 ? 'too_strict' : w < 15 ? 'too_loose' : 'balanced';
                const sevLabel = severity === 'too_strict' ? '偏严' : severity === 'too_loose' ? '偏松' : '适中';
                const sevColor = severity === 'too_strict' ? 'text-red-600' : severity === 'too_loose' ? 'text-amber-600' : 'text-green-600';
                const suggestion = severity === 'too_strict'
                  ? '建议降低�?0%以下，避免考核重心过度集中'
                  : severity === 'too_loose'
                  ? '建议提高�?5%以上，确保该维度有实际约束力'
                  : '权重设置合理';
                return (
                  <tr key={id} className="border-b border-purple-100">
                    <td className="py-2 font-medium text-gray-800">{dim.name}</td>
                    <td className={`py-2 font-medium ${sevColor}`}>{sevLabel}</td>
                    <td className="py-2 text-gray-600">权重{w}%</td>
                    <td className="py-2 text-gray-600">{suggestion}</td>
                    <td className="py-2 text-gray-400 text-xs">
                      {dim.indicators.map(i => i.dataSource).join('�?)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-white/60 border border-purple-100">
          <p className="text-xs text-gray-500">
            <Info className="w-3 h-3 inline mr-1" />
            一期为模拟评估。二期将接入AI模型，基于行业数据和企业历史表现进行智能分析�?
          </p>
        </div>
      </div>
    </div>
  );

  // ─── 步骤渲染映射 ───
  const stepRenderers = [
    renderStepPosition,
    renderStepCycle,
    renderStepScoring,
    renderStepFocus,
    renderStepWeight,
    renderStepTolerance,
    renderStepCustom,
    renderStepAI,
  ];

  // ══════════════════════════════════════�?
  //  主渲�?
  // ══════════════════════════════════════�?

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* 页面标题 */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-7 h-7 text-indigo-600" />
              KPI考核管理
            </h1>
            <p className="text-sm text-gray-500 mt-1">8步选择式方案设计器 · 双计分体�?/p>
          </div>
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={() => {
                  try {
                    const top = window.top || window.parent || window;
                    top.location.href = '/kpi-assessment/list';
                  } catch {
                    window.location.href = '/kpi-assessment/list';
                  }
                }}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <FolderOpen className="w-4 h-4" /> 已有方案
              </button>
            )}
            {isReadOnly && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm">
                <Lock className="w-4 h-4" /> 学习模式
              </span>
            )}
            </div>
          </div>
        </div>

      <div className="px-6 pb-6 flex gap-6">
        {/* 左侧步骤导航 */}
        <div className="w-56 flex-shrink-0">
          <div className="sticky top-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* 进度�?*/}
            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / maxStep) * 100}%` }}
              />
            </div>
            <div className="p-3 space-y-1">
              {ALL_STEPS.slice(0, maxStep).map((step, i) => {
                const isActive = i === currentStep;
                const isCompleted = i < currentStep;
                return (
                  <button
                    key={step.key}
                    onClick={() => {
                      // 只能跳到已完成的步骤或当前步骤的下一�?
                      if (i <= currentStep || isCompleted) setCurrentStep(i);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : isCompleted
                        ? 'text-gray-600 hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <div>
                      <div className="text-sm">{step.label}</div>
                      <div className="text-xs opacity-60">{step.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧内容�?*/}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* 步骤标题 */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {ALL_STEPS[currentStep].icon}
                <h2 className="text-lg font-bold text-gray-900">
                  第{currentStep + 1}步：{ALL_STEPS[currentStep].label}
                </h2>
              </div>
            </div>

            {/* 步骤内容 */}
            <div className="px-6 py-5">
              {stepRenderers[currentStep]?.()}
            </div>

            {/* 底部导航按钮 */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={goPrev}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentStep === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> 上一�?
              </button>

              <div className="text-sm text-gray-400">
                {currentStep + 1} / {maxStep}
              </div>

              {currentStep < maxStep - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!canProceed}
                  className={`flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    canProceed
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  下一�?<ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm transition-all"
                  onClick={async () => {
                    try {
                      const res = await authFetch('/api/kpi-schemes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: schemeConfig.positions.map(p => p === 'presales' ? '售前客服' : '售后客服').join('+') + '考核方案',
                          ...schemeConfig,
                        }),
                      });
                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || `保存失败(HTTP ${res.status})`);
                      }
                      const data = await res.json();
                      const newId = data?.data?.id || data?.id;
                      if (newId) {
                        const targetUrl = `/kpi-assessment/editor?schemeId=${newId}`;
                        try {
                          // iframe环境需用top跳转，否则可能被拦截
                          const top = window.top || window.parent || window;
                          top.location.href = targetUrl;
                        } catch {
                          // 跨域iframe无法访问top，降级用当前window
                          window.location.href = targetUrl;
                        }
                      } else {
                        const listUrl = '/kpi-assessment/list';
                        try {
                          const top = window.top || window.parent || window;
                          top.location.href = listUrl;
                        } catch {
                          window.location.href = listUrl;
                        }
                      }
                    } catch (err) {
                      alert(err instanceof Error ? err.message : '保存方案失败');
                    }
                  }}
                >
                  <Download className="w-4 h-4" /> 生成方案
                </button>
              )}
            </div>
          </div>

          {/* 方案配置预览（折叠） */}
          <details className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <summary className="px-6 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
              <Eye className="w-4 h-4 inline mr-1" /> 当前方案配置预览
            </summary>
            <div className="px-6 pb-4">
              <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-4 overflow-x-auto">
                {JSON.stringify(schemeConfig, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
