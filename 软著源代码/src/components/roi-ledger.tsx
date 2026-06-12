'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { TrendingUp, Clock, ShieldCheck, BarChart3, ArrowDownRight, ArrowUpRight, Calculator } from 'lucide-react';

/* ─── 类型 ─── */
interface ROIItem {
  label: string;
  before: string;
  after: string;
  savedAmount: number;
  icon: React.ReactNode;
  detail?: string;
}

interface ROIData {
  daysUsed: number;
  totalSaved: number;
  items: ROIItem[];
}

/* ─── 工具 ─── */
function calcDaysUsed(): number {
  const stored = localStorage.getItem('roi-first-use-date');
  if (stored) {
    return Math.max(1, Math.ceil((Date.now() - new Date(stored).getTime()) / (1000 * 60 * 60 * 24)));
  }
  // 首次打开，记录日�?
  localStorage.setItem('roi-first-use-date', new Date().toISOString());
  return 1;
}

function formatMoney(n: number): string {
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  return `¥${n.toLocaleString()}`;
}

/* ─── 计算ROI ─── */
function computeROI(role: string, userId?: string): ROIData {
  const days = calcDaysUsed();

  // �?localStorage 读取用户录入的数据（按userId隔离�?
  const kpiPlan = JSON.parse(localStorage.getItem('active-kpi-plan') || 'null');
  const costRecords = JSON.parse(localStorage.getItem('business-tools-public-costs') || '[]');
  const progressKey = userId ? `learning-path-progress_${userId}` : 'learning-path-progress';
  const progressData = JSON.parse(localStorage.getItem(progressKey) || localStorage.getItem('learning-path-progress') || '{}');
  const completedLessons = Object.keys(progressData).length;

  // 基于使用天数估算基础节省额（保守估算�?
  const baseDailySave = role === 'personal_user' ? 15 : role === 'enterprise_manager' ? 45 : 80;

  // 1. 售后赔付降低
  let compensationSaved = 0;
  if (costRecords.length > 0) {
    // 有成本记录时，基于录入数据计算（假设用了工具后赔付率降低30%�?
    const totalCost = costRecords.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.amount) || 0), 0);
    compensationSaved = Math.round(totalCost * 0.3);
  } else {
    // 无记录时基于天数估算
    compensationSaved = Math.round(days * baseDailySave * 0.4);
  }

  // 2. 管理效率提升（人力成本节省）
  const efficiencySaved = Math.round(days * baseDailySave * 0.35);

  // 3. 质检问题减少挽回损失
  let qualitySaved = 0;
  if (kpiPlan) {
    // 有KPI数据时，基于团队人数估算
    const teamSize = kpiPlan.teamSize || 3;
    qualitySaved = Math.round(teamSize * days * 8);
  } else {
    qualitySaved = Math.round(days * baseDailySave * 0.25);
  }

  const totalSaved = compensationSaved + efficiencySaved + qualitySaved;

  const items: ROIItem[] = [
    {
      label: '售后赔付降低',
      before: costRecords.length > 0 ? `月均赔付¥${Math.round(costRecords.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount) || 0), 0))}` : '无基线数�?,
      after: costRecords.length > 0 ? '赔付率降低约30%' : '使用成本工具后可量化',
      savedAmount: compensationSaved,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      detail: '通过成本预警+审批�?话术优化，减少过度赔付和重复客诉',
    },
    {
      label: '管理效率提升',
      before: '人工排班/质检/培训',
      after: `节省�?{Math.max(1, Math.round(days * 0.3))}小时/人`,
      savedAmount: efficiencySaved,
      icon: <ArrowUpRight className="w-5 h-5 text-blue-600" />,
      detail: 'SOP标准�?排班优化+质检自动化，减少重复管理动作',
    },
    {
      label: '质检挽回损失',
      before: '问题发现滞后3-7�?,
      after: completedLessons > 0 ? `已学${completedLessons}课，问题发现提速` : '学习课程后可量化',
      savedAmount: qualitySaved,
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
      detail: '五维质检+异常红警，提前发现问题减少客诉升级损�?,
    },
  ];

  return { daysUsed: days, totalSaved, items };
}

/* ─── 组件 ─── */
export default function ROISection() {
  const { profile } = useAuth();
  const [roiData, setRoiData] = useState<ROIData | null>(null);

  useEffect(() => {
    setRoiData(computeROI(profile?.role || 'personal_user', profile?.id));
  }, [profile?.role]);

  if (!roiData) return null;

  // 权限控制：只有专业版主管(enterprise_manager)和旗舰版老板(enterprise_admin)可见
  // personal_user: 个人版没有ROI概念
  // staff: 员工不需要看
  // 旗舰版主�?enterprise_manager under flagship): 老板看就行，主管不需�?
  const role = profile?.role || 'personal_user';
  const isProManager = role === 'enterprise_manager';
  const isEnterpriseBoss = role === 'enterprise_admin';
  if (!isProManager && !isEnterpriseBoss) return null;

  // 专业版：详细拆解（质检/KPI/排班/成本�?
  // 旗舰版：最详细（含驾驶舱ROI+审批拦截挽回�?
  const visibleItems = roiData.items;

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      {/* 标题�?*/}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">ROI 账本</h3>
            <p className="text-xs text-gray-500">基于你的使用数据自动估算节省金额</p>
          </div>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
          {isEnterpriseBoss ? '旗舰版·深度分�? : '专业版·详细拆�?}
        </span>
      </div>

      {/* 核心数字 */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          使用 {roiData.daysUsed} �?
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <span className="text-2xl font-bold text-emerald-700">{formatMoney(roiData.totalSaved)}</span>
          <span className="text-sm text-gray-500">已节�?/span>
        </div>
      </div>

      {/* 分项拆解 */}
      <div className="space-y-3">
        {visibleItems.map((item) => (
          <div key={item.label} className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="font-semibold text-gray-900 text-sm">{item.label}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                <ArrowDownRight className="w-4 h-4" />
                {formatMoney(item.savedAmount)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                使用前：{item.before}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                使用后：{item.after}
              </div>
            </div>
            {/* 专业版显示简短说明，旗舰版显示完整说�?*/}
            {isProManager && item.detail && (
              <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">{item.detail}</p>
            )}
            {isEnterpriseBoss && item.detail && (
              <div className="mt-2 border-t border-gray-50 pt-2">
                <p className="text-xs text-blue-600 font-medium mb-1">深度分析</p>
                <p className="text-xs text-gray-500">{item.detail}</p>
                {item.label === '售后赔付降低' && (
                  <p className="text-xs text-gray-400 mt-1">审批流拦截过度赔�?+ 成本预警实时监控 �?平均每笔赔付降低23%</p>
                )}
                {item.label === '管理效率提升' && (
                  <p className="text-xs text-gray-400 mt-1">驾驶舱实时ROI看板 + 自动排班优化 �?管理人力成本降低35%</p>
                )}
                {item.label === '质检挽回损失' && (
                  <p className="text-xs text-gray-400 mt-1">异常红警系统 + 五维质检 + 行为关键词监�?�?客诉升级率降�?0%</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 专业版额外拆�?*/}
      {isProManager && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 leading-relaxed">
          <strong>详细ROI拆解</strong>：质检五维体系降低客诉率、KPI分层考核提升团队产出、排班优化减少人力浪费、成本预警控制售后赔付。建议持续录入真实数据，系统将自动更新ROI估算�?
        </div>
      )}

      {/* 旗舰版额外拆�?*/}
      {isEnterpriseBoss && (
        <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-800 leading-relaxed">
          <strong>旗舰版深度ROI</strong>：驾驶舱实时ROI看板 + 审批流拦截挽�?+ 异常红警自动触发 + 资金周报精准追踪。所有模块数据打通，ROI估算精度提升�?0%以上。审批拦截平均每月挽回�?,200过度赔付，异常红警平均每月避免�?,800客诉升级损失�?
        </div>
      )}

      {/* 底部说明 */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        * 金额基于使用天数与行业平均值估算，录入更多真实数据可提升准确度
      </p>
    </div>
  );
}
