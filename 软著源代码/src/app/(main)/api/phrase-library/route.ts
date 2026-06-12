import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest } from '@/lib/api-auth';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const category = searchParams.get('category');

    // Get preset phrases (no company_id) + company custom phrases
    let query = supabase
      .from('phrase_library')
      .select('*')
      .order('use_count', { ascending: false });

    if (category && category !== '全部') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter: preset phrases (no company_id) + company's custom phrases
    const filtered = companyId
      ? (data || []).filter((p: { company_id: string | null }) => !p.company_id || p.company_id === companyId)
      : (data || []).filter((p: { company_id: string | null }) => !p.company_id);

    return NextResponse.json({ data: filtered });
  } catch (err) {
    console.error('[API] GET /phrase-library error:', err);
    return NextResponse.json({ error: '获取话术库失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('phrase_library')
      .insert({
        user_id: auth.userId,
        company_id: auth.companyId || null,
        category: body.category,
        title: body.title || null,
        content: body.content,
        is_preset: false,
        use_count: 0,
        created_by: auth.userId,
        question: body.question || null,
        answer: body.answer || null,
        scene: body.scene || null,
        tags: body.tags || null,
        expires_at: body.expires_at || null,
        status: body.status || 'active',
        review_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logAction({
      userId: auth.userId,
      companyId: auth.companyId,
      action: AuditAction.CREATE,
      resourceType: ResourceType.PHRASE,
      resourceId: data.id,
      detail: { category: body.category, scene: body.scene },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /phrase-library error:', err);
    return NextResponse.json({ error: '创建话术失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updated_at: clientUpdatedAt, ...updates } = body;

    let authResult: { userId: string; companyId: string; role: string } | null = null;

    // Role check for review operations
    if (updates.review_status !== undefined) {
      const auth = await authenticateRequest(request);
      if (!auth) {
        return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
      }
      if (auth.role !== 'admin' && auth.role !== 'enterprise_manager' && auth.role !== 'enterprise_admin') {
        return NextResponse.json({ error: '无权限执行审核操作' }, { status: 403 });
      }
      // Record reviewer info
      updates.reviewed_by = auth.userId;
      updates.reviewed_at = new Date().toISOString();
      authResult = auth;
    }

    const supabase = getSupabaseClient();

    // Optimistic lock: check updated_at if provided
    if (clientUpdatedAt && id) {
      const { data: existing } = await supabase
        .from('phrase_library')
        .select('updated_at')
        .eq('id', id)
        .single();
      if (existing && existing.updated_at && existing.updated_at !== clientUpdatedAt) {
        return NextResponse.json(
          { error: '数据已被修改，请刷新后重试', code: 'CONFLICT' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('phrase_library')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    const action = updates.review_status !== undefined ? AuditAction.REVIEW : AuditAction.UPDATE;
    await logAction({
      userId: authResult?.userId || updates.reviewed_by || 'unknown',
      companyId: authResult?.companyId || data?.company_id,
      action,
      resourceType: ResourceType.PHRASE,
      resourceId: id,
      detail: { updates: Object.keys(updates), review_status: updates.review_status },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] PUT /phrase-library error:', err);
    return NextResponse.json({ error: '更新话术失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少ID参数' }, { status: 400 });
    }

    const { error } = await supabase
      .from('phrase_library')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log
    await logAction({
      userId: auth.userId,
      companyId: auth.companyId,
      action: AuditAction.DELETE,
      resourceType: ResourceType.PHRASE,
      resourceId: id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /phrase-library error:', err);
    return NextResponse.json({ error: '删除话术失败' }, { status: 500 });
  }
}
