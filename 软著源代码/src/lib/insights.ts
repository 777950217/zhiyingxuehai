/**
 * 洞察推送系统 - 工具库
 */

// 洞察类型常量
export const INSIGHT_TYPES = {
  QUALITY_DECLINE: 'quality_decline',
  KPI_WARNING: 'kpi_warning',
  COMPENSATION_SPIKE: 'compensation_spike',
  RULE_CHANGE: 'rule_change',
  INCENTIVE_TREND: 'incentive_trend',
  LEARNING_STAGNATION: 'learning_stagnation',
  KNOWLEDGE_EXPIRY: 'knowledge_expiry',
  KNOWLEDGE_STAGNATION: 'knowledge_stagnation',
  LOGIN_STAGNATION: 'login_stagnation',
} as const;

export type InsightType = (typeof INSIGHT_TYPES)[keyof typeof INSIGHT_TYPES];

// 类型配置
export const INSIGHT_CONFIG: Record<
  InsightType,
  {
    label: string;
    icon: string;
    color: 'red' | 'yellow' | 'blue';
    category: 'warning' | 'attention' | 'info';
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  [INSIGHT_TYPES.QUALITY_DECLINE]: {
    label: '质检下滑',
    icon: '🔴',
    color: 'red',
    category: 'warning',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  [INSIGHT_TYPES.KPI_WARNING]: {
    label: 'KPI预警',
    icon: '🔴',
    color: 'red',
    category: 'warning',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  [INSIGHT_TYPES.COMPENSATION_SPIKE]: {
    label: '赔付飙升',
    icon: '🔴',
    color: 'red',
    category: 'warning',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  [INSIGHT_TYPES.RULE_CHANGE]: {
    label: '规则变动',
    icon: '🟡',
    color: 'yellow',
    category: 'attention',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  [INSIGHT_TYPES.INCENTIVE_TREND]: {
    label: '激励趋势',
    icon: '🟡',
    color: 'yellow',
    category: 'attention',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  [INSIGHT_TYPES.LEARNING_STAGNATION]: {
    label: '学习停滞',
    icon: '🔵',
    color: 'blue',
    category: 'info',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
  },
  [INSIGHT_TYPES.KNOWLEDGE_EXPIRY]: {
    label: '知识过期',
    icon: '🟡',
    color: 'yellow',
    category: 'attention',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  [INSIGHT_TYPES.KNOWLEDGE_STAGNATION]: {
    label: '知识库停滞',
    icon: '🔵',
    color: 'blue',
    category: 'info',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
  },
  [INSIGHT_TYPES.LOGIN_STAGNATION]: {
    label: '登录提醒',
    icon: '🔵',
    color: 'blue',
    category: 'info',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
  },
};

// 深海蓝主题下的洞察配置
export const INSIGHT_DARK_CONFIG: Record<
  InsightType,
  {
    label: string;
    icon: string;
    dotClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  [INSIGHT_TYPES.QUALITY_DECLINE]: {
    label: '质检下滑',
    icon: '🔴',
    dotClass: 'bg-red-400',
    bgClass: 'bg-red-400/10',
    borderClass: 'border-red-400/30',
  },
  [INSIGHT_TYPES.KPI_WARNING]: {
    label: 'KPI预警',
    icon: '🔴',
    dotClass: 'bg-red-400',
    bgClass: 'bg-red-400/10',
    borderClass: 'border-red-400/30',
  },
  [INSIGHT_TYPES.COMPENSATION_SPIKE]: {
    label: '赔付飙升',
    icon: '🔴',
    dotClass: 'bg-red-400',
    bgClass: 'bg-red-400/10',
    borderClass: 'border-red-400/30',
  },
  [INSIGHT_TYPES.RULE_CHANGE]: {
    label: '规则变动',
    icon: '🟡',
    dotClass: 'bg-amber-400',
    bgClass: 'bg-amber-400/10',
    borderClass: 'border-amber-400/30',
  },
  [INSIGHT_TYPES.INCENTIVE_TREND]: {
    label: '激励趋势',
    icon: '🟡',
    dotClass: 'bg-amber-400',
    bgClass: 'bg-amber-400/10',
    borderClass: 'border-amber-400/30',
  },
  [INSIGHT_TYPES.LEARNING_STAGNATION]: {
    label: '学习停滞',
    icon: '🔵',
    dotClass: 'bg-blue-400',
    bgClass: 'bg-blue-400/10',
    borderClass: 'border-blue-400/30',
  },
  [INSIGHT_TYPES.KNOWLEDGE_EXPIRY]: {
    label: '知识过期',
    icon: '🟡',
    dotClass: 'bg-amber-400',
    bgClass: 'bg-amber-400/10',
    borderClass: 'border-amber-400/30',
  },
  [INSIGHT_TYPES.KNOWLEDGE_STAGNATION]: {
    label: '知识库停滞',
    icon: '🔵',
    dotClass: 'bg-blue-400',
    bgClass: 'bg-blue-400/10',
    borderClass: 'border-blue-400/30',
  },
  [INSIGHT_TYPES.LOGIN_STAGNATION]: {
    label: '久未登录',
    icon: '🟠',
    dotClass: 'bg-orange-400',
    bgClass: 'bg-orange-400/10',
    borderClass: 'border-orange-400/30',
  },
};

// 根据角色获取可见洞察类型
export function getInsightTypesByRole(role: string): InsightType[] {
  // 主管看到: 质检下滑、KPI预警、学习停滞、知识过期、知识库停滞
  if (role === 'enterprise_manager') {
    return [
      INSIGHT_TYPES.QUALITY_DECLINE,
      INSIGHT_TYPES.KPI_WARNING,
      INSIGHT_TYPES.LEARNING_STAGNATION,
      INSIGHT_TYPES.KNOWLEDGE_EXPIRY,
      INSIGHT_TYPES.KNOWLEDGE_STAGNATION,
      INSIGHT_TYPES.LOGIN_STAGNATION,
    ];
  }
  // 老板看到: 赔付飙升、规则变动、激励趋势 + 主管全部
  if (role === 'enterprise_admin') {
    return [
      INSIGHT_TYPES.QUALITY_DECLINE,
      INSIGHT_TYPES.KPI_WARNING,
      INSIGHT_TYPES.COMPENSATION_SPIKE,
      INSIGHT_TYPES.RULE_CHANGE,
      INSIGHT_TYPES.INCENTIVE_TREND,
      INSIGHT_TYPES.LEARNING_STAGNATION,
      INSIGHT_TYPES.KNOWLEDGE_EXPIRY,
      INSIGHT_TYPES.KNOWLEDGE_STAGNATION,
      INSIGHT_TYPES.LOGIN_STAGNATION,
    ];
  }
  // admin/super_admin 看到所有
  if (role === 'admin' || role === 'super_admin') {
    return Object.values(INSIGHT_TYPES);
  }
  // 其他角色暂不展示洞察
  return [];
}

// 获取洞察类型的中文标签
export function getInsightTypeLabel(type: string): string {
  return INSIGHT_CONFIG[type as InsightType]?.label ?? type;
}
