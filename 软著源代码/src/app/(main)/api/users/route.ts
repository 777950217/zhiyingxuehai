import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, verifyCompanyAccess, forbiddenResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let query = client.from('users').select('id, company_id, email, display_name, role, user_type, ai_credits_remaining, status, last_login_at, created_at', { count: 'exact' }).order('created_at', { ascending: false });

    // 非 admin 强制企业过滤，只看自己企业的用户
    if (auth.role !== 'admin') {
      if (auth.companyId) {
        query = query.eq('company_id', auth.companyId);
      }
    } else {
      // admin 可选按 company_id 过滤
      const company_id = searchParams.get('company_id');
      if (company_id) query = query.eq('company_id', company_id);
    }

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new Error(`查询用户失败: ${error.message}`);

    return NextResponse.json({ data, total: count });
  } catch (err) {
    console.error('[users GET] error:', err);
    return NextResponse.json({ error: '查询用户失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 只有 admin 和企业管理员可以创建用户
  if (auth.role !== 'admin' && auth.role !== 'enterprise_admin') {
    return forbiddenResponse('无权创建用户');
  }

  try {
    const client = getSupabaseClient();
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }

    // 确定 company_id：admin 可指定，其他角色只能在自己企业下创建
    const companyId = auth.role === 'admin' ? (body.company_id || auth.companyId) : auth.companyId;

    // 如果前端传了 company_id，验证归属
    if (body.company_id && !verifyCompanyAccess(auth, body.company_id)) {
      return forbiddenResponse('无权在该企业下创建用户');
    }

    // 检查座位上限
    const { data: company } = await client.from('companies').select('seat_limit, seat_used').eq('id', companyId).single();
    const seatLimit = company?.seat_limit ?? 1;
    const { count: currentCount } = await client.from('users').select('*', { count: 'exact', head: true }).eq('company_id', companyId).neq('status', 'deleted');
    const usedSeats = currentCount ?? 0;
    if (usedSeats >= seatLimit) {
      return NextResponse.json({ error: '已达到当前版本座位上限，请解锁更高版本', seatLimit, usedSeats }, { status: 403 });
    }

    const { data, error } = await client.from('users').insert({
      company_id: companyId,
      email: body.email,
      password_hash: body.password_hash || '',
      display_name: body.display_name || '',
      role: body.role || 'staff',
      user_type: body.user_type || 'small',
      ai_credits_remaining: body.ai_credits_remaining || 3,
      status: body.status || 'active',
    }).select();
    if (error) throw new Error(`创建用户失败: ${error.message}`);

    // 更新 seat_used
    await client.from('companies').update({ seat_used: usedSeats + 1 }).eq('id', companyId);

    return NextResponse.json({ data: data[0] });
  } catch (err) {
    console.error('[users POST] error:', err);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
