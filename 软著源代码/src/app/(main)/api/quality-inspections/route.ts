import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/* ─── GET: 查询质检记录列表（按角色过滤）─── */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const role = searchParams.get('role') || 'staff';
    const userId = searchParams.get('userId');
    const staffId = searchParams.get('staffId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = client
      .from('quality_inspections')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 角色过滤
    if ((role === 'staff' || role === 'personal_user') && userId) {
      query = query.eq('staff_id', userId);
    } else if ((role === 'enterprise_manager' || role === 'ent_admin') && companyId) {
      query = query.eq('company_id', companyId);
    } else if (role === 'admin') {
      // admin 看全部
    } else if (userId) {
      query = query.eq('staff_id', userId);
    }

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // 手动查询关联的用户名
    const records = data || [];
    const userIds = new Set<string>();
    records.forEach((r: { inspector_id: string; staff_id: string }) => {
      if (r.inspector_id) userIds.add(r.inspector_id);
      if (r.staff_id) userIds.add(r.staff_id);
    });

    let userMap: Record<string, string> = {};
    if (userIds.size > 0) {
      const { data: users } = await client
        .from('users')
        .select('id, display_name')
        .in('id', Array.from(userIds));
      if (users) {
        userMap = Object.fromEntries(users.map((u: { id: string; display_name: string }) => [u.id, u.display_name]));
      }
    }

    const enriched = records.map((r: Record<string, unknown>) => ({
      ...r,
      inspector_name: userMap[r.inspector_id as string] || '未知',
      staff_name: userMap[r.staff_id as string] || '未知',
    }));

    return NextResponse.json({ data: enriched, total: count || 0 });
  } catch (err) {
    console.error('[quality-inspections GET] error:', err);
    return NextResponse.json({ error: '获取质检记录失败' }, { status: 500 });
  }
}

/* ─── POST: 创建质检记录 ─── */
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { company_id, inspector_id, staff_id, problem_solution_id,
            response_score, script_score, attitude_score, process_score, resolution_score,
            comment } = body;

    if (!company_id || !inspector_id || !staff_id) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const scores = [response_score, script_score, attitude_score, process_score, resolution_score];
    for (const s of scores) {
      if (typeof s !== 'number' || s < 0 || s > 20) {
        return NextResponse.json({ error: '分数范围应为0-20' }, { status: 400 });
      }
    }

    const { data, error } = await client
      .from('quality_inspections')
      .insert({
        company_id,
        inspector_id,
        staff_id,
        problem_solution_id: problem_solution_id || null,
        response_score,
        script_score,
        attitude_score,
        process_score,
        resolution_score,
        comment: comment || '',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[quality-inspections POST] error:', err);
    return NextResponse.json({ error: '创建质检记录失败' }, { status: 500 });
  }
}
