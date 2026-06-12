import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  // 兼容 companyId 和 company_id 两种写法
  const company_id = searchParams.get('company_id') || searchParams.get('companyId');
  const position = searchParams.get('position');
  const status = searchParams.get('status');

  let query = client.from('agents').select('id, company_id, name, employee_id, hire_date, position, training_stage, status, team_id, role_tag, skill_tags, created_at', { count: 'exact' }).order('created_at', { ascending: false });

  if (company_id) query = query.eq('company_id', company_id);
  if (position) query = query.eq('position', position);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw new Error(`查询客服失败: ${error.message}`);

  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  const body = await request.json();

  // 检查座位上限
  const companyId = body.company_id;
  if (companyId) {
    const { data: company } = await client.from('companies').select('seat_limit, seat_used').eq('id', companyId).single();
    const seatLimit = company?.seat_limit ?? 1;
    const { count: agentCount } = await client.from('agents').select('*', { count: 'exact', head: true }).eq('company_id', companyId).neq('status', '离职');
    const usedSeats = agentCount ?? 0;
    if (usedSeats >= seatLimit) {
      return NextResponse.json({ error: '已达到当前版本座位上限，请解锁更高版本', seatLimit, usedSeats }, { status: 403 });
    }
  }

  const { data, error } = await client.from('agents').insert({
    company_id: companyId,
    name: body.name,
    employee_id: body.employee_id,
    hire_date: body.hire_date,
    position: body.position || '售中客服',
    training_stage: body.training_stage || '基础',
    status: body.status || '在职',
    role_tag: body.role_tag || '售前',
    skill_tags: body.skill_tags || [],
  }).select();
  if (error) throw new Error(`创建客服失败: ${error.message}`);

  // 更新 seat_used
  if (companyId) {
    const { count: agentCount2 } = await client.from('agents').select('*', { count: 'exact', head: true }).eq('company_id', companyId).neq('status', '离职');
    await client.from('companies').update({ seat_used: agentCount2 ?? 0 }).eq('id', companyId);
  }

  // 自动创建入职档案
  const agent = data[0];
  if (agent && body.company_id) {
    try {
      await client.from('onboarding_records').insert({
        company_id: body.company_id,
        agent_id: agent.id,
        step1_status: '已完成',  // 已分配账号
        step2_status: '未开始',
        step3_status: '未开始',
        step4_status: '未开始',
      });
    } catch {
      // 入职档案创建失败不影响主流程，仅记录日志
      console.warn('[agents POST] 自动创建入职档案失败，agent_id:', agent.id);
    }
  }

  return NextResponse.json({ data: agent });
}
