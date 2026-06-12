import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * API 请求认证接口
 */
export interface AuthResult {
  userId: string;
  userEmail: string;
  companyId: string;
  role: string;
}

/**
 * 认证 API 请求
 * 从 Authorization header 提取 Bearer token，验证用户身份
 * @param request - Next.js 请求对象
 * @returns 认证结果，失败返回 null
 */
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  try {
    // 1. 从 Authorization header 获取 Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // 去掉 'Bearer ' 前缀
    if (!token) {
      return null;
    }

    // 2. 使用 Supabase 客户端验证 token（传入 token 使用 anon key + Bearer header 模式）
    const supabase = getSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return null;
    }

    // 3. 查询 users 表获取 company_id 和 role（使用 service_role 客户端绕过 RLS）
    const adminClient = getSupabaseClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('company_id, role, status')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    // 4. 检查用户状态
    if (userData.status === 'suspended' || userData.status === 'deleted') {
      return null;
    }

    // 5. 返回认证结果
    return {
      userId: user.id,
      userEmail: user.email || '',
      companyId: userData.company_id,
      role: userData.role,
    };
  } catch {
    return null;
  }
}

/**
 * 验证用户是否属于指定公司（防止伪造 companyId）
 */
export function verifyCompanyAccess(auth: AuthResult, requestedCompanyId?: string): boolean {
  // admin 可以访问任何公司数据
  if (auth.role === 'admin') {
    return true;
  }

  // 如果请求指定了 companyId，必须匹配
  if (requestedCompanyId && requestedCompanyId !== auth.companyId) {
    return false;
  }

  return true;
}

/**
 * 创建 401 未授权响应
 */
export function unauthorizedResponse(message = '未授权，请重新登录') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * 创建 403 禁止访问响应
 */
export function forbiddenResponse(message = '无权访问此资源') {
  return NextResponse.json({ error: message }, { status: 403 });
}
