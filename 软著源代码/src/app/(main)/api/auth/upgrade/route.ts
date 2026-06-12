import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Verify user is currently efficiency_user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, user_type, company_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (user.role !== 'efficiency_user') {
      return NextResponse.json({ error: '仅效率版用户可解锁管理版' }, { status: 400 });
    }

    // Upgrade: efficiency_user → personal_user
    const now = new Date();
    const planEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: 'personal_user',
        user_type: 'small',
        updated_at: now.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Upgrade] User update failed:', updateError);
      return NextResponse.json({ error: '解锁失败' }, { status: 500 });
    }

    // Update company plan
    const { error: companyError } = await supabase
      .from('companies')
      .update({
        plan: 'basic',
        plan_start: now.toISOString(),
        plan_end: planEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', user.company_id);

    if (companyError) {
      console.error('[Upgrade] Company update failed:', companyError);
      // Non-fatal: user is upgraded even if company update fails
    }

    return NextResponse.json({
      success: true,
      newRole: 'personal_user',
      planEnd: planEnd.toISOString(),
      message: '解锁成功！99年费已抵扣，管理版功能已启用',
    });
  } catch (err) {
    console.error('[Upgrade] Unexpected error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
