'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  type PositionTemplate,
  type KpiSchemeConfig,
  type ScoringSystem,
  positionTemplates,
  defaultFaultTolerance,
  pointsResultMappings,
  percentageResultMapping,
} from '@/lib/kpi-templates';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Users, Calendar,
  ClipboardList, Send, AlertTriangle, Loader2,
} from 'lucide-react';

// ========== 类型定义 ==========

/** 员工信息 */
interface AgentInfo {
  id: string;
  name: string;
  position: string;
  employee_id?: string;
}

/** 指标录入�?*/
interface IndicatorRow {
  dimensionId: string;
  dimensionName: string;
  indicatorId: string;
  indicatorName: string;
  targetValue: string;
  actualValue: string;
  scoreChange: number;
  faultToleranceUsed: boolean;
  faultToleranceReason: string;
}

/** 员工考核数据 */
interface AgentAssessmentData {
  agent: AgentInfo;
  indicators: IndicatorRow[];
  totalScore: number;
  totalDeduction: number;
  totalBonus: number;
  salaryEffect: string;
  hrAction: string;
}

// ========== 辅助函数 ==========

/** 岗位标签映射 */
const positionLabels: Record<string, string> = {
  '售中客服': '售前客服',
  '售后客服': '售后客服',
  '组长': '组长',
  '主管': '主管',
};

/** 岗位到模板类型的映射 */
function positionToTemplateType(position: string): 'presales' | 'aftersales' | null {
  if (position === '售中客服') return 'presales';
  if (position === '售后客服') return 'aftersales';
  return null;
}

/** 计算指标得分变化 */
function calculateScoreChange(
  scoringSystem: ScoringSystem,
  indicator: IndicatorRow,
): number {
  // 简化版计算逻辑：根据实际值是否达标判�?
  const actual = parseFloat(indicator.actualValue);
  if (isNaN(actual)) return 0;

  const target = indicator.targetValue;
  let change = 0;

  if (scoringSystem === 'percentage') {
    // 百分比扣薪制：不达标扣底薪百分比
    if (target.startsWith('�?)) {
      const targetNum = parseFloat(target.replace(/[≥≤%]/g, ''));
      if (!isNaN(targetNum) && actual < targetNum) {
        const gap = targetNum - actual;
        change = -(Math.min(gap * 0.5, 3)); // 最多扣3%
      }
    } else if (target.startsWith('�?)) {
      const targetNum = parseFloat(target.replace(/[≥≤%]/g, ''));
      if (!isNaN(targetNum) && actual > targetNum) {
        const gap = actual - targetNum;
        change = -(Math.min(gap * 0.5, 3));
      }
    } else if (target === '0�? || target === '0') {
      change = actual > 0 ? -(actual * 1) : 0; // 每次�?%
    }
  } else {
    // 积分制：不达标扣�?
    if (target.startsWith('�?)) {
      const targetNum = parseFloat(target.replace(/[≥≤%]/g, ''));
      if (!isNaN(targetNum) && actual < targetNum) {
        const gap = targetNum - actual;
        change = -(Math.min(gap * 2, 20)); // 最多扣20�?
      } else if (!isNaN(targetNum) && actual >= targetNum) {
        change = 5; // 达标奖励5�?
      }
    } else if (target === '0�? || target === '0') {
      change = actual > 0 ? -(actual * 8) : 10; // 0�?10分，每次-8�?
    }
  }

  return change;
}

// ========== 主组�?==========

export default function KpiAssessmentExecutePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schemeId = searchParams.get('schemeId');
  const { profile, hasAccess } = useAuth();

  // 权限检查：个人版不能进�?
  const isReadOnly = profile?.role === 'personal_user';
  const canOperate = !isReadOnly && hasAccess('kpi-assessment');

  // 步骤状�?
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 方案数据
  const [scheme, setScheme] = useState<{
    id: string;
    name: string;
    config: KpiSchemeConfig;
  } | null>(null);

  // �?步：选择月份和员�?
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // 默认当月
  );
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());

  // �?步：录入实际�?
  const [assessmentData, setAssessmentData] = useState<AgentAssessmentData[]>([]);

  // �?步：确认发布
  const [confirmed, setConfirmed] = useState(false);

  // ========== 数据加载 ==========

  // 加载方案
  useEffect(() => {
    if (!schemeId) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
    const accessToken = token ? JSON.parse(token).access_token : '';
    fetch(`/api/kpi-schemes/${schemeId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.scheme) {
          setScheme({
            id: data.scheme.id,
            name: data.scheme.name,
            config: data.scheme.config as KpiSchemeConfig,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [schemeId]);

  // 加载员工列表
  useEffect(() => {
    const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
    const accessToken = token ? JSON.parse(token).access_token : '';
    fetch('/api/agents', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAgents(data.filter((a: AgentInfo) => a.position && a.position !== '离职'));
        } else if (data.agents) {
          setAgents(data.agents.filter((a: AgentInfo) => a.position && a.position !== '离职'));
        }
      })
      .catch(console.error);
  }, []);

  // 生成考核录入数据
  const generateAssessmentData = useCallback(() => {
    if (!scheme) return;

    const selectedAgents = agents.filter(a => selectedAgentIds.has(a.id));
    const config = scheme.config;
    const scoringSystem = config.scoringSystem;

    const data: AgentAssessmentData[] = selectedAgents.map(agent => {
      // 根据员工岗位获取对应模板
      const templateType = positionToTemplateType(agent.position);
      const template: PositionTemplate | undefined = templateType
        ? positionTemplates[templateType]
        : undefined;

      // 生成指标�?
      const indicators: IndicatorRow[] = [];

      if (template) {
        // 使用模板中的维度和指�?
        for (const dim of template.dimensions) {
          // 检查该维度是否在方案的选中维度�?
          if (config.selectedDimensionIds.length > 0 && !config.selectedDimensionIds.includes(dim.id)) continue;

          for (const ind of dim.indicators) {
            indicators.push({
              dimensionId: dim.id,
              dimensionName: dim.name,
              indicatorId: ind.id,
              indicatorName: ind.name,
              targetValue: ind.targetValue,
              actualValue: '',
              scoreChange: 0,
              faultToleranceUsed: false,
              faultToleranceReason: '',
            });
          }
        }
      }

      // 加入自定义指�?
      for (const ci of config.customIndicators) {
        indicators.push({
          dimensionId: ci.dimensionId,
          dimensionName: ci.dimensionId === 'custom' ? '自定�? : ci.dimensionId,
          indicatorId: ci.id,
          indicatorName: ci.name,
          targetValue: ci.targetValue,
          actualValue: '',
          scoreChange: 0,
          faultToleranceUsed: false,
          faultToleranceReason: '',
        });
      }

      return {
        agent,
        indicators,
        totalScore: scoringSystem === 'points' ? 100 : 0,
        totalDeduction: 0,
        totalBonus: 0,
        salaryEffect: '',
        hrAction: '',
      };
    });

    setAssessmentData(data);
  }, [scheme, agents, selectedAgentIds]);

  // ========== 交互处理 ==========

  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAgents = () => {
    if (selectedAgentIds.size === agents.length) {
      setSelectedAgentIds(new Set());
    } else {
      setSelectedAgentIds(new Set(agents.map(a => a.id)));
    }
  };

  const handleActualValueChange = (
    agentIndex: number,
    indicatorIndex: number,
    value: string,
  ) => {
    setAssessmentData(prev => {
      const next = [...prev];
      const agentData = { ...next[agentIndex] };
      const indicators = [...agentData.indicators];
      indicators[indicatorIndex] = {
        ...indicators[indicatorIndex],
        actualValue: value,
      };
      // 重新计算得分
      if (scheme && value !== '') {
        indicators[indicatorIndex].scoreChange = calculateScoreChange(
          scheme.config.scoringSystem,
          indicators[indicatorIndex],
        );
      }
      agentData.indicators = indicators;

      // 汇总计�?
      let totalScore = scheme?.config.scoringSystem === 'points' ? 100 : 0;
      let totalDeduction = 0;
      let totalBonus = 0;
      for (const ind of indicators) {
        if (ind.scoreChange > 0) totalBonus += ind.scoreChange;
        else if (ind.scoreChange < 0) totalDeduction += Math.abs(ind.scoreChange);
        totalScore += ind.scoreChange;
      }
      agentData.totalScore = Math.round(totalScore * 100) / 100;
      agentData.totalDeduction = Math.round(totalDeduction * 100) / 100;
      agentData.totalBonus = Math.round(totalBonus * 100) / 100;

      // 结果应用
      if (scheme?.config.scoringSystem === 'points') {
        const mapping = pointsResultMappings.find(
          m => totalScore >= m.minScore && totalScore <= m.maxScore
        );
        if (mapping) {
          agentData.salaryEffect = mapping.salaryEffect;
          agentData.hrAction = mapping.hrAction;
        }
      } else {
        agentData.salaryEffect = totalDeduction > 0
          ? `累计扣罚${totalDeduction.toFixed(1)}%底薪`
          : '无扣�?;
        agentData.hrAction = totalDeduction >= 5
          ? '需参加服务优化培训'
          : '正常';
      }

      next[agentIndex] = agentData;
      return next;
    });
  };

  const handleFaultToleranceToggle = (
    agentIndex: number,
    indicatorIndex: number,
    used: boolean,
  ) => {
    setAssessmentData(prev => {
      const next = [...prev];
      const agentData = { ...next[agentIndex] };
      const indicators = [...agentData.indicators];
      indicators[indicatorIndex] = {
        ...indicators[indicatorIndex],
        faultToleranceUsed: used,
        scoreChange: used ? 0 : indicators[indicatorIndex].scoreChange,
      };
      agentData.indicators = indicators;
      next[agentIndex] = agentData;
      return next;
    });
  };

  const handleFaultToleranceReason = (
    agentIndex: number,
    indicatorIndex: number,
    reason: string,
  ) => {
    setAssessmentData(prev => {
      const next = [...prev];
      const agentData = { ...next[agentIndex] };
      const indicators = [...agentData.indicators];
      indicators[indicatorIndex] = {
        ...indicators[indicatorIndex],
        faultToleranceReason: reason,
      };
      agentData.indicators = indicators;
      next[agentIndex] = agentData;
      return next;
    });
  };

  // 提交考核
  const handleSubmit = async () => {
    if (!scheme || !selectedMonth) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
      const accessToken = token ? JSON.parse(token).access_token : '';

      const payload = {
        schemeId: scheme.id,
        period: selectedMonth,
        agentIds: assessmentData.map(d => d.agent.id),
        details: assessmentData.map(d => ({
          agentId: d.agent.id,
          totalScore: d.totalScore,
          totalDeduction: d.totalDeduction,
          totalBonus: d.totalBonus,
          salaryEffect: d.salaryEffect,
          hrAction: d.hrAction,
          indicatorDetails: d.indicators.map(ind => ({
            dimensionId: ind.dimensionId,
            indicatorId: ind.indicatorId,
            indicatorName: ind.indicatorName,
            targetValue: ind.targetValue,
            actualValue: ind.actualValue,
            isAchieved: ind.scoreChange >= 0 && ind.actualValue !== '',
            scoreChange: ind.scoreChange,
            faultToleranceUsed: ind.faultToleranceUsed,
            faultToleranceReason: ind.faultToleranceReason,
          })),
        })),
      };

      const res = await fetch('/api/kpi-assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建考核失败');
      }

      // 发布考核记录
      const result = await res.json();
      if (result.assessments && result.assessments.length > 0) {
        // 逐条发布
        for (const assessment of result.assessments) {
          await fetch(`/api/kpi-assessments/${assessment.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              status: 'published',
              details: payload.details
                .find(d => d.agentId === assessment.agent_id)
                ?.indicatorDetails || [],
            }),
          });
        }
      }

      setConfirmed(true);
    } catch (err) {
      console.error('提交考核失败:', err);
      alert(err instanceof Error ? err.message : '提交考核失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== 渲染 ==========

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!schemeId || !scheme) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-lg text-gray-500">未找到考核方案</p>
        <Button variant="outline" onClick={() => router.push('/kpi-assessment/list')}>
          返回方案列表
        </Button>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-lg text-gray-500">个人版不支持发起考核</p>
        <Button variant="outline" onClick={() => router.push('/kpi-assessment')}>
          返回KPI考核
        </Button>
      </div>
    );
  }

  const steps = [
    { num: 1, label: '选择月份与员�?, icon: Calendar },
    { num: 2, label: '录入考核数据', icon: ClipboardList },
    { num: 3, label: '确认并发�?, icon: Send },
  ];

  const scoringLabel = scheme.config.scoringSystem === 'percentage'
    ? '百分比扣薪制'
    : '积分�?;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部标题�?*/}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/kpi-assessment/list')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">发起考核</h1>
              <p className="text-sm text-gray-500">
                方案：{scheme.name} · {scoringLabel}
              </p>
            </div>
          </div>
          {/* 步骤指示�?*/}
          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currentStep === step.num
                    ? 'bg-blue-600 text-white'
                    : currentStep > step.num
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {currentStep > step.num ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                  {step.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${currentStep > step.num ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ===== �?步：选择月份与员�?===== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* 选择月份 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  选择考核月份
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-60"
                />
              </CardContent>
            </Card>

            {/* 选择员工 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    选择参与考核的员�?
                  </span>
                  <Button variant="outline" size="sm" onClick={toggleAllAgents}>
                    {selectedAgentIds.size === agents.length ? '取消全�? : '全�?}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <p className="text-gray-400 py-8 text-center">暂无在职员工</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {agents.map(agent => (
                      <div
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAgentIds.has(agent.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <Checkbox
                          checked={selectedAgentIds.has(agent.id)}
                          onCheckedChange={() => toggleAgent(agent.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{agent.name}</p>
                          <p className="text-xs text-gray-500">
                            {agent.employee_id && `${agent.employee_id} · `}
                            {positionLabels[agent.position] || agent.position}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-sm text-gray-500">
                  已选择 {selectedAgentIds.size} / {agents.length} �?
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  generateAssessmentData();
                  setCurrentStep(2);
                }}
                disabled={selectedAgentIds.size === 0 || !selectedMonth}
                className="bg-blue-600 hover:bg-blue-700"
              >
                下一步：录入考核数据
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== �?步：录入考核数据 ===== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {assessmentData.map((agentData, agentIdx) => (
              <Card key={agentData.agent.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    {agentData.agent.name}
                    <Badge variant="outline" className="text-xs">
                      {positionLabels[agentData.agent.position] || agentData.agent.position}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2 w-24">维度</th>
                          <th className="text-left p-2">指标</th>
                          <th className="text-center p-2 w-28">目标�?/th>
                          <th className="text-center p-2 w-28">实际�?/th>
                          <th className="text-center p-2 w-24">
                            {scheme.config.scoringSystem === 'percentage' ? '扣罚(%)' : '得分变化'}
                          </th>
                          <th className="text-center p-2 w-16">容错</th>
                          <th className="text-left p-2 w-40">容错原因</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentData.indicators.map((ind, indIdx) => (
                          <tr key={ind.indicatorId} className="border-b hover:bg-gray-50">
                            <td className="p-2 text-gray-600 font-medium">{ind.dimensionName}</td>
                            <td className="p-2 font-medium">{ind.indicatorName}</td>
                            <td className="p-2 text-center text-gray-600">{ind.targetValue}</td>
                            <td className="p-2">
                              <Input
                                value={ind.actualValue}
                                onChange={e => handleActualValueChange(agentIdx, indIdx, e.target.value)}
                                placeholder="输入实际�?
                                className="h-8 text-center"
                              />
                            </td>
                            <td className={`p-2 text-center font-medium ${
                              ind.scoreChange > 0 ? 'text-green-600' :
                              ind.scoreChange < 0 ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {ind.actualValue ? (ind.scoreChange > 0 ? '+' : '') + ind.scoreChange.toFixed(1) : '-'}
                            </td>
                            <td className="p-2 text-center">
                              <Checkbox
                                checked={ind.faultToleranceUsed}
                                onCheckedChange={v => handleFaultToleranceToggle(agentIdx, indIdx, !!v)}
                              />
                            </td>
                            <td className="p-2">
                              {ind.faultToleranceUsed && (
                                <Input
                                  value={ind.faultToleranceReason}
                                  onChange={e => handleFaultToleranceReason(agentIdx, indIdx, e.target.value)}
                                  placeholder="填写豁免原因"
                                  className="h-8 text-xs"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* 汇�?*/}
                  <div className="mt-3 flex items-center gap-4 text-sm pt-3 border-t">
                    <span>
                      总得分：<strong className={agentData.totalScore < 60 ? 'text-red-600' : 'text-gray-900'}>
                        {agentData.totalScore}
                      </strong>
                    </span>
                    <span className="text-red-500">
                      扣罚：{agentData.totalDeduction.toFixed(1)}
                      {scheme.config.scoringSystem === 'percentage' ? '%底薪' : '�?}
                    </span>
                    <span className="text-green-600">
                      奖励�?{agentData.totalBonus.toFixed(1)}
                      {scheme.config.scoringSystem === 'percentage' ? '%底薪' : '�?}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                上一�?
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                下一步：确认发布
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== �?步：确认并发�?===== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {confirmed ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">考核已发�?/h2>
                  <p className="text-gray-500 mb-6">
                    {selectedMonth} 月考核已成功发布，�?{assessmentData.length} 名员�?
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={() => router.push('/kpi-assessment/records')}>
                      查看考核记录
                    </Button>
                    <Button onClick={() => router.push('/kpi-assessment/list')}>
                      返回方案列表
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-blue-500" />
                      确认考核结果
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-500">考核月份</p>
                          <p className="font-bold text-lg">{selectedMonth}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-500">参与人数</p>
                          <p className="font-bold text-lg">{assessmentData.length}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-500">计分体系</p>
                          <p className="font-bold text-lg">{scoringLabel}</p>
                        </div>
                      </div>

                      {/* 每个员工汇�?*/}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-2">员工</th>
                            <th className="text-left p-2">岗位</th>
                            <th className="text-center p-2">总得�?/th>
                            <th className="text-center p-2">扣罚</th>
                            <th className="text-center p-2">奖励</th>
                            <th className="text-left p-2">薪酬影响</th>
                            <th className="text-left p-2">HR措施</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assessmentData.map(d => (
                            <tr key={d.agent.id} className="border-b">
                              <td className="p-2 font-medium">{d.agent.name}</td>
                              <td className="p-2 text-gray-600">{positionLabels[d.agent.position] || d.agent.position}</td>
                              <td className={`p-2 text-center font-bold ${
                                d.totalScore < 60 ? 'text-red-600' :
                                d.totalScore < 80 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {d.totalScore}
                              </td>
                              <td className="p-2 text-center text-red-500">
                                {d.totalDeduction.toFixed(1)}{scheme.config.scoringSystem === 'percentage' ? '%' : '�?}
                              </td>
                              <td className="p-2 text-center text-green-600">
                                +{d.totalBonus.toFixed(1)}{scheme.config.scoringSystem === 'percentage' ? '%' : '�?}
                              </td>
                              <td className="p-2 text-gray-700">{d.salaryEffect || '-'}</td>
                              <td className="p-2 text-gray-700">{d.hrAction || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    上一�?
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />发布�?..</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" />确认发布考核</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
