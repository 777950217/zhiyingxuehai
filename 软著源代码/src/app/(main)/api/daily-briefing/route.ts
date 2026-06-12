import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('company_id');
  if (!companyId) return NextResponse.json({ error: '缺少company_id' }, { status: 400 });

  const supabase = await getSupabaseClient();
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(today); dayBefore.setDate(dayBefore.getDate() - 2);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // 1. 昨日赔付
  const { data: ydLoss } = await supabase
    .from('cost_records')
    .select('amount')
    .eq('company_id', companyId)
    .gte('created_at', fmt(yesterday))
    .lt('created_at', fmt(today));
  const yesterdayLoss = (ydLoss || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);

  // 前日赔付
  const { data: dbLoss } = await supabase
    .from('cost_records')
    .select('amount')
    .eq('company_id', companyId)
    .gte('created_at', fmt(dayBefore))
    .lt('created_at', fmt(yesterday));
  const dayBeforeLoss = (dbLoss || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);

  const lossChange = dayBeforeLoss > 0
    ? Math.round(((yesterdayLoss - dayBeforeLoss) / dayBeforeLoss) * 100)
    : yesterdayLoss > 0 ? 100 : 0;

  // 2. 异常赔付待审批
  const { count: pendingApproval } = await supabase
    .from('approval_flows')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending');

  // 3. 本月AI替代时长
  const { data: companyData } = await supabase
    .from('companies')
    .select('ai_credits_remaining')
    .eq('id', companyId)
    .maybeSingle();

  // 从ai_usage或kpi_records估算AI使用（简化：用kpi_records中的数据）
  const { data: monthRecords } = await supabase
    .from('kpi_records')
    .select('ai_usage_count')
    .eq('company_id', companyId)
    .gte('created_at', fmt(monthStart));

  const aiUsageCount = (monthRecords || []).reduce((s: number, r: { ai_usage_count: number }) => s + (r.ai_usage_count || 0), 0);
  const aiSavingMinutes = aiUsageCount * 3; // 每次AI使用替代3分钟
  const aiSavingHours = Math.round(aiSavingMinutes / 60 * 10) / 10;
  const hourlyRate = 25;
  const totalSaved = aiSavingHours * hourlyRate;

  // 推送时间
  const pushTime = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 09:00`;

  return NextResponse.json({
    data: {
      yesterdayLoss,
      lossChange,
      pendingApproval: pendingApproval || 0,
      aiSavingHours,
      totalSaved,
      pushTime,
    },
  });
}
