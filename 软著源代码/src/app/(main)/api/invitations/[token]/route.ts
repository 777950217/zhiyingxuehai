import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/invitations/[token] — 验证邀请 token
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('invitations')
      .select('id, company_id, phone, email, role, status, expires_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '邀请链接无效', valid: false }, { status: 404 });
    }

    // 检查是否过期
    if (data.status !== 'pending') {
      return NextResponse.json({ error: '邀请已被使用或已取消', valid: false }, { status: 400 });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // 标记为过期
      await supabase.from('invitations').update({ status: 'expired' }).eq('id', data.id);
      return NextResponse.json({ error: '邀请已过期', valid: false }, { status: 400 });
    }

    // 获取公司名
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', data.company_id)
      .single();

    return NextResponse.json({
      valid: true,
      company_id: data.company_id,
      company_name: company?.name || '',
      role: data.role,
      email: data.email,
      phone: data.phone,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '验证邀请失败';
    return NextResponse.json({ error: msg, valid: false }, { status: 500 });
  }
}

// POST /api/invitations/[token] — 使用邀请（注册完成后调用）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: '缺少 user_id' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 验证 token
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: '邀请链接无效' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: '邀请已被使用' }, { status: 400 });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await supabase.from('invitations').update({ status: 'expired' }).eq('id', invitation.id);
      return NextResponse.json({ error: '邀请已过期' }, { status: 400 });
    }

    // ─── 标记邀请已使用 ───
    const { error: updateInvError } = await supabase
      .from('invitations')
      .update({
        status: 'used',
        used_by: user_id,
        used_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateInvError) throw updateInvError;

    // ─── 座位+1 ───
    const { data: company } = await supabase
      .from('companies')
      .select('seat_used, seat_limit')
      .eq('id', invitation.company_id)
      .single();

    if (company) {
      const newSeatUsed = (company.seat_used || 0) + 1;
      await supabase
        .from('companies')
        .update({ seat_used: newSeatUsed })
        .eq('id', invitation.company_id);
    }

    return NextResponse.json({
      success: true,
      company_id: invitation.company_id,
      role: invitation.role,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '使用邀请失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
