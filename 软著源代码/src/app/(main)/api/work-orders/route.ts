import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, verifyCompanyAccess, forbiddenResponse } from '@/lib/api-auth';

/* ─── GET: 获取工单列表（按角色过滤）─── */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = auth.companyId;
    const userId = auth.userId;
    const role = auth.role;

    // ─── 问题频率统计（仅管理员/主管） ───
    if (searchParams.get('type') === 'problem-frequency') {
      if (role !== 'admin' && role !== 'enterprise_admin' && role !== 'enterprise_manager') {
        return forbiddenResponse('无权查看统计数据');
      }
      const targetCompanyId = role === 'admin' ? (searchParams.get('company_id') || companyId) : companyId;
      if (!targetCompanyId) {
        return NextResponse.json({ data: [] });
      }
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // 最近30天按 category 聚合
      const { data: currentData, error: curErr } = await client
        .from('work_orders')
        .select('category')
        .eq('company_id', targetCompanyId)
        .gte('created_at', thirtyDaysAgo)
        .not('category', 'is', null);
      if (curErr) throw new Error(`查询工单统计失败: ${curErr.message}`);

      // 前30天（用于趋势对比）
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: prevData, error: prevErr } = await client
        .from('work_orders')
        .select('category')
        .eq('company_id', targetCompanyId)
        .gte('created_at', sixtyDaysAgo)
        .lt('created_at', thirtyDaysAgo)
        .not('category', 'is', null);
      if (prevErr) throw new Error(`查询历史统计失败: ${prevErr.message}`);

      // 聚合当前期
      const currentMap: Record<string, number> = {};
      for (const row of (currentData || [])) {
        const cat = (row.category || '').trim();
        if (cat) currentMap[cat] = (currentMap[cat] || 0) + 1;
      }

      // 聚合上期
      const prevMap: Record<string, number> = {};
      for (const row of (prevData || [])) {
        const cat = (row.category || '').trim();
        if (cat) prevMap[cat] = (prevMap[cat] || 0) + 1;
      }

      // TOP5 + 趋势
      const sorted = Object.entries(currentMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const result = sorted.map(([category, count]) => {
        const prevCount = prevMap[category] || 0;
        const trend: string = count > prevCount ? '↑' : count < prevCount ? '↓' : '→';
        return { category, count, prevCount, trend };
      });

      return NextResponse.json({ data: result });
    }

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const orderNo = searchParams.get('orderNo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = client
      .from('work_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 企业过滤：非 admin 只看自己企业的
    if (role !== 'admin' && companyId) {
      query = query.eq('company_id', companyId);
    }

    // 角色过滤：staff 只看自己的
    if (role === 'staff' || role === 'personal_user') {
      query = query.eq('user_id', userId);
    }

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (orderNo) query = query.eq('order_no', orderNo);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(`查询工单失败: ${error.message}`);

    return NextResponse.json({ data: data || [], total: count || 0 });
  } catch (err) {
    console.error('[work-orders GET] error:', err);
    return NextResponse.json({ error: '获取工单列表失败' }, { status: 500 });
  }
}

/* ─── POST: 创建工单 ─── */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const client = getSupabaseClient();
    const body = await request.json();

    // 使用后端验证的 companyId，不信任前端传入值
    const companyId = auth.companyId;
    const userId = auth.userId;

    // 如果前端传了 company_id，验证归属
    if (body.company_id && !verifyCompanyAccess(auth, body.company_id)) {
      return forbiddenResponse('无权在该企业下创建工单');
    }

    // 二选一验证：客户名称 或 订单号 至少填一个
    const customerName = (body.customer_name || '').trim();
    const orderNo = (body.order_no || '').trim();
    if (!customerName && !orderNo) {
      return NextResponse.json(
        { error: '客户名称和平台订单号至少填写一项' },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      company_id: companyId || body.company_id,
      user_id: userId,
      customer_name: customerName,
      customer_phone: body.customer_phone || '',
      order_no: orderNo,
      query: body.query || '',
      category: body.category || '',
      ai_judgment: body.ai_judgment || '',
      ai_script: body.ai_script || '',
      priority: body.priority || '普通',
      status: body.status || '待处理',
      result: body.result || '',
      source_type: body.source_type || 'ai_generate',
      problem_solution_id: body.problem_solution_id || null,
    };

    const { data, error } = await client
      .from('work_orders')
      .insert(insertData)
      .select();

    if (error) throw new Error(`创建工单失败: ${error.message}`);

    return NextResponse.json({ data: data?.[0] });
  } catch (err) {
    console.error('[work-orders POST] error:', err);
    return NextResponse.json({ error: '创建工单失败' }, { status: 500 });
  }
}

/* ─── PATCH: 更新工单（状态/结果/优先级）─── */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少工单ID' }, { status: 400 });
    }

    // 验证工单归属：非 admin 只能修改自己企业的工单
    if (auth.role !== 'admin' && auth.companyId) {
      const { data: order, error: fetchError } = await client
        .from('work_orders')
        .select('company_id, user_id')
        .eq('id', id)
        .single();

      if (fetchError || !order) {
        return NextResponse.json({ error: '工单不存在' }, { status: 404 });
      }

      if ((order as Record<string, unknown>).company_id !== auth.companyId) {
        return forbiddenResponse('无权修改该工单');
      }

      // staff 只能修改自己的工单
      if ((auth.role === 'staff' || auth.role === 'personal_user') && (order as Record<string, unknown>).user_id !== auth.userId) {
        return forbiddenResponse('只能修改自己的工单');
      }
    }

    // 只允许更新这些字段
    const allowedFields = ['status', 'result', 'priority', 'customer_name', 'customer_phone', 'category', 'order_no'];
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    filteredUpdates.updated_at = new Date().toISOString();

    // 状态变为已完成时，自动设置 completed_at
    if (filteredUpdates.status === '已完成') {
      filteredUpdates.completed_at = new Date().toISOString();
    }

    const { data, error } = await client
      .from('work_orders')
      .update(filteredUpdates)
      .eq('id', id)
      .select();

    if (error) throw new Error(`更新工单失败: ${error.message}`);

    return NextResponse.json({ data: data?.[0] });
  } catch (err) {
    console.error('[work-orders PATCH] error:', err);
    return NextResponse.json({ error: '更新工单失败' }, { status: 500 });
  }
}
