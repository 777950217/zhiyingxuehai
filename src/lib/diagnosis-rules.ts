/**
 * 五度淬判经营诊断 - 规则引擎评分逻辑
 * 
 * 输入：company_business_data 表中的数据（按 data_type 分 Sheet）
 * 输出：五度评分（0-100）+ 各维度详情 + 规则建议
 */

/* ========== 类型定义 ========== */

export interface SheetData {
  dataType: string;        // weekly/cost/product/approval/roi/monthly
  data: Record<string, any>[];  // 解析后的行数据
  importedAt: string;
}

export interface BusinessData {
  sheets: SheetData[];
  companyId: string;
}

export interface DimensionScore {
  score: number;          // 0-100
  level: 'good' | 'warning' | 'danger' | 'insufficient'; // 好/预警/危险/数据不足
  label: string;           // 如 "85分·数据完整"
  detail: string;          // 如 "数据完整率85%，已导入3个Sheet"
  suggestion: string;      // 规则建议（触发阈值时非空）
}

export interface DiagnosisResult {
  generatedAt: string;           // 生成时间 ISO
  dataPeriod: string;             // 数据周期描述，如 "2026年5月"
  dimensions: {
    dipan: DimensionScore;       // 底盘度
    zhaugen: DimensionScore;     // 扎根度
    shouxian: DimensionScore;    // 守线度
    zaozue: DimensionScore;      // 造血度
    dingpin: DimensionScore;      // 定品度
  };
  overallScore: number;           // 五度平均分
  ruleSuggestions: string[];      // 规则引擎建议（免费）
  dataCompleteness: number;       // 数据完整率 0-1
}

/* ========== 预设阈值 ========== */

const THRESHOLDS = {
  refundRate: { warning: 10, danger: 20 },      // 退款率 % 超过10%预警，20%危险
  badReviewRate: { warning: 5, danger: 10 },     // 差评率 %
  responseTime: { warning: 60, danger: 120 },    // 响应时长 秒
  compensationRate: { warning: 5, danger: 10 },   // 赔付率 %
  grossMargin: { warning: 25, danger: 15 },      // 毛利率 % 低于25%预警，15%危险
  roi: { warning: 2, danger: 1.5 },             // 投流ROI
  costRatio: { warning: 30, danger: 40 },        // 成本占营收比 %
  targetAchievement: { warning: 70, danger: 50 }, // 目标达成率 %
} as const;

/* ========== 数据完整率计算 ========== */

/**
 * 计算数据完整率（0-1）
 * 判断每个 data_type 是否已有数据，以及字段填充率
 */
export function calcDataCompleteness(data: BusinessData): number {
  const sheets = data.sheets || [];
  const totalSheets = 6; // weekly/cost/product/approval/roi/monthly
  const requiredFieldsMap: Record<string, string[]> = {
    weekly: ['revenue', 'orders'],
    cost: ['amount'],
    product: ['sku', 'sales_qty', 'revenue', 'cost'],
    approval: ['date', 'applicant', 'amount', 'reason'],
    roi: ['period_label', 'metric_name', 'target_value', 'actual_value'],
    monthly: ['year', 'month', 'monthly_revenue', 'monthly_cost'],
  };

  let totalFields = 0;
  let filledFields = 0;

  for (const sheet of sheets) {
    const required = requiredFieldsMap[sheet.dataType] || [];
    totalFields += required.length;
    const row = sheet.data?.[0];
    if (row) {
      for (const field of required) {
        if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
          filledFields++;
        }
      }
    }
  }

  return totalFields === 0 ? 0 : filledFields / totalFields;
}

/* ========== 底盘度评分 ========== */

/**
 * 底盘度：数据完整度
 * 评分逻辑：数据完整率 × 100，但不高于95（留提升空间）
 * 数据缺失时标灰
 */
export function calcDipan(data: BusinessData): DimensionScore {
  const completeness = calcDataCompleteness(data);
  const hasData = data.sheets && data.sheets.length > 0;

  if (!hasData) {
    return {
      score: 0,
      level: 'insufficient',
      label: '数据不足',
      detail: '尚未导入任何数据，请先导入Excel',
      suggestion: '请先导入Excel数据，诊断结果将基于真实数据生成。',
    };
  }

  const score = Math.min(Math.round(completeness * 100), 95);
  const level: DimensionScore['level'] = score >= 80 ? 'good' : score >= 60 ? 'warning' : 'danger';

  return {
    score,
    level,
    label: `${score}分·${score >= 80 ? '数据完整' : score >= 60 ? '数据一般' : '数据不足'}`,
    detail: `数据完整率${Math.round(completeness * 100)}%，已导入${data.sheets?.length || 0}个数据表`,
    suggestion: score < 60 ? '数据不够完整，诊断结果可能有偏差，建议补充导入缺失Sheet（成本明细/ROI目标/月度汇总）' : '',
  };
}

/* ========== 扎根度评分 ========== */

/**
 * 扎根度：客户满意度
 * 指标：差评率 + 退款率 + 平均响应时长
 * 数据来源：product（差评率）+ weekly（退款率、响应时长）
 */
export function calcZhaugen(data: BusinessData): DimensionScore {
  const productSheet = data.sheets?.find(s => s.dataType === 'product');
  const weeklySheet = data.sheets?.find(s => s.dataType === 'weekly');

  const badReviewRate = productSheet?.data?.[0]?.bad_review_rate ?? null;
  const refundRate = weeklySheet?.data?.[0]?.refund_rate ?? null;
  const responseTime = weeklySheet?.data?.[0]?.avg_response_time ?? null;

  const hasData = badReviewRate !== null || refundRate !== null || responseTime !== null;

  if (!hasData) {
    return {
      score: 0,
      level: 'insufficient',
      label: '数据不足',
      detail: '缺少单品数据或周度数据',
      suggestion: '请导入「单品数据」和「周度经营数据」Sheet，用于评估客户满意度。',
    };
  }

  // 评分：三项指标综合
  let score = 80; // 基础分
  const suggestions: string[] = [];

  if (refundRate !== null) {
    if (refundRate > THRESHOLDS.refundRate.danger) {
      score -= 25;
      suggestions.push(`退款率${refundRate}%偏高，建议排查单品退货原因，优先处理差评率最高的SKU`);
    } else if (refundRate > THRESHOLDS.refundRate.warning) {
      score -= 10;
      suggestions.push(`退款率${refundRate}%超标，建议关注退货率最高的平台`);
    }
  }

  if (badReviewRate !== null) {
    if (badReviewRate > THRESHOLDS.badReviewRate.danger) {
      score -= 20;
      suggestions.push(`差评率${badReviewRate}%偏高，建议检查产品质量和物流环节`);
    } else if (badReviewRate > THRESHOLDS.badReviewRate.warning) {
      score -= 8;
      suggestions.push(`差评率${badReviewRate}%，建议关注差评内容，及时跟进处理`);
    }
  }

  if (responseTime !== null) {
    if (responseTime > THRESHOLDS.responseTime.danger) {
      score -= 20;
      suggestions.push(`客服响应${responseTime}秒偏慢，建议检查排班是否合理，高峰时段增派人手`);
    } else if (responseTime > THRESHOLDS.responseTime.warning) {
      score -= 8;
      suggestions.push(`客服响应${responseTime}秒，建议优化话术模板，减少响应时长`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  const level: DimensionScore['level'] = score >= 70 ? 'good' : score >= 50 ? 'warning' : 'danger';

  const detailParts = [];
  if (refundRate !== null) detailParts.push(`退款率${refundRate}%`);
  if (badReviewRate !== null) detailParts.push(`差评率${badReviewRate}%`);
  if (responseTime !== null) detailParts.push(`响应${responseTime}s`);

  return {
    score,
    level,
    label: `${score}分·${score >= 70 ? '满意度好' : score >= 50 ? '满意度一般' : '满意度差'}`,
    detail: detailParts.join('，') || '暂无数据',
    suggestion: suggestions.join('；'),
  };
}

/* ========== 守线度评分 ========== */

/**
 * 守线度：合规风控
 * 指标：赔付率 + 赔付原因TOP3 + 差评撤销率
 * 数据来源：approval（赔付记录）
 */
export function calcShouxian(data: BusinessData): DimensionScore {
  const approvalSheet = data.sheets?.find(s => s.dataType === 'approval');
  const approvals = approvalSheet?.data || [];

  if (approvals.length === 0) {
    return {
      score: 0,
      level: 'insufficient',
      label: '数据不足',
      detail: '缺少审批记录数据',
      suggestion: '请导入「审批记录」Sheet，用于评估合规风控情况。',
    };
  }

  const totalAmount = approvals.reduce((sum, a) => sum + (a.amount || 0), 0);
  const revenue = data.sheets?.find(s => s.dataType === 'weekly')?.data?.[0]?.revenue || 1;
  const compensationRate = (totalAmount / revenue) * 100; // 赔付率%

  // 赔付原因TOP3
  const reasonCount: Record<string, number> = {};
  for (const a of approvals) {
    const reason = a.reason || '其他';
    reasonCount[reason] = (reasonCount[reason] || 0) + 1;
  }
  const topReasons = Object.entries(reasonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([r]) => r);

  // 差评撤销率
  const reviewRemoved = approvals.filter(a => a.review_removed === '是').length;
  const reviewRemovedRate = approvals.length > 0 ? (reviewRemoved / approvals.length) * 100 : 0;

  let score = 80;
  const suggestions: string[] = [];

  if (compensationRate > THRESHOLDS.compensationRate.danger) {
    score -= 25;
    suggestions.push(`赔付率${compensationRate.toFixed(1)}%偏高，建议优化质检流程，重点排查赔付原因TOP3：${topReasons.join('、')}`);
  } else if (compensationRate > THRESHOLDS.compensationRate.warning) {
    score -= 10;
    suggestions.push(`赔付率${compensationRate.toFixed(1)}%超标，建议关注高频赔付原因`);
  }

  score = Math.max(0, Math.min(100, score));
  const level: DimensionScore['level'] = score >= 70 ? 'good' : score >= 50 ? 'warning' : 'danger';

  return {
    score,
    level,
    label: `${score}分·${score >= 70 ? '风控良好' : score >= 50 ? '风控预警' : '风控危险'}`,
    detail: `赔付率${compensationRate.toFixed(1)}%，TOP原因：${topReasons.join('、')}；差评撤销率${reviewRemovedRate.toFixed(0)}%`,
    suggestion: suggestions.join('；'),
  };
}

/* ========== 造血度评分 ========== */

/**
 * 造血度：商业盈利
 * 指标：毛利率 + 成本占比 + 投流ROI + 各平台营收贡献
 * 数据来源：product（毛利率）+ cost（成本占比）+ weekly（投流ROI、平台营收）
 */
export function calcZaozue(data: BusinessData): DimensionScore {
  const productSheet = data.sheets?.find(s => s.dataType === 'product');
  const costSheet = data.sheets?.find(s => s.dataType === 'cost');
  const weeklySheet = data.sheets?.find(s => s.dataType === 'weekly');

  const hasData = productSheet || costSheet || weeklySheet;

  if (!hasData) {
    return {
      score: 0,
      level: 'insufficient',
      label: '数据不足',
      detail: '缺少单品/成本/周度数据',
      suggestion: '请导入「单品数据」「成本明细」「周度经营数据」Sheet。',
    };
  }

  let score = 75;
  const suggestions: string[] = [];
  const detailParts: string[] = [];

  // 毛利率
  const grossMargin = productSheet?.data?.[0]?.gross_margin ?? null;
  if (grossMargin !== null) {
    if (grossMargin < THRESHOLDS.grossMargin.danger) {
      score -= 20;
      suggestions.push(`毛利率${grossMargin}%偏低，建议优化产品成本结构或调整定价策略`);
    } else if (grossMargin < THRESHOLDS.grossMargin.warning) {
      score -= 8;
      suggestions.push(`毛利率${grossMargin}%，建议关注成本占比较高的SKU`);
    }
    detailParts.push(`毛利${grossMargin}%`);
  }

  // 成本占比
  const totalCost = costSheet?.data?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) ?? 0;
  const totalRevenue = weeklySheet?.data?.[0]?.revenue ?? 1;
  const costRatio = (totalCost / totalRevenue) * 100;
  if (costRatio > THRESHOLDS.costRatio.danger) {
    score -= 20;
    suggestions.push(`成本占比${costRatio.toFixed(0)}%偏高，建议排查固定成本（房租/工资）和变动成本（平台扣点/快递费）`);
  } else if (costRatio > THRESHOLDS.costRatio.warning) {
    score -= 8;
    suggestions.push(`成本占比${costRatio.toFixed(0)}%，建议关注库存占压成本和退货损失`);
  }
  detailParts.push(`成本占${costRatio.toFixed(0)}%`);

  // 投流ROI
  const adSpend = weeklySheet?.data?.[0]?.ad_spend ?? null;
  const roi = adSpend ? totalRevenue / adSpend : null;
  if (roi !== null) {
    if (roi < THRESHOLDS.roi.danger) {
      score -= 15;
      suggestions.push(`投流ROI ${roi.toFixed(1)}偏低，建议调整投流策略或暂停低效平台投放`);
    } else if (roi < THRESHOLDS.roi.warning) {
      score -= 5;
      suggestions.push(`投流ROI ${roi.toFixed(1)}，建议优化投放素材和定向`);
    }
    detailParts.push(`ROI ${roi.toFixed(1)}`);
  }

  score = Math.max(0, Math.min(100, score));
  const level: DimensionScore['level'] = score >= 70 ? 'good' : score >= 50 ? 'warning' : 'danger';

  return {
    score,
    level,
    label: `${score}分·${score >= 70 ? '盈利良好' : score >= 50 ? '盈利预警' : '盈利危险'}`,
    detail: detailParts.join('，') || '暂无数据',
    suggestion: suggestions.join('；'),
  };
}

/* ========== 定品度评分 ========== */

/**
 * 定品度：趋势目标
 * 指标：同比环比 + 目标达成率 + 运营周报趋势
 * 数据来源：roi（目标达成率）+ monthly（同比环比）
 */
export function calcDingpin(data: BusinessData): DimensionScore {
  const roiSheet = data.sheets?.find(s => s.dataType === 'roi');
  const monthlySheet = data.sheets?.find(s => s.dataType === 'monthly');

  const hasData = roiSheet || monthlySheet;

  if (!hasData) {
    return {
      score: 0,
      level: 'insufficient',
      label: '数据不足',
      detail: '缺少ROI目标或月度汇总数据',
      suggestion: '请导入「ROI目标」和「月度汇总」Sheet，用于评估趋势目标达成情况。',
    };
  }

  let score = 70;
  const suggestions: string[] = [];
  const detailParts: string[] = [];

  // 目标达成率
  const roiData = roiSheet?.data || [];
  const achievements = roiData.map((r: any) => {
    const target = r.target_value || 0;
    const actual = r.actual_value || 0;
    return target === 0 ? null : (actual / target) * 100;
  }).filter((v: number | null) => v !== null) as number[];

  const avgAchievement = achievements.length > 0 ? achievements.reduce((a, b) => a + b, 0) / achievements.length : null;

  if (avgAchievement !== null) {
    if (avgAchievement < THRESHOLDS.targetAchievement.danger) {
      score -= 25;
      suggestions.push(`目标达成率${avgAchievement.toFixed(0)}%偏低，建议复盘未达成目标的原因，调整下期目标或执行策略`);
    } else if (avgAchievement < THRESHOLDS.targetAchievement.warning) {
      score -= 10;
      suggestions.push(`目标达成率${avgAchievement.toFixed(0)}%，建议关注达成率最低的KPI类型`);
    }
    detailParts.push(`目标达成${avgAchievement.toFixed(0)}%`);
  }

  // 同比环比
  const yoy = monthlySheet?.data?.[0]?.yoy_change ?? null;
  const mom = monthlySheet?.data?.[0]?.mom_change ?? null;
  if (yoy !== null) detailParts.push(`同比${yoy > 0 ? '+' : ''}${yoy}%`);
  if (mom !== null) detailParts.push(`环比${mom > 0 ? '+' : ''}${mom}%`);

  score = Math.max(0, Math.min(100, score));
  const level: DimensionScore['level'] = score >= 70 ? 'good' : score >= 50 ? 'warning' : 'danger';

  return {
    score,
    level,
    label: `${score}分·${score >= 70 ? '趋势向好' : score >= 50 ? '趋势预警' : '趋势偏差'}`,
    detail: detailParts.join('，') || '暂无数据',
    suggestion: suggestions.join('；'),
  };
}

/* ========== 主函数：生成完整诊断结果 ========== */

export function generateDiagnosis(data: BusinessData): DiagnosisResult {
  const dipan = calcDipan(data);
  const zhaugen = calcZhaugen(data);
  const shouxian = calcShouxian(data);
  const zaozue = calcZaozue(data);
  const dingpin = calcDingpin(data);

  const dimensions = { dipan, zhaugen, shouxian, zaozue, dingpin };
  const overallScore = Math.round((dipan.score + zhaugen.score + shouxian.score + zaozue.score + dingpin.score) / 5);

  // 收集所有规则建议（非空）
  const ruleSuggestions = [
    dipan.suggestion,
    zhaugen.suggestion,
    shouxian.suggestion,
    zaozue.suggestion,
    dingpin.suggestion,
  ].filter(Boolean);

  // 数据周期描述
  const monthlySheet = data.sheets?.find(s => s.dataType === 'monthly');
  const periodLabel = monthlySheet?.data?.[0]?.year && monthlySheet?.data?.[0]?.month
    ? `${monthlySheet.data[0].year}年${monthlySheet.data[0].month}月`
    : '最新数据';

  return {
    generatedAt: new Date().toISOString(),
    dataPeriod: periodLabel,
    dimensions,
    overallScore,
    ruleSuggestions,
    dataCompleteness: calcDataCompleteness(data),
  };
}
