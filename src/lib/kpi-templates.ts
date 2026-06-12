// KPI考核管理 V2 - 数据模型与指标规则库
// 基于 V2·最终定稿：8步选择式，双计分体系，售前+售后双岗位

// ==================== 类型定义 ====================

/** 计分体系类型 */
export type ScoringSystem = 'percentage' | 'points';

/** 考核周期 */
export type AssessmentCycle = 'monthly' | 'quarterly';

/** 岗位类型 */
export type PositionType = 'presales' | 'aftersales';

/** 失误严重程度 */
export type FaultSeverity = 'minor' | 'major';

/** 豁免条件类型 */
export type ExemptionType = 'platform_rule_change' | 'product_quality' | 'force_majeure';

/** 容错配置 */
export interface FaultToleranceConfig {
  /** 通用容错次数（1-5） */
  maxMinorFaults: number;
  /** 特殊豁免条件（哪些启用） */
  exemptions: ExemptionType[];
  /** 轻微失误判定标准 */
  minorFaultCriteria: {
    verbal_slip: string;      // 口误
    operation_delay: string;  // 操作延迟
    info_omission: string;    // 信息疏漏
  };
}

/** 计分规则（双体系） */
export interface ScoringRule {
  /** 百分比扣薪制规则文本 */
  percentageRule: string;
  /** 积分制规则文本 */
  pointsRule: string;
}

/** 细分指标 */
export interface KpiIndicator {
  id: string;
  name: string;
  /** 目标值 */
  targetValue: string;
  /** 双计分规则 */
  scoringRules: ScoringRule;
  /** 数据来源 */
  dataSource: string;
  /** 经验解读提示 */
  tip?: string;
}

/** 考核维度 */
export interface KpiDimension {
  id: string;
  name: string;
  /** 默认权重（0-100） */
  defaultWeight: number;
  /** 细分指标列表 */
  indicators: KpiIndicator[];
  /** 维度说明 */
  description: string;
  /** 经验解读 */
  tip?: string;
}

/** 岗位模板 */
export interface PositionTemplate {
  type: PositionType;
  name: string;
  description: string;
  dimensions: KpiDimension[];
}

/** 自定义指标 */
export interface CustomIndicator {
  id: string;
  dimensionId: string; // 关联到哪个维度，'custom' 表示新维度
  name: string;
  targetValue: string;
  customRule: string; // 自定义规则（文本）
  dataSource: string;
}

/** 自定义维度 */
export interface CustomDimension {
  id: string;
  name: string;
  weight: number;
  indicators: CustomIndicator[];
}

/** 结果应用-积分制映射 */
export interface PointsResultMapping {
  minScore: number;
  maxScore: number;
  salaryEffect: string;
  hrAction: string;
}

/** 结果应用-百分比扣薪制说明 */
export interface PercentageResultMapping {
  description: string;
  baseNote: string; // 提成基数说明
}

/** 特殊场景适配 */
export interface SpecialSceneAdaptation {
  /** 试用期适配 */
  probation: {
    enabled: boolean;
    rule: string;
  };
  /** 职级差异适配 */
  seniorDiff: {
    enabled: boolean;
    rule: string;
  };
}

/** 8步方案配置 */
export interface KpiSchemeConfig {
  /** 第1步：岗位 */
  positions: PositionType[];
  /** 第2步：周期 */
  cycle: AssessmentCycle;
  /** 第3步：计分体系 */
  scoringSystem: ScoringSystem;
  /** 第4步：考核重点（选中的维度ID） */
  selectedDimensionIds: string[];
  /** 第5步：权重调整 */
  dimensionWeights: Record<string, number>;
  /** 第6步：容错配置 */
  faultTolerance: FaultToleranceConfig;
  /** 第7步：自定义补充 */
  customDimensions: CustomDimension[];
  customIndicators: CustomIndicator[];
  /** 第8步：AI评估结果（仅旗舰版） */
  aiEvaluation?: AiEvaluationResult;
}

/** AI评估项 */
export interface AiEvaluationItem {
  dimension: string;
  severity: 'too_strict' | 'too_loose' | 'balanced';
  message: string;
  suggestion: string;
  dataSource?: string;
  oneClickFix?: string;
}

/** AI评估结果 */
export interface AiEvaluationResult {
  overallSeverity: 'too_strict' | 'too_loose' | 'balanced';
  items: AiEvaluationItem[];
}

/** 完整考核方案 */
export interface KpiScheme {
  id: string;
  name: string;
  config: KpiSchemeConfig;
  /** 生成时间 */
  createdAt: string;
  /** 生效周期 */
  effectivePeriod: string;
  /** 状态：draft/published/archived */
  status: 'draft' | 'published' | 'archived';
}

// ==================== 指标规则库 ====================

/** 售前客服模板 */
export const presalesTemplate: PositionTemplate = {
  type: 'presales',
  name: '售前客服',
  description: '覆盖咨询接待、转化推荐、订单规范',
  dimensions: [
    {
      id: 'presales_efficiency',
      name: '接待效率',
      defaultWeight: 30,
      description: '咨询接待的核心效率指标',
      tip: '30秒是电商客服行业平均线，超过60秒客户流失率显著上升',
      indicators: [
        {
          id: 'presales_avg_response_time',
          name: '平均首次响应时间',
          targetValue: '≤30秒',
          scoringRules: {
            percentageRule: '31-60秒扣0.5%底薪/次；＞60秒扣1%底薪/次',
            pointsRule: '31-60秒扣5分/次；＞60秒扣10分/次',
          },
          dataSource: '客服聊天系统',
          tip: '30秒是电商客服行业平均线，超过60秒客户流失率显著上升',
        },
      ],
    },
    {
      id: 'presales_professionalism',
      name: '专业度',
      defaultWeight: 25,
      description: '服务质量的基础',
      tip: '开场白/结束语看似小事，实际是客户第一印象的关键',
      indicators: [
        {
          id: 'presales_accuracy_rate',
          name: '咨询解答准确率',
          targetValue: '≥95%',
          scoringRules: {
            percentageRule: '90%-94%扣0.5%底薪；＜90%扣1.5%底薪',
            pointsRule: '90%-94%扣3分；＜90%扣8分',
          },
          dataSource: '质检抽查+客户反馈',
        },
        {
          id: 'presales_greeting_rate',
          name: '开场白/结束语达标率',
          targetValue: '100%',
          scoringRules: {
            percentageRule: '＜100%每缺失1次扣0.3%底薪',
            pointsRule: '100%加5分；＜100%每缺失1次扣2分',
          },
          dataSource: '聊天记录质检',
          tip: '开场白/结束语看似小事，实际是客户第一印象的关键',
        },
      ],
    },
    {
      id: 'presales_conversion',
      name: '转化能力',
      defaultWeight: 30,
      description: '售前的核心价值',
      tip: '转化率20%是售前客服的及格线，低于10%说明基本转化能力不足',
      indicators: [
        {
          id: 'presales_conversion_rate',
          name: '咨询转化率',
          targetValue: '≥20%',
          scoringRules: {
            percentageRule: '15%-19%不奖惩；10%-14%扣0.5%底薪；＜10%扣1.5%底薪',
            pointsRule: '≥20%加10分；15%-19%不扣；10%-14%扣5分；＜10%扣15分',
          },
          dataSource: '订单系统（咨询→下单）',
          tip: '转化率20%是售前客服的及格线，低于10%说明基本转化能力不足',
        },
        {
          id: 'presales_upsell_rate',
          name: '关联推荐成功率',
          targetValue: '≥30%',
          scoringRules: {
            percentageRule: '20%-29%不奖惩；＜20%扣0.5%底薪',
            pointsRule: '≥30%加8分；20%-29%不扣；＜20%扣4分',
          },
          dataSource: '订单系统',
        },
      ],
    },
    {
      id: 'presales_order_accuracy',
      name: '订单规范',
      defaultWeight: 15,
      description: '闭环保障',
      tip: '订单信息错误是售后问题的第一大源头，预防成本远低于返工成本',
      indicators: [
        {
          id: 'presales_order_accuracy_rate',
          name: '订单信息录入准确率',
          targetValue: '100%',
          scoringRules: {
            percentageRule: '每错1单扣0.5%底薪',
            pointsRule: '每错1单扣3分',
          },
          dataSource: '订单审核记录',
          tip: '订单信息错误是售后问题的第一大源头，预防成本远低于返工成本',
        },
      ],
    },
  ],
};

/** 售后客服模板 */
export const aftersalesTemplate: PositionTemplate = {
  type: 'aftersales',
  name: '售后客服',
  description: '覆盖问题解决、满意度、投诉退款控制',
  dimensions: [
    {
      id: 'aftersales_resolution',
      name: '问题解决',
      defaultWeight: 35,
      description: '售后的核心能力',
      tip: '98%完成率意味着50个工单只允许1个超时，标准偏严但售后时效直接影响复购',
      indicators: [
        {
          id: 'aftersales_ticket_completion',
          name: '工单处理完成率',
          targetValue: '≥98%（24小时内）',
          scoringRules: {
            percentageRule: '95%-97%扣0.5%底薪；＜95%扣1.5%底薪',
            pointsRule: '95%-97%扣5分；＜95%扣12分',
          },
          dataSource: '工单系统',
          tip: '98%完成率意味着50个工单只允许1个超时，标准偏严但售后时效直接影响复购',
        },
      ],
    },
    {
      id: 'aftersales_satisfaction',
      name: '客户满意度',
      defaultWeight: 30,
      description: '服务质量的终极指标',
      tip: '96%好评率是售后客服的标杆线，低于88%说明服务态度或解决能力有系统性问题',
      indicators: [
        {
          id: 'aftersales_positive_rate',
          name: '售后好评率',
          targetValue: '≥96%',
          scoringRules: {
            percentageRule: '92%-95%不奖惩；88%-91%扣0.5%底薪；＜88%扣1.5%底薪',
            pointsRule: '≥96%加8分；92%-95%不扣；88%-91%扣6分；＜88%扣15分',
          },
          dataSource: '售后评价系统',
          tip: '96%好评率是售后客服的标杆线，低于88%说明服务态度或解决能力有系统性问题',
        },
      ],
    },
    {
      id: 'aftersales_complaint_refund',
      name: '投诉退款控制',
      defaultWeight: 35,
      description: '风险控制',
      tip: '有效投诉是红线，1次就要重视；退款率要区分客服责任和商品责任，不能一刀切',
      indicators: [
        {
          id: 'aftersales_valid_complaint',
          name: '有效投诉率',
          targetValue: '0次',
          scoringRules: {
            percentageRule: '1次扣1%底薪；≥2次扣2%底薪',
            pointsRule: '0次加10分；1次扣8分；≥2次扣20分',
          },
          dataSource: '投诉工单系统',
        },
        {
          id: 'aftersales_refund_rate',
          name: '退款率（客服责任）',
          targetValue: '≤2%',
          scoringRules: {
            percentageRule: '2.1%-5%扣0.5%底薪；＞5%扣1.5%底薪',
            pointsRule: '2.1%-5%扣5分；＞5%扣15分',
          },
          dataSource: '退款系统+责任判定记录',
          tip: '有效投诉是红线，1次就要重视；退款率要区分客服责任和商品责任，不能一刀切',
        },
      ],
    },
  ],
};

/** 岗位模板映射 */
export const positionTemplates: Record<PositionType, PositionTemplate> = {
  presales: presalesTemplate,
  aftersales: aftersalesTemplate,
};

// ==================== 结果应用规则 ====================

/** 积分制映射表 */
export const pointsResultMappings: PointsResultMapping[] = [
  { minScore: 90, maxScore: 100, salaryEffect: '提成+15%，额外奖励500元', hrAction: '优先参与晋升评选' },
  { minScore: 80, maxScore: 89, salaryEffect: '提成+5%', hrAction: '正常续用，可参与技能培训' },
  { minScore: 70, maxScore: 79, salaryEffect: '无提成加成', hrAction: '强制参加服务优化培训（2次/月）' },
  { minScore: 60, maxScore: 69, salaryEffect: '提成-10%', hrAction: '绩效预警，1个月整改期' },
  { minScore: 0, maxScore: 59, salaryEffect: '无提成，底薪降10%', hrAction: '整改无效则调岗/优化' },
];

/** 百分比扣薪制说明 */
export const percentageResultMapping: PercentageResultMapping = {
  description: '按各指标实际扣罚比例累计，直接反映在当月薪酬中',
  baseNote: '提成基数默认取员工上月业绩提成总额，可在"系统设置-薪酬基数"中自定义（如固定基数/业绩基数）',
};

/** 特殊场景适配默认值 */
export const defaultSpecialSceneAdaptation: SpecialSceneAdaptation = {
  probation: {
    enabled: false,
    rule: '目标值降低20%，结果应用仅预警不扣薪',
  },
  seniorDiff: {
    enabled: false,
    rule: '资深客服目标值比普通客服高10%，奖励比例高5%',
  },
};

/** 容错配置默认值 */
export const defaultFaultTolerance: FaultToleranceConfig = {
  maxMinorFaults: 2,
  exemptions: ['platform_rule_change', 'product_quality', 'force_majeure'],
  minorFaultCriteria: {
    verbal_slip: '仅单次表述偏差，未导致客户误解或投诉',
    operation_delay: '响应时间超30秒但≤60秒，且未导致客户流失',
    info_omission: '非关键信息遗漏（如赠品备注），未导致退货',
  },
};

/** 特殊豁免条件说明 */
export const exemptionLabels: Record<ExemptionType, { label: string; description: string }> = {
  platform_rule_change: { label: '平台规则变更', description: '因平台政策调整导致的指标波动不计入' },
  product_quality: { label: '商品质量问题', description: '因商品缺陷导致的投诉/退款不计入个人考核' },
  force_majeure: { label: '不可抗力', description: '系统故障、自然灾害等导致的异常不计入' },
};
