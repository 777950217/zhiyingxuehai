import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { validateEmail } from '@/lib/validate';

// ─── Account lockout: track failed login attempts in-memory ───
// Key: email (lowercase), Value: { count, lockedUntil }
interface LockoutEntry {
  count: number;
  lockedUntil: number; // timestamp, 0 = not locked
}

const lockoutStore = new Map<string, LockoutEntry>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of lockoutStore) {
    if (entry.lockedUntil > 0 && now > entry.lockedUntil) {
      lockoutStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // ─── Input validation ───
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return NextResponse.json({ error: emailCheck.error }, { status: 400 });

    if (!password || typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ error: '请输入密码' }, { status: 400 });
    }

    // ─── Account lockout check ───
    const emailKey = (email as string).trim().toLowerCase();
    const lockout = lockoutStore.get(emailKey);
    const now = Date.now();

    if (lockout && lockout.lockedUntil > 0 && now < lockout.lockedUntil) {
      const remainingMin = Math.ceil((lockout.lockedUntil - now) / 60000);
      return NextResponse.json(
        { error: `账号已锁定，请${remainingMin}分钟后重试` },
        { status: 423 },
      );
    }

    // ─── Verify credentials via Supabase Auth ───
    const supabase = getSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailKey,
      password,
    });

    if (authError || !authData.user) {
      // ─── Record failed attempt ───
      const entry = lockoutStore.get(emailKey) || { count: 0, lockedUntil: 0 };
      entry.count += 1;

      if (entry.count >= MAX_FAILED_ATTEMPTS) {
        entry.lockedUntil = now + LOCKOUT_DURATION_MS;
        lockoutStore.set(emailKey, entry);
        return NextResponse.json(
          { error: '连续登录失败次数过多，账号已锁定15分钟' },
          { status: 423 },
        );
      }

      lockoutStore.set(emailKey, entry);

      const remaining = MAX_FAILED_ATTEMPTS - entry.count;
      return NextResponse.json(
        { error: `邮箱或密码不正确，还剩${remaining}次尝试机会` },
        { status: 401 },
      );
    }

    // ─── Login success: clear failed attempts ───
    lockoutStore.delete(emailKey);

    // Get user profile for role info
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, display_name, company_id, status')
      .eq('id', authData.user.id)
      .single();

    if (userProfile?.status === 'suspended') {
      return NextResponse.json({ error: '账号已被停用，请联系管理员' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userProfile?.role || 'staff',
        displayName: userProfile?.display_name,
        companyId: userProfile?.company_id,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '登录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
