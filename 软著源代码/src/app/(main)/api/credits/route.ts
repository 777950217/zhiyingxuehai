import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/credits?userId=xxx
 * Returns remaining_credits for the user
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('remaining_credits, role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const isPersonalOrEfficiency = data.role === 'personal_user' || data.role === 'efficiency_user';

  return NextResponse.json({
    remainingCredits: isPersonalOrEfficiency ? 999 : (data.remaining_credits ?? 0),
    role: data.role,
    unlimited: isPersonalOrEfficiency,
  });
}

/**
 * POST /api/credits
 * Deduct 1 credit after successful AI call
 * Body: { userId: string }
 * Returns: { success: true, remainingCredits: number }
 */
export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Get current credits
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('remaining_credits')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentCredits = user.remaining_credits ?? 0;
  if (currentCredits <= 0) {
    return NextResponse.json({ error: '当日免费次数已用完，明日再来', remainingCredits: 0 }, { status: 403 });
  }

  // Deduct 1 credit (atomic update)
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ remaining_credits: currentCredits - 1 })
    .eq('id', userId)
    .select('remaining_credits')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: '扣减次数失败' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    remainingCredits: updated.remaining_credits,
  });
}
