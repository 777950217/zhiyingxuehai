import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'personal_user') {
      return NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 });
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    let query = supabase
      .from('personal_data_records')
      .select('*')
      .eq('user_id', user.id)
      .order('record_date', { ascending: false });

    if (startDate) query = query.gte('record_date', startDate);
    if (endDate) query = query.lte('record_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'personal_user') {
      return NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 });
    }

    const body = await request.json();
    const {
      record_date, visits = 0, avg_response_time = 0, consultations = 0, orders = 0, complaints = 0, notes = '',
      target_visits, target_response_time, target_consultations, target_orders, target_complaints, target_conversion_rate,
    } = body;
    if (!record_date) return NextResponse.json({ error: '日期不能为空' }, { status: 400 });

    // Auto-calculate rates
    const conversion_rate = consultations > 0 ? Math.round((orders / consultations) * 10000) / 100 : 0;
    const complaint_rate = visits > 0 ? Math.round((complaints / visits) * 10000) / 100 : 0;

    // Calculate mom_change: compare with previous record
    const { data: prevRecords } = await supabase
      .from('personal_data_records')
      .select('visits')
      .eq('user_id', user.id)
      .lt('record_date', record_date)
      .order('record_date', { ascending: false })
      .limit(1);

    let mom_change = 0;
    if (prevRecords && prevRecords.length > 0 && prevRecords[0].visits > 0) {
      mom_change = Math.round(((visits - prevRecords[0].visits) / prevRecords[0].visits) * 10000) / 100;
    }

    const { data, error } = await supabase
      .from('personal_data_records')
      .insert({
        user_id: user.id,
        record_date,
        visits,
        avg_response_time,
        consultations,
        orders,
        complaints,
        conversion_rate,
        complaint_rate,
        mom_change,
        notes,
        target_visits: target_visits ?? null,
        target_response_time: target_response_time ?? null,
        target_consultations: target_consultations ?? null,
        target_orders: target_orders ?? null,
        target_complaints: target_complaints ?? null,
        target_conversion_rate: target_conversion_rate ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '创建失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });

    const { error } = await supabase
      .from('personal_data_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '删除失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
