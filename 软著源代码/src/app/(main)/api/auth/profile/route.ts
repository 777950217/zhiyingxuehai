import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cacheHeaders } from '@/lib/api-cache';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Get user record
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, company_id, email, display_name, role, user_type, remaining_credits, industry, team_size, gender, bio, industry_profile_completed, expires_at, created_at')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    // 调试信息：返回错误详情和连接信息
    const { getSupabaseCredentials } = await import('@/storage/database/supabase-client');
    const creds = getSupabaseCredentials();
    return NextResponse.json({
      error: 'User not found',
      profile: null,
      debug: {
        userError: userError?.message || null,
        userErrorCode: userError?.code || null,
        userId,
        supabaseUrl: creds?.url || 'unknown',
        hasData: !!userData,
      }
    }, { status: 404 });
  }

  // Get company name + plan + trial info (only if user has a company)
  const { data: company } = userData.company_id
    ? await supabase.from('companies').select('name, plan, plan_end, trial_end_at').eq('id', userData.company_id).single()
    : { data: null };

  return NextResponse.json({
    profile: {
      id: userData.id,
      email: userData.email,
      companyId: userData.company_id,
      companyName: company?.name || '',
      userType: userData.user_type,
      role: userData.role,
      displayName: userData.display_name || (userData.email ? userData.email.split('@')[0] : '用户'),
      remainingCredits: userData.remaining_credits ?? 0,
      companyPlan: company?.plan || 'basic',
      planEnd: company?.plan_end || null,
      trialEndAt: company?.trial_end_at || null,
      industry: userData.industry || null,
      teamSize: userData.team_size || null,
      industryProfileCompleted: !!userData.industry_profile_completed,
      gender: userData.gender || '保密',
      bio: userData.bio || '',
      expiresAt: userData.expires_at || null,
      createdAt: userData.created_at || '',
    },
  }, { headers: cacheHeaders({ maxAge: 30, staleWhileRevalidate: 15 }) });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, industry, teamSize, displayName, gender, bio } = body as {
    userId: string;
    industry?: string;
    teamSize?: string;
    displayName?: string;
    gender?: string;
    bio?: string;
  };

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const updates: Record<string, string> = {};
  if (industry !== undefined) updates.industry = industry;
  if (teamSize !== undefined) updates.team_size = teamSize;
  if (displayName !== undefined) updates.display_name = displayName;
  if (gender !== undefined) updates.gender = gender;
  if (bio !== undefined) updates.bio = bio;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch updated user data to return
  const { data: updatedUser, error: fetchErr } = await supabase
    .from('users')
    .select('id, email, company_id, user_type, role, display_name, remaining_credits, industry, team_size, gender, bio, expires_at, created_at')
    .eq('id', userId)
    .single();

  if (fetchErr || !updatedUser) {
    return NextResponse.json({ success: true });
  }

  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('name, plan, plan_end, trial_end_at')
    .eq('id', updatedUser.company_id)
    .single();

  return NextResponse.json({
    success: true,
    profile: {
      id: updatedUser.id,
      email: updatedUser.email,
      companyId: updatedUser.company_id,
      companyName: company?.name || '',
      userType: updatedUser.user_type,
      role: updatedUser.role,
      displayName: updatedUser.display_name || (updatedUser.email ? updatedUser.email.split('@')[0] : '用户'),
      remainingCredits: updatedUser.remaining_credits ?? 0,
      companyPlan: company?.plan || 'basic',
      planEnd: company?.plan_end || null,
      trialEndAt: company?.trial_end_at || null,
      industry: updatedUser.industry || null,
      teamSize: updatedUser.team_size || null,
      gender: updatedUser.gender || '保密',
      bio: updatedUser.bio || '',
      expiresAt: updatedUser.expires_at || null,
      createdAt: updatedUser.created_at || '',
    },
  });
}
