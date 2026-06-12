import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const role = searchParams.get('role'); // enterprise_manager or enterprise_admin
    const since = searchParams.get('since'); // ISO timestamp of last login

    if (!user_id) {
      return NextResponse.json({ error: 'user_id必填' }, { status: 400 });
    }

    const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 3600 * 1000);

    // Get unread rule updates
    const { data: ruleUpdates } = await supabase
      .from('rule_updates')
      .select('id, platform, title, summary, action_advice, created_at')
      .eq('is_active', true)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    // Get user's read logs for rule_updates
    const { data: readLogs } = await supabase
      .from('user_read_log')
      .select('item_id')
      .eq('user_id', user_id)
      .eq('item_type', 'rule_update');

    const readIds = new Set((readLogs ?? []).map((r: { item_id: string }) => r.item_id));
    const unreadRules = (ruleUpdates ?? []).filter((r: { id: string }) => !readIds.has(r.id));

    const result: {
      hasNew: boolean;
      ruleUpdates: Array<{
        id: string;
        platform: string;
        title: string;
        summary: string | null;
        action_advice: string | null;
        created_at: string;
      }>;
      industryTrends: Array<{
        id: string;
        category: string;
        trend: string;
        title: string;
        key_data: string | null;
        advice: string | null;
        advice_detail: string | null;
        created_at: string;
      }>;
    } = {
      hasNew: false,
      ruleUpdates: unreadRules,
      industryTrends: [],
    };

    // Only ent_admin sees industry trends
    if (role === 'enterprise_admin') {
      const { data: trends } = await supabase
        .from('industry_trends')
        .select('id, category, trend, title, key_data, advice, advice_detail, created_at')
        .eq('is_active', true)
        .gte('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: trendReadLogs } = await supabase
        .from('user_read_log')
        .select('item_id')
        .eq('user_id', user_id)
        .eq('item_type', 'industry_trend');

      const trendReadIds = new Set((trendReadLogs ?? []).map((r: { item_id: string }) => r.item_id));
      result.industryTrends = (trends ?? []).filter((t: { id: string }) => !trendReadIds.has(t.id));
    }

    result.hasNew = result.ruleUpdates.length > 0 || result.industryTrends.length > 0;

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
