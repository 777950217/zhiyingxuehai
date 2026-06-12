import { NextRequest, NextResponse } from 'next/server';
import { validatePassword } from '@/lib/validate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '请填写当前密码和新密码' }, { status: 400 });
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    // Password change is handled client-side via Supabase auth.updateUser
    // This endpoint exists for server-side validation or future extensions
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '修改密码失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
