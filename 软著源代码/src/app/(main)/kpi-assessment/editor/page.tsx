'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Save, Download, Edit3, CheckCircle2, AlertTriangle,
  Plus, Trash2, Target, Shield, Info,
} from 'lucide-react';
import {
  type PositionType,
  type ScoringSystem,
  type KpiDimension,
  type KpiIndicator,
  type FaultToleranceConfig,
  type CustomDimension,
  type CustomIndicator,
  type ExemptionType,
  presalesTemplate,
  aftersalesTemplate,
  positionTemplates,
  pointsResultMappings,
  percentageResultMapping,
  defaultFaultTolerance,
  defaultSpecialSceneAdaptation,
  exemptionLabels,
} from '@/lib/kpi-templates';

// ─── 可编辑单元格 ───
function EditableCell({ value, onSave, editable = true }: {
  value: string;
  onSave: (v: string) => void;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (!editable) {
    return <span className="text-sm text-gray-700">{value || '-'}</span>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== value) onSave(draft); }}
        onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onSave(draft); } if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        className="w-full px-1 py-0.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="text-sm text-gray-700 cursor-pointer hover:bg-indigo-50 px-1 py-0.5 rounded transition-colors min-h-[24px] inline-block"
      title="点击编辑"
    >
      {value || <span className="text-gray-300 italic">点击填写</span>}
    </span>
  );
}

// ─── 方案数据类型（从API加载�?───
interface SchemeData {
  id: string;
  name: string;
  positions: PositionType[];
  cycle: string;
  scoring_system: ScoringSystem;
  selected_dimension_ids: string[];
  dimension_weights: Record<string, number>;
  fault_tolerance: FaultToleranceConfig;
  custom_dimensions: CustomDimension[];
  custom_indicators: CustomIndicator[];
  ai_evaluation: unknown;
  status: string;
  effective_period: string | null;
}

// ─── 主组件（包裹Suspense�?───
export default function KPIEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">加载�?..</div>}>
      <KPIEditorContent />
    </Suspense>
  );
}

function KPIEditorContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schemeId = searchParams.get('schemeId');

  const role = profile?.role;
  const isPersonal = role === 'personal_user';

  // 如果个人版进入编辑器，重定向
  useEffect(() => {
    if (isPersonal) router.replace('/kpi-assessment');
  }, [isPersonal, router]);

  const [scheme, setScheme] = useState<SchemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [weightError, setWeightError] = useState('');

  // 特殊场景适配
  const [specialScenes, setSpecialScenes] = useState(defaultSpecialSceneAdaptation);

  // 加载方案数据
  const fetchScheme = useCallback(async () => {
    if (!schemeId) { setLoading(false); return; }
    try {
      setLoading(true);
      const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
      const accessToken = token ? JSON.parse(token).access_token : '';
      const res = await fetch(`/api/kpi-schemes/${schemeId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('加载方案失败');
      const data = await res.json();
      setScheme(data.scheme || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [schemeId]);

  useEffect(() => { fetchScheme(); }, [fetchScheme]);

  // 汇总所有维度（模板+自定义）
  const allDimensions: KpiDimension[] = (() => {
    if (!scheme) return [];
    const dims: KpiDimension[] = [];
    for (const pos of scheme.positions) {
      const tpl = positionTemplates[pos];
      if (tpl) dims.push(...tpl.dimensions);
    }
    return dims.filter(d => scheme.selected_dimension_ids.includes(d.id));
  })();

  const customDims: CustomDimension[] = scheme?.custom_dimensions || [];

  // 权重校验
  const totalWeight = (() => {
    const w = scheme?.dimension_weights || {};
    return Object.values(w).reduce((sum, v) => sum + v, 0);
  })();

  useEffect(() => {
    setWeightError(totalWeight === 100 ? '' : `权重合计${totalWeight}%，需调整�?00%`);
  }, [totalWeight]);

  // 保存方案
  const handleSave = async () => {
    if (!scheme || !schemeId) return;
    if (totalWeight !== 100) {
      alert('权重合计必须�?00%才能保存');
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
      const accessToken = token ? JSON.parse(token).access_token : '';
      const res = await fetch(`/api/kpi-schemes/${schemeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: scheme.name,
          positions: scheme.positions,
          cycle: scheme.cycle,
          scoring_system: scheme.scoring_system,
          selected_dimension_ids: scheme.selected_dimension_ids,
          dimension_weights: scheme.dimension_weights,
          fault_tolerance: scheme.fault_tolerance,
          custom_dimensions: scheme.custom_dimensions,
          custom_indicators: scheme.custom_indicators,
        }),
      });
      if (!res.ok) throw new Error('保存失败');
      alert('方案已保�?);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 更新方案局部字�?
  const updateScheme = (updates: Partial<SchemeData>) => {
    setScheme(prev => prev ? { ...prev, ...updates } : prev);
  };

  // 更新指标规则
  const updateIndicatorRule = (dimId: string, indId: string, field: 'percentageRule' | 'pointsRule', value: string) => {
    if (!scheme) return;
    // 规则存在模板数据中，暂不支持直接修改模板规则
    // 自定义指标的规则可以通过custom_indicators更新
    const customIdx = scheme.custom_indicators.findIndex(ci => ci.id === indId);
    if (customIdx >= 0) {
      const updated = [...scheme.custom_indicators];
      updated[customIdx] = { ...updated[customIdx], customRule: value };
      updateScheme({ custom_indicators: updated });
    }
  };

  // 添加自定义维�?
  const addCustomDimension = () => {
    if (!scheme) return;
    const newDim: CustomDimension = {
      id: `custom_dim_${Date.now()}`,
      name: '新维�?,
      weight: 0,
      indicators: [],
    };
    updateScheme({ custom_dimensions: [...scheme.custom_dimensions, newDim] });
  };

  // 添加自定义指�?
  const addCustomIndicator = (dimensionId: string) => {
    if (!scheme) return;
    const newInd: CustomIndicator = {
      id: `custom_ind_${Date.now()}`,
      dimensionId,
      name: '新指�?,
      targetValue: '',
      customRule: '',
      dataSource: '',
    };
    updateScheme({ custom_indicators: [...scheme.custom_indicators, newInd] });
  };

  // ─── 加载�?───
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full mx-auto mb-3" />
          <p className="text-sm">加载方案数据...</p>
        </div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">未找到方案数�?/p>
          <button onClick={() => router.push('/kpi-assessment/list')} className="text-indigo-600 hover:underline text-sm">
            返回方案列表
          </button>
        </div>
      </div>
    );
  }

  // ─── 主界�?───
  const isPercentage = scheme.scoring_system === 'percentage';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/kpi-assessment/list')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <EditableCell
                value={scheme.name}
                onSave={v => updateScheme({ name: v })}
              />
              <div className="text-xs text-gray-400 mt-0.5">
                {scheme.positions.map(p => p === 'presales' ? '售前客服' : '售后客服').join('�?)} ·
                {scheme.cycle === 'monthly' ? '月度' : '季度'} ·
                {isPercentage ? '百分比扣薪制' : '积分�?}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !!weightError}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                saving || weightError
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              }`}
            >
              <Save className="w-4 h-4" /> {saving ? '保存�?..' : '保存'}
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              onClick={() => alert('导出功能开发中')}
            >
              <Download className="w-4 h-4" /> 导出
            </button>
          </div>
        </div>
        {weightError && (
          <div className="max-w-7xl mx-auto px-6 pb-2">
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" /> {weightError}
            </div>
          </div>
        )}
      </div>

      {/* 主内容区：Excel式表�?*/}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-px bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2 px-3 py-2.5 bg-gray-50">维度 / 权重</div>
            <div className="col-span-2 px-3 py-2.5 bg-gray-50">指标</div>
            <div className="col-span-1 px-3 py-2.5 bg-gray-50">目标�?/div>
            <div className="col-span-2 px-3 py-2.5 bg-gray-50">百分比扣薪制</div>
            <div className="col-span-2 px-3 py-2.5 bg-gray-50">积分�?/div>
            <div className="col-span-1 px-3 py-2.5 bg-gray-50">容错</div>
            <div className="col-span-1 px-3 py-2.5 bg-gray-50">数据来源</div>
            <div className="col-span-1 px-3 py-2.5 bg-gray-50">提示</div>
          </div>

          {/* 模板维度�?*/}
          {allDimensions.map((dim) => {
            const weight = scheme.dimension_weights[dim.id] || 0;
            return (
              <div key={dim.id} className="border-b border-gray-100 last:border-b-0">
                {/* 维度标题�?*/}
                <div className="grid grid-cols-12 gap-px bg-indigo-50/50">
                  <div className="col-span-2 px-3 py-2 flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{dim.name}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${weight > 40 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {weight}%
                    </span>
                  </div>
                  <div className="col-span-10 px-3 py-2 text-xs text-gray-500 italic">
                    {dim.description}
                  </div>
                </div>

                {/* 指标�?*/}
                {dim.indicators.map((ind) => (
                  <div key={ind.id} className="grid grid-cols-12 gap-px hover:bg-gray-50/50 transition-colors">
                    <div className="col-span-2 px-3 py-2" /> {/* 空维度列 */}
                    <div className="col-span-2 px-3 py-2">
                      <span className="text-sm text-gray-800">{ind.name}</span>
                    </div>
                    <div className="col-span-1 px-3 py-2">
                      <span className="text-sm text-gray-700">{ind.targetValue}</span>
                    </div>
                    <div className="col-span-2 px-3 py-2">
                      <span className="text-xs text-gray-600 leading-relaxed">{ind.scoringRules.percentageRule}</span>
                    </div>
                    <div className="col-span-2 px-3 py-2">
                      <span className="text-xs text-gray-600 leading-relaxed">{ind.scoringRules.pointsRule}</span>
                    </div>
                    <div className="col-span-1 px-3 py-2">
                      <span className="text-xs text-gray-500">{scheme.fault_tolerance?.maxMinorFaults || 2}�?/span>
                    </div>
                    <div className="col-span-1 px-3 py-2">
                      <span className="text-xs text-gray-500">{ind.dataSource}</span>
                    </div>
                    <div className="col-span-1 px-3 py-2">
                      {ind.tip && (
                        <span className="text-xs text-amber-600" title={ind.tip}>
                          <Info className="w-3 h-3 inline" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* 添加自定义指标按�?*/}
                <div className="grid grid-cols-12 gap-px">
                  <div className="col-span-2" />
                  <div className="col-span-10 px-3 py-1">
                    <button
                      onClick={() => addCustomIndicator(dim.id)}
                      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700"
                    >
                      <Plus className="w-3 h-3" /> 添加自定义指�?
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 自定义维�?*/}
          {customDims.map((cdim) => (
            <div key={cdim.id} className="border-b border-gray-100">
              <div className="grid grid-cols-12 gap-px bg-purple-50/50">
                <div className="col-span-2 px-3 py-2 flex items-center gap-2">
                  <EditableCell value={cdim.name} onSave={v => {
                    const updated = scheme.custom_dimensions.map(d => d.id === cdim.id ? { ...d, name: v } : d);
                    updateScheme({ custom_dimensions: updated });
                  }} />
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">{cdim.weight}%</span>
                  <button onClick={() => updateScheme({ custom_dimensions: scheme.custom_dimensions.filter(d => d.id !== cdim.id) })} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="col-span-10 px-3 py-2 text-xs text-gray-500 italic">自定义维�?/div>
              </div>
              {/* 自定义指标行 */}
              {scheme.custom_indicators.filter(ci => ci.dimensionId === cdim.id).map(ci => (
                <div key={ci.id} className="grid grid-cols-12 gap-px hover:bg-gray-50/50">
                  <div className="col-span-2 px-3 py-2" />
                  <div className="col-span-2 px-3 py-2">
                    <EditableCell value={ci.name} onSave={v => {
                      const updated = scheme.custom_indicators.map(i => i.id === ci.id ? { ...i, name: v } : i);
                      updateScheme({ custom_indicators: updated });
                    }} />
                  </div>
                  <div className="col-span-1 px-3 py-2">
                    <EditableCell value={ci.targetValue} onSave={v => {
                      const updated = scheme.custom_indicators.map(i => i.id === ci.id ? { ...i, targetValue: v } : i);
                      updateScheme({ custom_indicators: updated });
                    }} />
                  </div>
                  <div className="col-span-4 px-3 py-2">
                    <EditableCell value={ci.customRule} onSave={v => updateIndicatorRule(ci.dimensionId, ci.id, 'percentageRule', v)} />
                  </div>
                  <div className="col-span-1 px-3 py-2">
                    <EditableCell value={ci.dataSource} onSave={v => {
                      const updated = scheme.custom_indicators.map(i => i.id === ci.id ? { ...i, dataSource: v } : i);
                      updateScheme({ custom_indicators: updated });
                    }} />
                  </div>
                  <div className="col-span-2 px-3 py-1 flex items-center">
                    <button onClick={() => updateScheme({ custom_indicators: scheme.custom_indicators.filter(i => i.id !== ci.id) })} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-12 gap-px">
                <div className="col-span-2" />
                <div className="col-span-10 px-3 py-1">
                  <button onClick={() => addCustomIndicator(cdim.id)} className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700">
                    <Plus className="w-3 h-3" /> 添加指标
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* 添加自定义维度按�?*/}
          <div className="px-3 py-3 border-t border-gray-100">
            <button onClick={addCustomDimension} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <Plus className="w-4 h-4" /> 添加自定义维�?
            </button>
          </div>
        </div>

        {/* ─── 结果应用规则�?─── */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 积分制映射表 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" /> 积分制结果映�?
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">分数�?/th>
                  <th className="text-left py-2 text-gray-500 font-medium">薪酬影响</th>
                  <th className="text-left py-2 text-gray-500 font-medium">HR动作</th>
                </tr>
              </thead>
              <tbody>
                {pointsResultMappings.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 text-gray-800">{m.minScore}-{m.maxScore}�?/td>
                    <td className="py-2 text-gray-700">{m.salaryEffect}</td>
                    <td className="py-2 text-gray-600">{m.hrAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 百分比扣薪制说明 + 特殊场景 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" /> 百分比扣薪制 & 特殊场景
            </h3>
            <div className="text-xs text-gray-600 mb-3">
              <p className="mb-1">{percentageResultMapping.description}</p>
              <p className="text-gray-500 italic">{percentageResultMapping.baseNote}</p>
            </div>

            {/* 特殊场景开�?*/}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-700 mb-2">特殊场景适配</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specialScenes.probation.enabled}
                    onChange={e => setSpecialScenes(prev => ({
                      ...prev,
                      probation: { ...prev.probation, enabled: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>试用期适配</span>
                  {specialScenes.probation.enabled && <span className="text-gray-400 ml-1">({specialScenes.probation.rule})</span>}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specialScenes.seniorDiff.enabled}
                    onChange={e => setSpecialScenes(prev => ({
                      ...prev,
                      seniorDiff: { ...prev.seniorDiff, enabled: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>职级差异适配</span>
                  {specialScenes.seniorDiff.enabled && <span className="text-gray-400 ml-1">({specialScenes.seniorDiff.rule})</span>}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 豁免条件 & 容错配置 ─── */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> 容错与豁免配�?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 容错次数 */}
            <div>
              <label className="text-xs text-gray-600 block mb-1">通用容错次数�?-5次）</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1} max={5}
                  value={scheme.fault_tolerance?.maxMinorFaults || 2}
                  onChange={e => updateScheme({
                    fault_tolerance: { ...scheme.fault_tolerance, maxMinorFaults: Number(e.target.value) }
                  })}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-sm font-bold text-indigo-600 w-6 text-center">{scheme.fault_tolerance?.maxMinorFaults || 2}</span>
              </div>
            </div>
            {/* 豁免条件 */}
            <div>
              <label className="text-xs text-gray-600 block mb-1">豁免条件</label>
              <div className="space-y-1">
                {(scheme.fault_tolerance?.exemptions || []).map((ex: string) => (
                  <label key={ex} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={e => {
                        const exemptions = e.target.checked
                          ? [...(scheme.fault_tolerance?.exemptions || []), ex]
                          : (scheme.fault_tolerance?.exemptions || []).filter((x: string) => x !== ex);
                        updateScheme({ fault_tolerance: { ...scheme.fault_tolerance, exemptions: exemptions as ExemptionType[] } });
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{(exemptionLabels as Record<string, { label: string; description: string }>)[ex]?.label || ex}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* 轻微失误标准 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <label className="text-xs text-gray-600 block mb-1">轻微失误判定标准</label>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div className="bg-gray-50 rounded p-2">
                <div className="font-medium text-gray-700 mb-0.5">口误</div>
                {scheme.fault_tolerance?.minorFaultCriteria?.verbal_slip || '-'}
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="font-medium text-gray-700 mb-0.5">操作延迟</div>
                {scheme.fault_tolerance?.minorFaultCriteria?.operation_delay || '-'}
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="font-medium text-gray-700 mb-0.5">信息疏漏</div>
                {scheme.fault_tolerance?.minorFaultCriteria?.info_omission || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
