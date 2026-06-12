import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, verifyCompanyAccess, forbiddenResponse } from '@/lib/api-auth';

const VALID_TYPES = ['industry_trend', 'platform_rule', 'daily_case', 'product_update', 'review', 'cost_alert'];

/* ─── GET: 查询通知列表 ─── */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 非 admin 强制使用 auth.companyId，admin 可选指定
  const companyId = auth.role === 'admin'
    ? new URL(request.url).searchParams.get('company_id') || auth.companyId
    : auth.companyId;

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const countOnly = searchParams.get('count_only') === 'true';
    const today = searchParams.get('today') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (countOnly) {
      // 只返回未读数量：公司专属 + 广播(company_id IS NULL)
      const orFilters: string[] = [];
      if (companyId) orFilters.push(`company_id.eq.${companyId}`);
      orFilters.push('company_id.is.null');

      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .or(orFilters.join(','));

      if (type && VALID_TYPES.includes(type)) {
        query = query.eq('type', type);
      }

      const { count, error } = await query;
      if (error) throw error;
      return NextResponse.json({ unread_count: count || 0 });
    }

    // 列表查询：公司专属 + 广播
    const orFilters: string[] = [];
    if (companyId) orFilters.push(`company_id.eq.${companyId}`);
    orFilters.push('company_id.is.null');

    let query = supabase
      .from('notifications')
      .select('*')
      .or(orFilters.join(','))
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && VALID_TYPES.includes(type)) {
      query = query.eq('type', type);
    }

    if (today) {
      const todayStr = new Date().toISOString().split('T')[0];
      query = query.gte('created_at', `${todayStr}T00:00:00`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 统计未读数
    const unreadCount = (data || []).filter((n: { is_read: boolean }) => !n.is_read).length;

    return NextResponse.json({
      data: data || [],
      unread_count: unreadCount,
    });
  } catch (err) {
    console.error('[notifications GET] error:', err);
    return NextResponse.json({ error: '获取通知失败' }, { status: 500 });
  }
}

/* ─── POST: 创建通知 ─── */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 仅 manager+ 角色可创建通知
  if (auth.role === 'staff' || auth.role === 'personal_user') {
    return forbiddenResponse('无权创建通知');
  }

  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { type, title, summary, content, company_id } = body;

    if (!type || !title || !content) {
      return NextResponse.json(
        { error: '缺少必填字段: type, title, content' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `无效的type，可选值: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // 校验 company_id：如果前端传了，必须属于当前用户企业
    const targetCompanyId = company_id || auth.companyId;
    if (!verifyCompanyAccess(auth, targetCompanyId)) {
      return forbiddenResponse('无权向该企业发送通知');
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        company_id: targetCompanyId,
        type,
        title,
        summary: summary || null,
        content,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[notifications POST] error:', err);
    return NextResponse.json({ error: '创建通知失败' }, { status: 500 });
  }
}

/* ─── PATCH: 标记已读 ─── */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { ids } = body;

    // 使用 auth.companyId 过滤，确保只能标记自己企业的通知
    const companyId = auth.companyId;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // 标记指定ID为已读（限制只能标记自己企业的通知 + 广播）
      const orFilters: string[] = [];
      if (companyId) orFilters.push(`company_id.eq.${companyId}`);
      orFilters.push('company_id.is.null');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids)
        .or(orFilters.join(','));
      if (error) throw error;
      return NextResponse.json({ success: true, updated: ids.length });
    }

    // 不传ids则全部已读（公司专属 + 广播）
    const orFilters: string[] = [];
    if (companyId) orFilters.push(`company_id.eq.${companyId}`);
    orFilters.push('company_id.is.null');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)
      .or(orFilters.join(','));
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[notifications PATCH] error:', err);
    return NextResponse.json({ error: '更新通知失败' }, { status: 500 });
  }
}
