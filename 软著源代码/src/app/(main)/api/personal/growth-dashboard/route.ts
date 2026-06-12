import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function verifyPersonalUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };

  const supabase = getSupabaseClient();
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'personal_user') {
    return { error: NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 }) };
  }
  return { userId: user.id };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    const supabase = getSupabaseClient();

    // 1. Latest metrics from personal_data_records
    const { data: latestRecord } = await supabase
      .from('personal_data_records')
      .select('*')
      .eq('user_id', userId)
      .order('record_date', { ascending: false })
      .limit(1)
      .single();

    // Previous record for comparison
    const { data: prevRecord } = await supabase
      .from('personal_data_records')
      .select('conversion_rate, complaint_rate')
      .eq('user_id', userId)
      .order('record_date', { ascending: false })
      .range(1, 1)
      .single();

    // 2. Service score from chat_check_results (last 10)
    const { data: chatResults } = await supabase
      .from('chat_check_results')
      .select('total_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const avgServiceScore = chatResults && chatResults.length > 0
      ? Math.round(chatResults.reduce((sum: number, r: { total_score: number }) => sum + (r.total_score || 0), 0) / chatResults.length)
      : null;

    // 3. Target achievement
    let targetAchievement: number | null = null;
    if (latestRecord?.target_visits || latestRecord?.target_conversion_rate) {
      const rates: number[] = [];
      if (latestRecord.target_visits && latestRecord.visits) {
        rates.push((latestRecord.visits / latestRecord.target_visits) * 100);
      }
      if (latestRecord.target_consultations && latestRecord.consultations) {
        rates.push((latestRecord.consultations / latestRecord.target_consultations) * 100);
      }
      if (latestRecord.target_orders && latestRecord.orders) {
        rates.push((latestRecord.orders / latestRecord.target_orders) * 100);
      }
      if (latestRecord.target_conversion_rate && latestRecord.conversion_rate) {
        rates.push((latestRecord.conversion_rate / latestRecord.target_conversion_rate) * 100);
      }
      if (rates.length > 0) {
        targetAchievement = Math.round(rates.reduce((a: number, b: number) => a + b, 0) / rates.length);
      }
    }

    // 4. Weekly trend (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const { data: weeklyRecords } = await supabase
      .from('personal_data_records')
      .select('record_date, conversion_rate, complaint_rate, visits, orders, consultations')
      .eq('user_id', userId)
      .gte('record_date', fourWeeksAgo.toISOString().split('T')[0])
      .order('record_date', { ascending: true });

    // Group by week
    const weeklyTrend: { week: string; conversion_rate: number; complaint_rate: number; service_score: number | null }[] = [];
    if (weeklyRecords && weeklyRecords.length > 0) {
      const weekMap = new Map<string, { conv: number[]; comp: number[] }>();
      for (const r of weeklyRecords) {
        const d = new Date(r.record_date);
        const weekNum = Math.ceil((d.getDate()) / 7);
        const weekKey = `W${weekNum}`;
        if (!weekMap.has(weekKey)) weekMap.set(weekKey, { conv: [], comp: [] });
        const entry = weekMap.get(weekKey)!;
        if (r.conversion_rate != null) entry.conv.push(r.conversion_rate);
        if (r.complaint_rate != null) entry.comp.push(r.complaint_rate);
      }
      let weekIdx = 1;
      for (const [weekKey, vals] of weekMap) {
        weeklyTrend.push({
          week: `W${weekIdx}`,
          conversion_rate: vals.conv.length > 0 ? Math.round(vals.conv.reduce((a: number, b: number) => a + b, 0) / vals.conv.length * 10) / 10 : 0,
          complaint_rate: vals.comp.length > 0 ? Math.round(vals.comp.reduce((a: number, b: number) => a + b, 0) / vals.comp.length * 10) / 10 : 0,
          service_score: null,
        });
        weekIdx++;
      }
    }
    // Add service scores to weekly trend from chat results
    if (chatResults && chatResults.length > 0 && weeklyTrend.length > 0) {
      const avgScore = Math.round(chatResults.reduce((sum: number, r: { total_score: number }) => sum + (r.total_score || 0), 0) / chatResults.length);
      for (const w of weeklyTrend) {
        w.service_score = avgScore;
      }
    }

    // 5. First record for progress comparison
    const { data: firstRecord } = await supabase
      .from('personal_data_records')
      .select('conversion_rate, complaint_rate, visits')
      .eq('user_id', userId)
      .order('record_date', { ascending: true })
      .limit(1)
      .single();

    // 6. Recent reports
    const { data: reports } = await supabase
      .from('personal_reports')
      .select('id, report_type, period, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 7. Learning progress
    const { count: practiceCount } = await supabase
      .from('chat_check_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Note count - check if knowledge_notes table exists, fallback to 0
    let noteCount = 0;
    try {
      const { count: nc } = await supabase
        .from('custom_knowledge')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      noteCount = nc || 0;
    } catch {
      noteCount = 0;
    }

    // 8. AI-generated content (with 24h cache)
    // Check cache in personal_reports with type='growth_cache'
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedSummary } = await supabase
      .from('personal_reports')
      .select('content, created_at')
      .eq('user_id', userId)
      .eq('report_type', 'growth_cache')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let bossSummary = '';
    let topIssues: { title: string; description: string; suggestion: string }[] = [];

    if (cachedSummary?.content) {
      try {
        const parsed = JSON.parse(cachedSummary.content);
        bossSummary = parsed.bossSummary || '';
        topIssues = parsed.topIssues || [];
      } catch {
        bossSummary = cachedSummary.content;
      }
    } else if (latestRecord || (chatResults && chatResults.length > 0)) {
      // Generate AI content
      try {
        const config = new Config();
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        const client = new LLMClient(config, customHeaders);

        const dataContext = `当前转化率: ${latestRecord?.conversion_rate ?? '无'}%, 差评率: ${latestRecord?.complaint_rate ?? '无'}%, 服务评分: ${avgServiceScore ?? '无'}, 目标达成率: ${targetAchievement ?? '无'}%, 接待量: ${latestRecord?.visits ?? '无'}, 首次转化率: ${firstRecord?.conversion_rate ?? '无'}%, 首次差评率: ${firstRecord?.complaint_rate ?? '无'}%`;

        // Boss summary
        const summaryMessages = [{
          role: 'user' as const,
          content: `你是客服管理数据分析师。基于以下数据，用一句大白话总结这个客服主管的整体表现，格式参考："本月整体表现良好，差评率下降10%，继续保持；响应速度还有提升空间"。数据：${dataContext}。只输出一句话总结，不要多余内容。`,
        }];
        let summaryText = '';
        const summaryStream = client.stream(summaryMessages, { model: 'doubao-seed-2-0-lite-260215', temperature: 0.7 });
        for await (const chunk of summaryStream) {
          summaryText += chunk.content || '';
        }
        bossSummary = summaryText.trim();

        // Top 3 issues
        const issuesMessages = [{
          role: 'user' as const,
          content: `你是客服管理诊断专家。基于以下数据，找出TOP3最需要改进的问题。每个问题格式：标题(10字内)|简短说明(20字内)|具体改进建议(30字内)。数据：${dataContext}。用换行分隔3个问题，每个问题用|分隔三部分。只输出3行内容。`,
        }];
        let issuesText = '';
        const issuesStream = client.stream(issuesMessages, { model: 'doubao-seed-2-0-lite-260215', temperature: 0.7 });
        for await (const chunk of issuesStream) {
          issuesText += chunk.content || '';
        }
        topIssues = issuesText.trim().split('\n').filter(Boolean).map((line: string) => {
          const parts = line.split('|');
          return {
            title: parts[0]?.trim() || '待改进项',
            description: parts[1]?.trim() || '',
            suggestion: parts[2]?.trim() || '',
          };
        });

        // Cache the results
        if (bossSummary || topIssues.length > 0) {
          await supabase.from('personal_reports').insert({
            user_id: userId,
            report_type: 'growth_cache',
            period: new Date().toISOString().split('T')[0],
            title: '成果看板AI缓存',
            content: JSON.stringify({ bossSummary, topIssues }),
          });
        }
      } catch (e) {
        console.error('Growth dashboard AI error:', e);
      }
    }

    return NextResponse.json({
      latestMetrics: latestRecord ? {
        conversion_rate: latestRecord.conversion_rate,
        complaint_rate: latestRecord.complaint_rate,
        visits: latestRecord.visits,
        orders: latestRecord.orders,
        consultations: latestRecord.consultations,
        mom_change: latestRecord.mom_change,
        prev_conversion_rate: prevRecord?.conversion_rate ?? null,
        prev_complaint_rate: prevRecord?.complaint_rate ?? null,
      } : null,
      targetAchievement,
      serviceScore: avgServiceScore,
      chatCheckCount: chatResults?.length ?? 0,
      weeklyTrend,
      firstRecord: firstRecord ? {
        conversion_rate: firstRecord.conversion_rate,
        complaint_rate: firstRecord.complaint_rate,
      } : null,
      reports: reports || [],
      topIssues,
      bossSummary,
      learningProgress: {
        practiceCount: practiceCount || 0,
        noteCount: noteCount || 0,
      },
    });
  } catch (error) {
    console.error('Growth dashboard error:', error);
    return NextResponse.json({ error: '获取成果看板数据失败' }, { status: 500 });
  }
}
