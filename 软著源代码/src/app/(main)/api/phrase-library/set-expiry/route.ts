import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';

// POST: 设置话术有效期
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth || !auth.userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { phrase_id, expires_at } = body;

    if (!phrase_id) {
      return NextResponse.json({ error: '缺少phrase_id' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // 计算freshness_status
    let freshnessStatus = 'normal';
    if (expires_at) {
      const expiryDate = new Date(expires_at);
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (expiryDate < now) {
        freshnessStatus = 'expired';
      } else if (expiryDate < thirtyDaysLater) {
        freshnessStatus = 'expiring';
      }
    }

    const { data, error } = await supabase
      .from('phrase_library')
      .update({
        expires_at: expires_at || null,
        freshness_status: expires_at ? freshnessStatus : 'normal',
        updated_at: new Date().toISOString(),
      })
      .eq('id', phrase_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `设置失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[set-expiry POST] Error:', message);
    return NextResponse.json({ error: `设置失败: ${message}` }, { status: 500 });
  }
}
