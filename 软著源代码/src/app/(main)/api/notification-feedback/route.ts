import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

/** GET /api/notification-feedback?notification_ids=id1,id2
 * 返回当前用户对这些通知的反馈状态
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '认证失败' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('notification_ids');
    if (!idsParam) return NextResponse.json({ myFeedback: {} });

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ myFeedback: {} });

    const { data: feedbacks, error } = await supabase
      .from('notification_feedback')
      .select('notification_id, helpful')
      .eq('user_id', user.id)
      .in('notification_id', ids);

    if (error) throw error;

    const myFeedback: Record<string, boolean> = {};
    for (const fb of feedbacks || []) {
      myFeedback[fb.notification_id] = fb.helpful;
    }

    return NextResponse.json({ myFeedback });
  } catch (err) {
    console.error('[notification-feedback GET]', err);
    return NextResponse.json({ error: '获取反馈失败' }, { status: 500 });
  }
}

/** POST /api/notification-feedback
 * 提交反馈，同一用户同一通知只能反馈一次（upsert）
 * body: { notification_id, helpful: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '认证失败' }, { status: 401 });

    const body = await request.json();
    const { notification_id, helpful } = body;

    if (!notification_id || typeof helpful !== 'boolean') {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const { error } = await supabase
      .from('notification_feedback')
      .upsert(
        { user_id: user.id, notification_id, helpful },
        { onConflict: 'user_id,notification_id' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[notification-feedback POST]', err);
    return NextResponse.json({ error: '提交反馈失败' }, { status: 500 });
  }
}
