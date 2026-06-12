import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST: 保存/更新基线数据
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { company_id, compRate, refundRate, responseTime, satisfaction, systemFee } = body;

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cost_baselines')
      .upsert({
        company_id,
        baseline_compensation_rate: compRate || null,
        baseline_refund_rate: refundRate || null,
        baseline_response_time: responseTime || null,
        baseline_satisfaction: satisfaction || null,
        system_fee: systemFee || 299,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })
      .select()
      .single();

    if (error) {
      console.error('[cost-baseline POST] Error:', JSON.stringify(error));
      return NextResponse.json({ error: '基线数据保存失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
