import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';

// GET /api/insights - 获取洞察列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  const client = getSupabaseClient();
  const companyId = auth.companyId;
  const { searchParams } = new URL(request.url);

  const insightType = searchParams.get('insight_type');
  const isRead = searchParams.get('is_read');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = client
    .from('insight_notifications')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (insightType) query = query.eq('insight_type', insightType);
  if (isRead !== null && isRead !== '') query = query.eq('is_read', isRead === 'true');

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: `获取洞察失败: ${error.message}` }, { status: 500 });
  }

  // 获取未读数
  const { count: unreadCount } = await client
    .from('insight_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_read', false);

  return NextResponse.json({ insights: data, total: count, unread: unreadCount });
}

// POST /api/insights - 手动触发生成洞察
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  if (auth.role !== 'admin' && auth.role !== 'enterprise_admin' && auth.role !== 'enterprise_manager') {
    return NextResponse.json({ error: '无权限创建洞察' }, { status: 403 });
  }

  // 调用生成接口逻辑
  try {
    const generateRes = await fetch(new URL('/api/insights/generate', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({ company_id: auth.companyId }),
    });
    const result = await generateRes.json();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: '生成洞察失败' }, { status: 500 });
  }
}

// PATCH /api/insights - 标记已读
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  const client = getSupabaseClient();
  const body = await request.json();

  if (body.markAllRead && body.companyId) {
    // 全部标为已读
    const { error } = await client
      .from('insight_notifications')
      .update({ is_read: true })
      .eq('company_id', body.companyId)
      .eq('is_read', false);
    if (error) {
      return NextResponse.json({ error: `标记已读失败: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // 批量标记已读
  if (body.ids && Array.isArray(body.ids)) {
    const { error } = await client
      .from('insight_notifications')
      .update({ is_read: true })
      .in('id', body.ids)
      .eq('company_id', auth.companyId);
    if (error) {
      return NextResponse.json({ error: `标记已读失败: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // 单条标记已读
  if (body.id) {
    const { error } = await client
      .from('insight_notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('company_id', auth.companyId);
    if (error) {
      return NextResponse.json({ error: `标记已读失败: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: '缺少参数' }, { status: 400 });
}
