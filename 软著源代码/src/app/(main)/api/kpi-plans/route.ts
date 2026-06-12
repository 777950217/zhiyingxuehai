import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    let query = supabase
      .from('kpi_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /kpi-plans error:', err);
    return NextResponse.json({ error: '获取KPI方案失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('kpi_plans')
      .insert({
        company_id: body.company_id,
        name: body.name,
        team_size: body.team_size,
        presale_ratio: body.presale_ratio,
        aftersale_ratio: body.aftersale_ratio,
        daily_orders: body.daily_orders,
        team_stage: body.team_stage,
        focus: typeof body.focus === 'string' ? body.focus : JSON.stringify(body.focus || []),
        metrics: typeof body.metrics === 'string' ? body.metrics : JSON.stringify(body.metrics || []),
        is_active: body.is_active || false,
        created_by: body.created_by,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /kpi-plans error:', err);
    return NextResponse.json({ error: '创建KPI方案失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, activate, ...updates } = body;

    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });

    // "启用方案"操作：将同公司其他方案设为false，当前方案设为true
    if (activate) {
      // 先获取该方案的company_id
      const { data: plan } = await supabase
        .from('kpi_plans')
        .select('company_id')
        .eq('id', id)
        .maybeSingle();

      if (plan?.company_id) {
        // 停用同公司所有方案
        await supabase
          .from('kpi_plans')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('company_id', plan.company_id);

        // 启用当前方案
        const { data, error } = await supabase
          .from('kpi_plans')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ data });
      }
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    // 普通更新
    if (updates.focus && typeof updates.focus !== 'string') {
      updates.focus = JSON.stringify(updates.focus);
    }
    if (updates.metrics && typeof updates.metrics !== 'string') {
      updates.metrics = JSON.stringify(updates.metrics);
    }

    const { data, error } = await supabase
      .from('kpi_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] PUT /kpi-plans error:', err);
    return NextResponse.json({ error: '更新KPI方案失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });

    const { error } = await supabase
      .from('kpi_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /kpi-plans error:', err);
    return NextResponse.json({ error: '删除KPI方案失败' }, { status: 500 });
  }
}
