import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'reports' | 'views' | 'subscriptions' | 'recharge_logs'

    if (type === 'views') {
      const userId = searchParams.get('user_id');
      let query = supabase.from('report_views').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'subscriptions') {
      const companyId = searchParams.get('company_id');
      let query = supabase.from('subscriptions').select('*');
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'recharge_logs') {
      const companyId = searchParams.get('company_id');
      let query = supabase.from('recharge_logs').select('*').order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Default: daily_reports
    const reportType = searchParams.get('report_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase.from('daily_reports').select('*').order('report_date', { ascending: false });
    if (reportType) query = query.eq('type', reportType);
    if (startDate) query = query.gte('report_date', startDate);
    if (endDate) query = query.lte('report_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /daily-data error:', err);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const type = body.type;

    if (type === 'view') {
      // Mark report as viewed
      const { data, error } = await supabase
        .from('report_views')
        .upsert({
          user_id: body.user_id,
          report_id: body.report_id,
          viewed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,report_id' })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'subscription') {
      const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
          company_id: body.company_id,
          plan: body.plan,
          plan_period: body.plan_period,
          plan_start: body.plan_start,
          plan_end: body.plan_end,
          status: body.status || 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'recharge_log') {
      const { data, error } = await supabase
        .from('recharge_logs')
        .insert({
          company_id: body.company_id,
          user_id: body.user_id,
          user_name: body.user_name,
          plan: body.plan,
          period: body.period,
          amount: body.amount,
          operator_id: body.operator_id,
          operator_name: body.operator_name,
          remark: body.remark,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知类型' }, { status: 400 });
  } catch (err) {
    console.error('[API] POST /daily-data error:', err);
    return NextResponse.json({ error: '保存数据失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const type = body.type;

    if (type === 'subscription') {
      const { id, ...updates } = body;
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知类型' }, { status: 400 });
  } catch (err) {
    console.error('[API] PUT /daily-data error:', err);
    return NextResponse.json({ error: '更新数据失败' }, { status: 500 });
  }
}
