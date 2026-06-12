import type { UserRole, CompanyPlan } from '@/lib/auth-context';

/**
 * 各版本功能数量上限配置
 * 
 * 三版本体系:
 *   个人版(personal_user): 这些功能本身锁定，返回 0
 *   专业版(enterprise_manager, companyPlan=pro): 有限数量
 *   旗舰版(enterprise_admin/admin, 或 enterprise_manager+companyPlan=flagship): 不限(Infinity)
 *   staff: 管理类功能锁定，返回 0
 */
export interface PlanLimits {
  /** 质检规则上限条数 */
  maxRules: number;
  /** KPI指标上限个数 */
  maxKpiIndicators: number;
  /** 自定义模板上限套数 */
  maxCustomTemplates: number;
  /** 班组上限个数 */
  maxTeams: number;
  /** 座位上限人数 */
  maxSeats: number;
}

export function getPlanLimits(role: UserRole | undefined, companyPlan?: CompanyPlan | string): PlanLimits {
  if (!role) {
    return { maxRules: 0, maxKpiIndicators: 0, maxCustomTemplates: 0, maxTeams: 0, maxSeats: 1 };
  }

  // 超级管理员: 不限
  if (role === 'admin') {
    return { maxRules: Infinity, maxKpiIndicators: Infinity, maxCustomTemplates: Infinity, maxTeams: Infinity, maxSeats: Infinity };
  }

  // 旗舰版老板(enterprise_admin): 不限(班组上限5个)
  if (role === 'enterprise_admin') {
    return { maxRules: Infinity, maxKpiIndicators: Infinity, maxCustomTemplates: Infinity, maxTeams: 5, maxSeats: 15 };
  }

  // 主管/班组长(enterprise_manager): 取决于公司套餐
  if (role === 'enterprise_manager') {
    if (companyPlan === 'flagship') {
      // 旗舰版班组长: 不限
      return { maxRules: Infinity, maxKpiIndicators: Infinity, maxCustomTemplates: Infinity, maxTeams: 5, maxSeats: 15 };
    }
    // 专业版主管: 有限数量
    return { maxRules: 10, maxKpiIndicators: 8, maxCustomTemplates: 5, maxTeams: 1, maxSeats: 5 };
  }

  // staff / personal_user: 管理类功能锁定，上限为 0
  return { maxRules: 0, maxKpiIndicators: 0, maxCustomTemplates: 0, maxTeams: 0, maxSeats: 1 };
}

/**
 * 判断某个数量是否超出上限
 */
export function isOverLimit(current: number, max: number): boolean {
  if (max === Infinity) return false;
  return current >= max;
}

/**
 * 格式化上限显示文本
 * "不限" 或 数字
 */
export function formatLimit(max: number): string {
  return max === Infinity ? '不限' : String(max);
}
