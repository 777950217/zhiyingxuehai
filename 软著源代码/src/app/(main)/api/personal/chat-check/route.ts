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

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('chat_check_results')
      .select('id, response_score, script_score, attitude_score, solution_score, total_score, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if (auth.error) return auth.error;

    const supabase = getSupabaseClient();

    // --- 试用次数检查 ---
    const { data: existingChecks } = await supabase
      .from('chat_check_results')
      .select('id')
      .eq('user_id', auth.userId!);
    const checkCount = existingChecks?.length ?? 0;
    const trialUsed = checkCount;
    const trialRemaining = Math.max(0, 5 - checkCount);
    // 试用5次后暂不硬限制（后续接入订阅后统一管控）

    const body = await request.json();
    const { chat_content } = body;
    if (!chat_content || chat_content.trim().length === 0) {
      return NextResponse.json({ error: '请粘贴聊天记录' }, { status: 400 });
    }

    const systemPrompt = `你是"职盈学海"对话质量检测专家，帮助客服主管自检聊天记录。

## 评分维度（每项0-25分，总分100）

### 1. 响应速度（0-25分）
- 25分：秒回，无等待
- 20分：1分钟内回复
- 15分：1-3分钟
- 10分：3-5分钟
- 5分：5分钟以上
- 0分：超10分钟或未回复

### 2. 话术规范（0-25分）
- 是否使用了标准称呼
- 是否用专业术语而非口语
- 是否有违规承诺或不当言论

### 3. 服务态度（0-25分）
- 是否主动热情
- 是否耐心解答
- 是否有情绪化表达

### 4. 问题解决（0-25分）
- 是否准确定位问题
- 是否给出有效方案
- 是否确认客户满意

## 输出格式（严格遵守）

# 🔍 对话自检报告

## 评分
| 维度 | 得分 | 满分 |
|------|------|------|
| 响应速度 | {分} | 25 |
| 话术规范 | {分} | 25 |
| 服务态度 | {分} | 25 |
| 问题解决 | {分} | 25 |
| **总分** | **{总分}** | **100** |

## 扣分详情
（每项格式）
❌[{维度}]扣{X}分 → 问题："{原文}" → 标准做法："{正确话术}" → 记住：{一句话总结}

## 改进建议
（3-5条具体建议，附💡说明为什么要这样做）

如果总分<80，额外输出"⚠️ 改进重点"板块：你最近主要因为{主要扣分维度}被扣分，建议重点练习{具体建议}

规则：
- 扣分必须引用原文，不能凭空编造
- 标准做法要给出可直接使用的话术
- 记住那一句话要让客服下次遇到类似情况能快速想起`;

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `请检测以下聊天记录：\n\n${chat_content}` },
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
      return NextResponse.json({ error: '自检失败，请重试' }, { status: 500 });
    }

    // Extract scores from response (look for the score pattern)
    const scoreRegex = /\| 响应速度 \| (\d+) \|[\s\S]*?\| 话术规范 \| (\d+) \|[\s\S]*?\| 服务态度 \| (\d+) \|[\s\S]*?\| 问题解决 \| (\d+) \|[\s\S]*?\| \*\*总分\*\* \| \*\*(\d+)\*\*/;
    const match = fullResponse.match(scoreRegex);
    const response_score = match ? parseInt(match[1]) : 0;
    const script_score = match ? parseInt(match[2]) : 0;
    const attitude_score = match ? parseInt(match[3]) : 0;
    const solution_score = match ? parseInt(match[4]) : 0;
    const total_score = match ? parseInt(match[5]) : 0;

    // Split response into issues and suggestions
    const issuesSection = fullResponse.match(/## 扣分详情\n([\s\S]*?)(?=\n## )/)?.[1] || '';
    const suggestionsSection = fullResponse.match(/## 改进建议\n([\s\S]*?)(?=\n## |$)/)?.[1] || '';

    const { data, error } = await supabase
      .from('chat_check_results')
      .insert({
        user_id: auth.userId,
        chat_content,
        response_score,
        script_score,
        attitude_score,
        solution_score,
        total_score,
        issues: issuesSection.trim(),
        suggestions: suggestionsSection.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      data: {
        ...data,
        fullReport: fullResponse,
        trialUsed: trialUsed + 1,
        trialRemaining: Math.max(0, 5 - (trialUsed + 1)),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '自检失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
