import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

// POST /api/template-usage — Record a template usage event (copy/import)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '用户无效' }, { status: 401 });

    const body = await request.json();
    const { template_id, action = 'copy' } = body;
    if (!template_id) return NextResponse.json({ error: '缺少template_id' }, { status: 400 });

    // Get company_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('template_usage')
      .insert({
        template_id,
        company_id: userProfile?.company_id,
        user_id: user.id,
        action,
      });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('template-usage POST error:', err);
    return NextResponse.json({ error: '记录失败' }, { status: 500 });
  }
}

// GET /api/template-usage — Get template usage statistics
// ?stats=all — get all template stats (aggregated)
// ?template_ids=id1,id2,id3 — get stats for specific templates
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: '用户无效' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const templateIds = searchParams.get('template_ids');
    const statsMode = searchParams.get('stats');

    if (statsMode === 'all' || templateIds) {
      let query = supabase.from('template_usage').select('template_id, company_id, user_id, action');
      if (templateIds) {
        query = query.in('template_id', templateIds.split(','));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate
      const agg: Record<string, { copyCount: number; importCount: number; companies: Set<string>; users: Set<string> }> = {};
      for (const row of data || []) {
        if (!agg[row.template_id]) {
          agg[row.template_id] = { copyCount: 0, importCount: 0, companies: new Set(), users: new Set() };
        }
        if (row.action === 'copy') agg[row.template_id].copyCount++;
        if (row.action === 'import') agg[row.template_id].importCount++;
        if (row.company_id) agg[row.template_id].companies.add(row.company_id);
        if (row.user_id) agg[row.template_id].users.add(row.user_id);
      }

      // Convert Sets to counts
      const result: Record<string, { copyCount: number; importCount: number; companyCount: number; userCount: number }> = {};
      for (const [id, a] of Object.entries(agg)) {
        result[id] = {
          copyCount: a.copyCount,
          importCount: a.importCount,
          companyCount: a.companies.size,
          userCount: a.users.size,
        };
      }

      return NextResponse.json({ stats: result });
    }

    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  } catch (err) {
    console.error('template-usage GET error:', err);
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
  }
}
