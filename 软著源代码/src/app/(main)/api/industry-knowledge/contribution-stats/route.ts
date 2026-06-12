import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest } from '@/lib/api-auth';

// GET: 获取当前用户的贡献统计
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const supabase = await getSupabaseClient();

    // 贡献条目数
    const { count: contributedCount } = await supabase
      .from('industry_knowledge')
      .select('*', { count: 'exact', head: true })
      .eq('source_user_id', auth.userId!)
      .eq('status', 'approved');

    // 被采纳总次数（usage_count求和）
    const { data: myItems } = await supabase
      .from('industry_knowledge')
      .select('usage_count, like_count')
      .eq('source_user_id', auth.userId!)
      .eq('status', 'approved');

    const totalAdopted = (myItems || []).reduce((s: number, r: { usage_count: number }) => s + (r.usage_count || 0), 0);
    const totalLiked = (myItems || []).reduce((s: number, r: { like_count: number }) => s + (r.like_count || 0), 0);

    // 贡献等级
    const score = (contributedCount || 0) * 3 + totalAdopted * 2 + totalLiked;
    let level = '青铜';
    let levelColor = 'text-amber-600';
    if (score >= 50) { level = '钻石'; levelColor = 'text-blue-500'; }
    else if (score >= 30) { level = '黄金'; levelColor = 'text-yellow-500'; }
    else if (score >= 15) { level = '白银'; levelColor = 'text-gray-400'; }

    return NextResponse.json({
      contributed_count: contributedCount || 0,
      adopted_count: totalAdopted,
      liked_count: totalLiked,
      score,
      level,
      level_color: levelColor,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contribution-stats GET] Error:', message);
    return NextResponse.json({ error: `获取统计失败: ${message}` }, { status: 500 });
  }
}
