import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 关键词配置+告警记录
// POST: 添加/更新关键词配置, 提交告警记录
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    // 获取关键词配置
    const { data: customConfigs } = await supabase
      .from('keyword_alert_configs')
      .select('*')
      .eq('company_id', companyId);

    const { data: presetConfigs } = await supabase
      .from('keyword_alert_configs')
      .select('*')
      .eq('company_id', 'preset');

    const configs = [...(presetConfigs || []), ...(customConfigs || [])];

    // 获取告警记录
    const { data: records } = await supabase
      .from('keyword_alert_records')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50);

    // 统计
    const stats = {
      total: records?.length || 0,
      unresolved: records?.filter((r: { is_resolved: boolean }) => !r.is_resolved).length || 0,
      warning: records?.filter((r: { alert_level: string }) => r.alert_level === 'warning').length || 0,
      serious: records?.filter((r: { alert_level: string }) => r.alert_level === 'serious').length || 0,
      critical: records?.filter((r: { alert_level: string }) => r.alert_level === 'critical').length || 0,
    };

    return NextResponse.json({
      data: {
        configs: configs.map((c: { id: string; keyword: string; category: string; alert_level: string; is_active: boolean; company_id: string }) => ({
          id: c.id,
          keyword: c.keyword,
          category: c.category,
          alertLevel: c.alert_level,
          isActive: c.is_active,
          isPreset: c.company_id === 'preset',
        })),
        records: (records || []).map((r: { id: string; keyword: string; matched_text: string | null; agent_id: string | null; agent_name: string | null; alert_level: string; is_resolved: boolean; created_at: string }) => ({
          id: r.id,
          keyword: r.keyword,
          matchedText: r.matched_text,
          agentId: r.agent_id,
          agentName: r.agent_name,
          alertLevel: r.alert_level,
          isResolved: r.is_resolved,
          createdAt: r.created_at,
        })),
        stats,
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { action, company_id } = body;

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    if (action === 'add_keyword') {
      const { data, error } = await supabase
        .from('keyword_alert_configs')
        .insert({
          company_id,
          keyword: body.keyword,
          category: body.category || '敏感词',
          alert_level: body.alert_level || 'warning',
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: '关键词添加失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'update_keyword') {
      const { data, error } = await supabase
        .from('keyword_alert_configs')
        .update({ is_active: body.is_active, alert_level: body.alert_level })
        .eq('id', body.config_id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: '关键词更新失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'report_alert') {
      const { data, error } = await supabase
        .from('keyword_alert_records')
        .insert({
          company_id,
          config_id: body.config_id || null,
          keyword: body.keyword,
          matched_text: body.matched_text || '',
          agent_id: body.agent_id || null,
          agent_name: body.agent_name || '',
          alert_level: body.alert_level || 'warning',
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: '告警记录失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'resolve_alert') {
      const { data, error } = await supabase
        .from('keyword_alert_records')
        .update({ is_resolved: true })
        .eq('id', body.record_id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: '标记已处理失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
