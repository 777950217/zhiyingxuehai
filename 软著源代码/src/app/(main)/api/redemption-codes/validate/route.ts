import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** POST /api/redemption-codes/validate — validate a code for registration */
export async function POST(request: NextRequest) {
  const { code } = await request.json() as { code: string };

  if (!code) {
    return NextResponse.json({ error: '兑换码不能为空' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('redemption_codes')
    .select('id, code, plan_type, is_used, expires_at')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '兑换码无效' }, { status: 400 });
  }

  if (data.is_used) {
    return NextResponse.json({ error: '该兑换码已被使用' }, { status: 400 });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: '该兑换码已过期' }, { status: 400 });
  }

  return NextResponse.json({ valid: true, codeId: data.id, planType: data.plan_type });
}
