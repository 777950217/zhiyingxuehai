import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

/** GET /api/item-feedback?moduleKey=xxx
 * 返回该模块所有条目的反馈统计 + 当前用户的反馈状态
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '认证失败' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const moduleKey = searchParams.get('moduleKey');
    if (!moduleKey) return NextResponse.json({ error: '缺少 moduleKey' }, { status: 400 });

    // 查询该模块所有反馈
    const { data: feedbacks, error } = await supabase
      .from('item_feedback')
      .select('user_id, module_key, section_index, item_index, feedback_type')
      .eq('module_key', moduleKey);

    if (error) throw error;

    // 统计每个条目的 helpful/unhelpful 计数
    const stats: Record<string, { helpful: number; unhelpful: number }> = {};
    for (const fb of feedbacks || []) {
      const key = `${fb.section_index}-${fb.item_index}`;
      if (!stats[key]) stats[key] = { helpful: 0, unhelpful: 0 };
      if (fb.feedback_type === 'helpful') stats[key].helpful++;
      else stats[key].unhelpful++;
    }

    // 当前用户的反馈状态
    const myFeedback: Record<string, string> = {};
    for (const fb of (feedbacks || []).filter(f => f.user_id === user.id)) {
      myFeedback[`${fb.section_index}-${fb.item_index}`] = fb.feedback_type;
    }

    return NextResponse.json({ stats, myFeedback });
  } catch (err) {
    console.error('[item-feedback GET]', err);
    return NextResponse.json({ error: '获取反馈失败' }, { status: 500 });
  }
}

/** POST /api/item-feedback
 * 提交反馈，同一用户同一条目只能反馈一次（upsert）
 * body: { moduleKey, sectionIndex, itemIndex, feedbackType: 'helpful'|'unhelpful' }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '认证失败' }, { status: 401 });

    const body = await request.json();
    const { moduleKey, sectionIndex, itemIndex, feedbackType } = body;

    if (!moduleKey || sectionIndex === undefined || itemIndex === undefined || !feedbackType) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }
    if (!['helpful', 'unhelpful'].includes(feedbackType)) {
      return NextResponse.json({ error: 'feedbackType 必须为 helpful 或 unhelpful' }, { status: 400 });
    }

    // 获取用户 company_id
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const companyId = userData?.company_id || '';

    // upsert：同一用户同一条目只保留最新反馈
    const { error } = await supabase
      .from('item_feedback')
      .upsert(
        {
          user_id: user.id,
          company_id: companyId,
          module_key: moduleKey,
          section_index: sectionIndex,
          item_index: itemIndex,
          feedback_type: feedbackType,
        },
        { onConflict: 'user_id,module_key,section_index,item_index' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[item-feedback POST]', err);
    return NextResponse.json({ error: '提交反馈失败' }, { status: 500 });
  }
}
