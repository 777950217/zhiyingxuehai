import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function verifyPersonalUser(request: NextRequest) {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };

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

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('cda_credits')
      .select('total_credits, used_credits')
      .eq('user_id', auth.userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const total = data?.total_credits ?? 0;
    const used = data?.used_credits ?? 0;
    return NextResponse.json({ remaining: total - used, total, used });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { action } = body; // 'analyze' | 'purchase'

    const supabase = getSupabaseClient();

    // Handle credit purchase
    if (action === 'purchase') {
      const { package: pkg } = body;
      const creditsMap: Record<string, number> = { single: 1, five: 5, ten: 10 };
      const credits = creditsMap[pkg] || 0;
      if (credits === 0) return NextResponse.json({ error: '无效的套餐' }, { status: 400 });

      // Upsert credits
      const { data: existing } = await supabase
        .from('cda_credits')
        .select('total_credits, used_credits')
        .eq('user_id', auth.userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('cda_credits')
          .update({ total_credits: existing.total_credits + credits, updated_at: new Date().toISOString() })
          .eq('user_id', auth.userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cda_credits')
          .insert({ user_id: auth.userId, total_credits: credits, used_credits: 0 });
        if (error) throw error;
      }

      return NextResponse.json({ success: true, creditsAdded: credits });
    }

    // Handle CDA analysis
    if (action === 'analyze') {
      // Check credits
      const { data: creditData } = await supabase
        .from('cda_credits')
        .select('total_credits, used_credits')
        .eq('user_id', auth.userId)
        .single();

      const total = creditData?.total_credits ?? 0;
      const used = creditData?.used_credits ?? 0;
      let usedTrial = false;
      let trialUsedCount = 0;
      if (total - used <= 0) {
        // Check trial credits (1 free trial)
        const { data: tData } = await supabase
          .from('personal_feature_trials')
          .select('used_count')
          .eq('user_id', auth.userId)
          .eq('feature', 'cda')
          .single();
        trialUsedCount = tData?.used_count ?? 0;
        if (trialUsedCount >= 2) {
          return NextResponse.json({ error: '试用已结束，请购买CDA分析次数继续使用', creditsInsufficient: true, trialExhausted: true }, { status: 403 });
        }
        usedTrial = true;
      }

      // Check data sufficiency (at least 4 records)
      const { data: records } = await supabase
        .from('personal_data_records')
        .select('*')
        .eq('user_id', auth.userId)
        .order('record_date', { ascending: true });

      if (!records || records.length < 4) {
        return NextResponse.json({
          error: `数据不足，需要至少4条记录，当前仅${records?.length ?? 0}条`,
          dataInsufficient: true,
          currentCount: records?.length ?? 0,
        }, { status: 400 });
      }

      // Build data for AI analysis
      const dataText = records.map(r =>
        `${r.record_date}: 接待${r.visits} 响应${r.avg_response_time}s 咨询${r.consultations} 成交${r.orders} 差评${r.complaints} 转化率${r.conversion_rate}% 差评率${r.complaint_rate}% 环比${r.mom_change > 0 ? '+' : ''}${r.mom_change}%`
      ).join('\n');

      // Calculate control chart stats for context
      const visitsArr = records.map(r => r.visits);
      const avgVisits = visitsArr.reduce((a: number, b: number) => a + b, 0) / visitsArr.length;
      const stdVisits = Math.sqrt(visitsArr.reduce((s: number, v: number) => s + Math.pow(v - avgVisits, 2), 0) / visitsArr.length);
      const uclVisits = Math.round(avgVisits + 2 * stdVisits);
      const lclVisits = Math.round(Math.max(0, avgVisits - 2 * stdVisits));

      const systemPrompt = `你是"职盈学海"CDA数据分析专家，帮助客服主管做专业数据分析。

## 分析方法
1. 异常检测：用控制图法，均值±2σ作为上下控制线(UCL/LCL)，超出即为异常
   - 接待量参考：均值=${avgVisits.toFixed(1)}, UCL=${uclVisits}, LCL=${lclVisits}
2. 趋势预测：基于数据趋势做简单线性外推
3. 相关性分析：分析指标间关联（如响应时长↔转化率）
4. 归因分析：差评率变化的根因推断

## 输出格式（严格遵守）

# 🔍 CDA 专业数据分析

## 一、异常检测
（列出超出控制线的指标，标注⚠️）
- 每个异常项：指标名→实际值→控制线→偏差→💡这意味着什么→🗣️跟老板怎么说

## 二、趋势预测
（基于趋势预测下月各指标，标注📈或📉）
- 每个预测项：指标→当前值→预测值→趋势→💡这意味着什么→🗣️跟老板怎么说

## 三、相关性分析
（发现指标间的关联规律）
- 每个关联：指标A↔指标B→相关方向→💡这意味着什么→🗣️跟老板怎么说

## 四、归因分析
（差评率/转化率变化的根因）
- 每个归因：现象→数据佐证→根因→💡这意味着什么→🗣️跟老板怎么说

## 五、行动建议
（3条具体可执行的建议，附优先级🔴🟡🟢）

规则：
- 每个结论必须附💡人话解释（"这意味着什么"）
- 每个结论必须附🗣️跟老板怎么说（可直接复制的话术，30字以内）
- 数据必须基于真实数据，不要编造
- 分析要深入，不要停留在表面`;

      const config = new Config();
      const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
      const client = new LLMClient(config, customHeaders);

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `以下是我的工作数据：\n${dataText}` },
      ];

      let fullResponse = '';
      const llmStream = client.stream(messages, {
        model: 'doubao-seed-2-0-lite-260215',
        temperature: 0.7,
      });

      for await (const chunk of llmStream) {
        if (chunk.content) {
          fullResponse += chunk.content.toString();
        }
      }

      if (!fullResponse) {
        return NextResponse.json({ error: '分析生成失败，请重试' }, { status: 500 });
      }

      // Deduct credit or trial
      if (usedTrial) {
        // Increment trial usage
        const { data: existingTrial } = await supabase
          .from('personal_feature_trials')
          .select('used_count')
          .eq('user_id', auth.userId)
          .eq('feature', 'cda')
          .single();
        if (existingTrial) {
          await supabase
            .from('personal_feature_trials')
            .update({ used_count: (existingTrial.used_count ?? 0) + 1 })
            .eq('user_id', auth.userId)
            .eq('feature', 'cda');
        } else {
          await supabase
            .from('personal_feature_trials')
            .insert({ user_id: auth.userId, feature: 'cda', used_count: 1 });
        }
      } else {
        await supabase
          .from('cda_credits')
          .update({ used_credits: used + 1, updated_at: new Date().toISOString() })
          .eq('user_id', auth.userId);
      }

      // Save as report with has_cda=true
      const now = new Date();
      const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await supabase.from('personal_reports').insert({
        user_id: auth.userId,
        report_type: 'cda',
        period: periodStr,
        title: `CDA分析 ${periodStr}`,
        content: fullResponse,
        has_cda: true,
      });

      const finalTrialUsed = usedTrial ? trialUsedCount + 1 : trialUsedCount;
      const creditsRemaining = usedTrial ? (total - used) : (total - used - 1);

      return NextResponse.json({
        content: fullResponse,
        creditsRemaining,
        trialUsed: finalTrialUsed,
        trialRemaining: Math.max(0, 2 - finalTrialUsed),
        usedTrial,
      });
    }

    return NextResponse.json({ error: '无效的action参数' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '操作失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
