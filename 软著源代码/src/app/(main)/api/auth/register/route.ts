import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { validateEmail, validatePassword, validatePhone, validateCode, validateRole, sanitizeString } from '@/lib/validate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, companyName, role, phone, inviteToken, redemptionCode, adminCreate, validDays, displayName } = body;

    // ─── Input validation ───
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return NextResponse.json({ error: emailCheck.error }, { status: 400 });

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return NextResponse.json({ error: pwCheck.error }, { status: 400 });

    if (phone) {
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.valid) return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }

    if (redemptionCode) {
      const codeCheck = validateCode(redemptionCode);
      if (!codeCheck.valid) return NextResponse.json({ error: codeCheck.error }, { status: 400 });
    }

    if (role) {
      const roleCheck = validateRole(role);
      if (!roleCheck.valid) return NextResponse.json({ error: roleCheck.error }, { status: 400 });
    }

    if (inviteToken && !/^[a-zA-Z0-9_-]+$/.test(String(inviteToken))) {
      return NextResponse.json({ error: '邀请链接格式不正确' }, { status: 400 });
    }

    // Sanitize text fields
    const safeCompanyName = companyName ? sanitizeString(companyName, 100) : undefined;
    const safeDisplayName = displayName ? sanitizeString(displayName, 50) : undefined;

    const supabase = getSupabaseClient();

    // ─── Admin Create flow ───
    // Admin can create any role account directly (no redemption code needed)
    if (adminCreate) {
      const targetRole = role || 'enterprise_manager';
      const isEnterprise = targetRole === 'enterprise_admin' || targetRole === 'enterprise_manager';

      if (!isEnterprise) {
        return NextResponse.json({ error: '管理员创建仅限专业版/旗舰版，个人版请使用兑换码注册' }, { status: 400 });
      }

      // Check if email already registered
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json({ error: '该邮箱已注册，请直接登录后在Admin后台变更角色' }, { status: 400 });
      }

      const planMap: Record<string, string> = { enterprise_admin: 'flagship', enterprise_manager: 'pro' };
      const serviceLevelMap: Record<string, string> = { enterprise_admin: 'premium', enterprise_manager: 'standard' };
      const userTypeMap: Record<string, string> = { enterprise_admin: 'manager', enterprise_manager: 'premium' };
      const seatLimitMap: Record<string, number> = { enterprise_admin: 15, enterprise_manager: 5 };
      const now = new Date();
      const days = validDays || 365;
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // 1. Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: safeCompanyName || (email.split('@')[0] + '的企业空间'),
          industry: '电商',
          team_size: 1,
          plan: planMap[targetRole] || 'pro',
          plan_start: now.toISOString(),
          plan_end: expiresAt.toISOString(),
          trial_end_at: null,
          service_level: serviceLevelMap[targetRole] || 'standard',
          seat_limit: seatLimitMap[targetRole] || 5,
          seat_used: 1,
          status: 'active',
          contact_name: displayName || email,
          contact_phone: phone || null,
        })
        .select('id')
        .single();

      if (companyError || !company) {
        return NextResponse.json({ error: '创建企业失败' }, { status: 500 });
      }

      // 2. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        await supabase.from('companies').delete().eq('id', company.id);
        const msg = authError?.message || '未知错误';
        if (msg.includes('already been registered')) {
          return NextResponse.json({ error: '该邮箱已注册，请直接登录后在Admin后台变更角色' }, { status: 400 });
        }
        return NextResponse.json({ error: '创建认证用户失败: ' + msg }, { status: 500 });
      }

      // 3. Create user record
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        company_id: company.id,
        email,
        password_hash: 'auth_managed',
        display_name: safeDisplayName || email.split('@')[0],
        role: targetRole,
        user_type: userTypeMap[targetRole] || 'premium',
        remaining_credits: 99,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      });

      if (userError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from('companies').delete().eq('id', company.id);
        return NextResponse.json({ error: '创建用户记录失败' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        companyId: company.id,
        userId: authData.user.id,
        role: targetRole,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // Check if email already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 });
    }

    // ─── Invitation flow ───
    if (inviteToken) {
      // Validate invitation
      const { data: invitation, error: invErr } = await supabase
        .from('invitations')
        .select('id, company_id, role, status, expires_at')
        .eq('token', inviteToken)
        .maybeSingle();

      if (invErr || !invitation) {
        return NextResponse.json({ error: '邀请链接无效' }, { status: 400 });
      }
      if (invitation.status !== 'pending') {
        return NextResponse.json({ error: '邀请链接已被使用' }, { status: 400 });
      }
      if (new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json({ error: '邀请链接已过期' }, { status: 400 });
      }

      // Check seat limit
      const { data: invCompany } = await supabase
        .from('companies')
        .select('seat_limit, seat_used, name')
        .eq('id', invitation.company_id)
        .single();

      if (invCompany && invCompany.seat_used >= invCompany.seat_limit) {
        return NextResponse.json({ error: '座位数已满，请联系管理员解锁更高版本或增加座位' }, { status: 400 });
      }

      // Sign up user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        const msg = authError?.message || '未知错误';
        if (msg.includes('already been registered')) {
          return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 });
        }
        return NextResponse.json({ error: '注册失败: ' + msg }, { status: 500 });
      }

      // Create user record with invitation company
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        company_id: invitation.company_id,
        email,
        password_hash: 'auth_managed',
        display_name: email.split('@')[0],
        role: invitation.role || 'staff',
        user_type: 'small',
        remaining_credits: 3,
        status: 'active',
      });

      if (userError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: '创建用户记录失败' }, { status: 500 });
      }

      // Mark invitation as used
      await supabase
        .from('invitations')
        .update({ status: 'used', used_by: authData.user.id, used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      // Increment seat_used
      if (invCompany) {
        await supabase
          .from('companies')
          .update({ seat_used: (invCompany.seat_used || 0) + 1 })
          .eq('id', invitation.company_id);
      }

      return NextResponse.json({
        success: true,
        companyId: invitation.company_id,
        userId: authData.user.id,
      });
    }

    // ─── Normal registration flow (personal_user / efficiency_user) ───
    // Enterprise accounts (enterprise_admin/enterprise_manager) can ONLY be created by Admin
    if (role && role !== 'personal_user' && role !== 'efficiency_user') {
      return NextResponse.json({ error: '专业版/旗舰版需由管理员后台开通，请联系客服咨询' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: '缺少角色类型' }, { status: 400 });
    }

    // Personal/Efficiency users MUST provide a redemption code
    const isPersonal = role === 'personal_user' || role === 'efficiency_user';
    if (isPersonal) {
      if (!redemptionCode) {
        return NextResponse.json({ error: '注册需要兑换码' }, { status: 400 });
      }

      // Validate redemption code
      const { data: codeData, error: codeErr } = await supabase
        .from('redemption_codes')
        .select('id, code, plan_type, is_used, expires_at')
        .eq('code', redemptionCode.toUpperCase().trim())
        .single();

      if (codeErr || !codeData) {
        return NextResponse.json({ error: '兑换码无效' }, { status: 400 });
      }
      if (codeData.is_used) {
        return NextResponse.json({ error: '该兑换码已被使用' }, { status: 400 });
      }
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return NextResponse.json({ error: '该兑换码已过期' }, { status: 400 });
      }

      // Override role based on plan_type if not explicitly set
      if (codeData.plan_type === 'efficiency' && role !== 'efficiency_user') {
        return NextResponse.json({ error: '该兑换码为效率版专属，请选择效率版注册' }, { status: 400 });
      }
    }

    // Role-based settings
    const isEnterprise = role === 'enterprise_admin' || role === 'enterprise_manager';
    const planMap: Record<string, string> = {
      enterprise_admin: 'flagship',
      enterprise_manager: 'pro',
      personal_user: 'personal',
      efficiency_user: 'personal',
      staff: 'basic',
    };
    const serviceLevelMap: Record<string, string> = {
      enterprise_admin: 'premium',
      enterprise_manager: 'standard',
      personal_user: 'self',
      efficiency_user: 'self',
      staff: 'self',
    };
    const userTypeMap: Record<string, string> = {
      enterprise_admin: 'manager',
      enterprise_manager: 'premium',
      personal_user: 'small',
      efficiency_user: 'small',
      staff: 'small',
    };

    // Plan: 3-day trial for enterprise, no trial for personal
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Account expiration: personal/efficiency=1yr, enterprise=set by admin later
    const expiresAtMap: Record<string, Date> = {
      personal_user: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
      efficiency_user: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    let companyId: string | null = null;

    // 1. Create company
    const companyDisplayName = isEnterprise
      ? safeCompanyName
      : email.split('@')[0] + '的个人空间';

    const seatLimitMap: Record<string, number> = {
      enterprise_admin: 15,
      enterprise_manager: 5,
      personal_user: 1,
      efficiency_user: 1,
      staff: 1,
    };

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyDisplayName,
        industry: isEnterprise ? '卫浴' : '电商',
        team_size: 1,
        plan: planMap[role] || 'basic',
        plan_start: now.toISOString(),
        plan_end: isEnterprise ? trialEnd.toISOString() : null,
        trial_end_at: isEnterprise ? trialEnd.toISOString() : null,
        service_level: serviceLevelMap[role] || 'self',
        seat_limit: seatLimitMap[role] || 1,
        seat_used: 1,
        status: 'active',
        contact_name: email,
        contact_phone: phone || null,
      })
      .select('id')
      .single();

    if (companyError || !company) {
      console.error('[Register] Company creation failed:', companyError);
      return NextResponse.json({ error: '创建企业失败: ' + (companyError?.message || '未知错误') }, { status: 500 });
    }

    companyId = company.id;

    // 2. Sign up user via Supabase Auth (admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('[Register] Auth user creation failed:', authError);
      await supabase.from('companies').delete().eq('id', companyId);
      const msg = authError?.message || '未知错误';
      if (msg.includes('already been registered')) {
        return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 });
      }
      return NextResponse.json({ error: '注册失败: ' + msg }, { status: 500 });
    }

    // 3. Create user record in users table
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      company_id: companyId,
      email,
      password_hash: 'auth_managed',
      display_name: isEnterprise ? (safeCompanyName || email.split('@')[0]) : email.split('@')[0],
      role: role,
      user_type: userTypeMap[role] || 'small',
      remaining_credits: isPersonal ? 5 : 3,
      status: 'active',
      expires_at: expiresAtMap[role]?.toISOString() || null,
    });

    if (userError) {
      console.error('[Register] User record creation failed:', userError);
      // Best effort cleanup
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from('companies').delete().eq('id', companyId);
      return NextResponse.json({ error: '创建用户记录失败: ' + (userError.message || '未知错误') }, { status: 500 });
    }

    // 4. Mark redemption code as used (personal/efficiency users)
    if (isPersonal && redemptionCode) {
      await supabase
        .from('redemption_codes')
        .update({
          is_used: true,
          used_by: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq('code', redemptionCode.toUpperCase().trim());
    }

    console.log('[Register] Success: userId=', authData.user.id);

    return NextResponse.json({
      success: true,
      companyId,
      userId: authData.user.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '注册失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
