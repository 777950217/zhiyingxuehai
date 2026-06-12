import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * 产品档案原始数据类型
 */
export interface CompanyProfileData {
  brand_name: string | null;
  categories: string | null;
  price_range: string | null;
  platforms: string | null;
  pain_points: string | null;
  supply_type: string | null;
  install_service: boolean | null;
  return_policy: string | null;
  daily_consultations: string | null;
}

/**
 * 从 companies 表获取完整产品档案原始数据
 * @param companyId 企业ID
 * @returns 产品档案对象，不存在或出错时返回 null
 */
export async function getCompanyProfileData(
  companyId: string
): Promise<CompanyProfileData | null> {
  if (!companyId) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .select(
        "brand_name, categories, price_range, platforms, pain_points, supply_type, install_service, return_policy, daily_consultations"
      )
      .eq("id", companyId)
      .single();

    if (error || !data) return null;
    return data as CompanyProfileData;
  } catch {
    return null;
  }
}

/**
 * 将产品档案转换为自然的 system prompt 上下文
 * 以自然语言描述产品背景，让 AI 能据此给出差异化回答
 * @param profile 产品档案数据
 * @returns 格式化的 prompt 片段，字段全空时返回空字符串
 */
export function buildCompanyProfilePrompt(
  profile: CompanyProfileData | null
): string {
  if (!profile) return "";

  const parts: string[] = [];

  // 品牌与品类
  const brandAndCategory: string[] = [];
  if (profile.brand_name) brandAndCategory.push(profile.brand_name);
  if (profile.categories) {
    try {
      const cats: string[] =
        typeof profile.categories === "string"
          ? JSON.parse(profile.categories)
          : profile.categories;
      if (Array.isArray(cats) && cats.length > 0) {
        brandAndCategory.push(cats.join("、"));
      }
    } catch {
      brandAndCategory.push(String(profile.categories));
    }
  }

  if (brandAndCategory.length > 0) {
    if (profile.brand_name && profile.categories) {
      parts.push(
        `您服务的客户是「${profile.brand_name}」，主营产品包括：${brandAndCategory[brandAndCategory.length - 1]}。`
      );
    } else {
      parts.push(`主营产品包括：${brandAndCategory.join("、")}。`);
    }
  }

  // 价格带
  if (profile.price_range) {
    parts.push(`产品定位：${profile.price_range}价格带。`);
  }

  // 销售平台
  if (profile.platforms) {
    try {
      const platforms: string[] =
        typeof profile.platforms === "string"
          ? JSON.parse(profile.platforms)
          : profile.platforms;
      if (Array.isArray(platforms) && platforms.length > 0) {
        parts.push(`销售渠道：${platforms.join("、")}。`);
      }
    } catch {
      parts.push(`销售渠道：${profile.platforms}。`);
    }
  }

  // 核心痛点
  if (profile.pain_points) {
    try {
      const pains: string[] =
        typeof profile.pain_points === "string"
          ? JSON.parse(profile.pain_points)
          : profile.pain_points;
      if (Array.isArray(pains) && pains.length > 0) {
        parts.push(`核心痛点：${pains.join("、")}。`);
      }
    } catch {
      parts.push(`核心痛点：${profile.pain_points}。`);
    }
  }

  // 供货类型
  if (profile.supply_type) {
    parts.push(`供货模式：${profile.supply_type}。`);
  }

  // 安装服务
  if (profile.install_service !== null && profile.install_service !== undefined) {
    parts.push(
      profile.install_service
        ? "提供专业安装服务，客服需主动询问安装条件。"
        : "不提供安装服务，客服需引导客户自行安装或推荐第三方安装。"
    );
  }

  // 退换货政策
  if (profile.return_policy) {
    parts.push(`退换货政策：${profile.return_policy}。`);
  }

  // 日均咨询量
  if (profile.daily_consultations) {
    parts.push(`日均咨询量约${profile.daily_consultations}条。`);
  }

  if (parts.length === 0) return "";

  return `【产品背景】\n${parts.join("\n")}`;
}

/**
 * 验证用户归属的 companyId（后端校验，防止前端伪造）
 * 从 users 表查询用户的真实 company_id，与前端传入的对比
 * @param userId 用户ID
 * @param claimedCompanyId 前端声称的 companyId
 * @returns 校验后的真实 companyId，校验失败返回 null
 */
export async function verifyCompanyAccess(
  userId: string,
  claimedCompanyId: string
): Promise<string | null> {
  if (!userId || !claimedCompanyId) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("company_id, role, status")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    // 用户被停用或删除
    if (data.status === "suspended" || data.status === "deleted") return null;

    // admin 角色可能没有 company_id（超级管理员），允许通过
    if (data.role === "admin" && !data.company_id) return claimedCompanyId;

    // 普通用户必须 company_id 匹配
    if (data.company_id === claimedCompanyId) return claimedCompanyId;

    return null;
  } catch {
    return null;
  }
}
