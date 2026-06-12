import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/invitations — 查询本公司的邀请列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: '缺少 company_id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '查询邀请列表失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/invitations — 创建邀请
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { company_id, inviter_id, phone, email } = body;

    if (!company_id || !inviter_id) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // ─── 座位检查 ───
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('seat_limit, seat_used, name')
      .eq('id', company_id)
      .single();

    if (companyError) throw companyError;

    if (company.seat_used >= company.seat_limit) {
      return NextResponse.json({
        error: `座位数已满（${company.seat_used}/${company.seat_limit}），请先调整套餐或联系客服加座`,
        code: 'SEAT_LIMIT_REACHED',
      }, { status: 400 });
    }

    // ─── 生成随机 token ───
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天有效期

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        company_id,
        inviter_id,
        phone: phone || null,
        email: email || null,
        token,
        role: 'staff',
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '创建邀请失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
