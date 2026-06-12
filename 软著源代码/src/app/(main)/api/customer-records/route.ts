import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextResponse } from 'next/server';

const supabase = getSupabaseClient();

// GET /api/customer-records — 列表查询（支持角色隔离+筛选）
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '无企业信息' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const orderType = searchParams.get('order_type');
    const assignStatus = searchParams.get('assign_status');
    const responsibility = searchParams.get('responsibility');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    // 统计接口：客服损失数据
    if (action === 'stats') {
      // 仅 manager 及以上角色可访问
      if (profile.role === 'staff' || profile.role === 'personal_user') {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
      }
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const thisMonthEnd = now.toISOString();

      // 本月客服失误数据
      const { data: thisMonthData } = await supabase
        .from('customer_records')
        .select('compensation_amount')
        .eq('company_id', profile.company_id)
        .eq('is_staff_caused', true)
        .gte('created_at', thisMonthStart)
        .lt('created_at', thisMonthEnd);

      // 上月客服失误数据
      const { data: lastMonthData } = await supabase
        .from('customer_records')
        .select('compensation_amount')
        .eq('company_id', profile.company_id)
        .eq('is_staff_caused', true)
        .gte('created_at', lastMonthStart)
        .lt('created_at', thisMonthStart);

      // 本月总退款数据（有赔付金额的工单）
      const { data: totalRefundData } = await supabase
        .from('customer_records')
        .select('compensation_amount')
        .eq('company_id', profile.company_id)
        .gt('compensation_amount', 0)
        .gte('created_at', thisMonthStart)
        .lt('created_at', thisMonthEnd);

      const staffCausedRefundTotal = (thisMonthData || []).reduce((sum: number, r: { compensation_amount: number }) => sum + (Number(r.compensation_amount) || 0), 0);
      const lastMonthStaffTotal = (lastMonthData || []).reduce((sum: number, r: { compensation_amount: number }) => sum + (Number(r.compensation_amount) || 0), 0);
      const totalRefundTotal = (totalRefundData || []).reduce((sum: number, r: { compensation_amount: number }) => sum + (Number(r.compensation_amount) || 0), 0);
      const staffCausedCount = (thisMonthData || []).length;
      const staffCausedRate = totalRefundTotal > 0 ? (staffCausedRefundTotal / totalRefundTotal * 100) : 0;
      const lastMonthRate = lastMonthStaffTotal > 0 && totalRefundTotal > 0 ? (lastMonthStaffTotal / (totalRefundTotal + lastMonthStaffTotal - staffCausedRefundTotal) * 100) : 0;

      return NextResponse.json({
        staff_caused_refund_total: staffCausedRefundTotal,
        staff_caused_count: staffCausedCount,
        total_refund_total: totalRefundTotal,
        staff_caused_rate: Math.round(staffCausedRate * 10) / 10,
        last_month_staff_total: lastMonthStaffTotal,
        last_month_rate: Math.round(lastMonthRate * 10) / 10,
      });
    }

    let query = supabase
      .from('customer_records')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    // 角色隔离：staff只能看自己负责的工单
    if (profile.role === 'staff') {
      query = query.eq('assignee_id', user.id);
    }

    if (status) query = query.eq('status', status);
    if (orderType) query = query.eq('order_type', orderType);
    if (assignStatus) query = query.eq('assign_status', assignStatus);
    if (responsibility) query = query.eq('responsibility', responsibility);
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,related_order_id.ilike.%${search}%,product_model.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, total: count, page, page_size: pageSize });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/customer-records — 创建工单
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '无企业信息' }, { status: 400 });
    }

    const body = await request.json();
    const {
      customer_name, customer_phone, source_platform, related_order_id,
      product_model, order_type, sub_type, progress, status,
      assignee_id, assign_status, promised_deadline, follow_up_summary,
      customer_demand, final_solution, closure_result, tags,
      // P1 售后字段
      pit_distance, actual_water_pressure, evidence_urls,
      compensation_amount, replacement_parts, installer_name,
      // P1 售前字段
      house_pit_distance, house_water_pressure, install_scenario, purchase_intent,
      // 责任归属
      responsibility,
    } = body;

    // 必填校验
    if (!customer_name || !customer_phone || !source_platform || !product_model || !order_type) {
      return NextResponse.json({ error: '缺少必填字段（客户姓名/手机号/下单平台/产品型号/工单类型）' }, { status: 400 });
    }

    // 售后类型必填订单号
    if (['售后故障', '投诉维权', '退换货'].includes(order_type) && !related_order_id) {
      return NextResponse.json({ error: '售后类工单必须填写订单编号' }, { status: 400 });
    }

    // 售后类型必填承诺办结时间
    if (['售后故障', '投诉维权', '退换货'].includes(order_type) && !promised_deadline) {
      return NextResponse.json({ error: '售后类工单必须填写承诺办结时间' }, { status: 400 });
    }

    // 条件必填：安装错位/尺寸不符 → 坑距必填
    if (['安装错位', '尺寸不符'].includes(sub_type) && !pit_distance) {
      return NextResponse.json({ error: '选中安装错位/尺寸不符时，现场实测坑距为必填' }, { status: 400 });
    }

    // 条件必填：冲水无力/水压不足 → 水压必填
    if (['冲水无力', '水压不足'].includes(sub_type) && !actual_water_pressure) {
      return NextResponse.json({ error: '选中冲水无力/水压不足时，现场实际水压为必填' }, { status: 400 });
    }

    // 售前咨询必填房屋坑距
    if (order_type === '售前咨询' && !house_pit_distance) {
      return NextResponse.json({ error: '售前咨询必须填写房屋坑距' }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      company_id: profile.company_id,
      customer_name, customer_phone, source_platform,
      related_order_id: related_order_id || '',
      product_model, order_type,
      sub_type: sub_type || '',
      progress: progress || '未响应',
      status: status || '未服务',
      assignee_id: assignee_id || '',
      assign_status: assign_status || (assignee_id ? '已分配' : '未分配'),
      promised_deadline: promised_deadline || null,
      follow_up_summary: follow_up_summary || '',
      customer_demand: customer_demand || '',
      final_solution: final_solution || '',
      closure_result: closure_result || '',
      tags: tags || [],
      created_by: user.id,
      // P1 售后字段
      pit_distance: pit_distance || '',
      actual_water_pressure: actual_water_pressure || '',
      evidence_urls: evidence_urls || [],
      compensation_amount: compensation_amount || 0,
      replacement_parts: replacement_parts || [],
      installer_name: installer_name || '',
      // P1 售前字段
      house_pit_distance: house_pit_distance || '',
      house_water_pressure: house_water_pressure || '',
      install_scenario: install_scenario || '',
      purchase_intent: purchase_intent || '',
      // 责任归属
      responsibility: responsibility || '',
      is_staff_caused: responsibility === 'staff_mistake',
    };

    const { data, error } = await supabase
      .from('customer_records')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/customer-records — 更新（传id在body中）
export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '无企业信息' }, { status: 400 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少工单ID' }, { status: 400 });
    }

    // 自动设置首次响应时间
    if (updates.progress && updates.progress !== '未响应' && updates.progress !== '未联系客户') {
      updates.first_response_at = new Date().toISOString();
    }

    // 完结时自动设置完结时间
    if (updates.status === '已完结' || updates.status === '已关闭') {
      updates.completed_at = new Date().toISOString();
    }

    // 更新分配状态
    if (updates.assignee_id) {
      updates.assign_status = '已分配';
    }

    // 责任归属联动：选择客服失误自动标记is_staff_caused
    if (updates.responsibility !== undefined) {
      updates.is_staff_caused = updates.responsibility === 'staff_mistake';
    }

    // 赔付金额联动成本预警：如果有赔付金额，写入成本预警
    if (updates.compensation_amount && Number(updates.compensation_amount) > 0) {
      try {
        await supabase
          .from('cost_alerts')
          .insert({
            company_id: profile.company_id,
            type: '售后赔付',
            amount: Number(updates.compensation_amount),
            description: `工单赔付：${updates.related_order_id || id}`,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
      } catch { /* 非阻塞，成本预警写入失败不影响工单保存 */ }
    }

    const { data, error } = await supabase
      .from('customer_records')
      .update(updates)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: '工单不存在或无权限' }, { status: 404 });

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/customer-records — 删除
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '无企业信息' }, { status: 400 });
    }

    if (profile.role !== 'admin' && profile.role !== 'enterprise_admin' && profile.role !== 'enterprise_manager') {
      return NextResponse.json({ error: '无删除权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少工单ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('customer_records')
      .delete()
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
