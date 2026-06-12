import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: '请输入邮箱地址' }, { status: 400 });
    }

    // Password reset is handled client-side via Supabase auth.resetPasswordForEmail
    // This endpoint exists for server-side validation or future extensions
    return NextResponse.json({ success: true, message: '如果该邮箱已注册，重置链接已发送' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '操作失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
