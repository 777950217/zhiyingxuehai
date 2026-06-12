import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

/** GET /api/cost-alert-reviews?months=3
 * 获取当前公司的预警复盘历史
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '认证失败' }, { status: 401 });

    // 获取用户的 company_id
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.company_id) return NextResponse.json({ error: '无企业信息' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '3', 10);
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const { data: reviews, error } = await supabase
      .from('cost_alert_reviews')
      .select('*')
      .eq('company_id', userData.company_id)
      .gte('alert_date', since.toISOString().split('T')[0])
      .order('alert_date', { ascending: false });

    if (error) throw error;

    // 统计原因分类频次
    const categoryCount: Record<string, number> = {};
    for (const r of reviews || []) {
      categoryCount[r.reason_category] = (categoryCount[r.reason_category] || 0) + 1;
    }

    return NextResponse.json({ reviews: reviews || [], categoryCount });
  } catch (err) {
    console.error('获取预警复盘失败:', err);
    return NextResponse.json({ error: '获取预警复盘失败' }, { status: 500 });
  }
}

/** POST /api/cost-alert-reviews
 * 提交预警复盘记录
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '认证失败' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.company_id) return NextResponse.json({ error: '无企业信息' }, { status: 400 });
    if (!['ent_manager', 'ent_admin', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { alertDate, reasonCategory, reasonDesc, prevention } = body;

    if (!alertDate || !reasonCategory) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const validCategories = ['产品质量问题', '物流破损', '客服误判', '季节性波动', '促销活动', '其他'];
    if (!validCategories.includes(reasonCategory)) {
      return NextResponse.json({ error: '无效的原因分类' }, { status: 400 });
    }

    // 检查同一公司同一日期是否已有复盘
    const { data: existing } = await supabase
      .from('cost_alert_reviews')
      .select('id')
      .eq('company_id', userData.company_id)
      .eq('alert_date', alertDate)
      .maybeSingle();

    if (existing) {
      // 更新已有记录
      const { data, error } = await supabase
        .from('cost_alert_reviews')
        .update({
          reason_category: reasonCategory,
          reason_desc: reasonDesc || '',
          prevention: prevention || '',
          created_by: user.id,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ review: data });
    }

    // 新增记录
    const { data, error } = await supabase
      .from('cost_alert_reviews')
      .insert({
        company_id: userData.company_id,
        alert_date: alertDate,
        reason_category: reasonCategory,
        reason_desc: reasonDesc || '',
        prevention: prevention || '',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ review: data });
  } catch (err) {
    console.error('提交预警复盘失败:', err);
    return NextResponse.json({ error: '提交预警复盘失败' }, { status: 500 });
  }
}
