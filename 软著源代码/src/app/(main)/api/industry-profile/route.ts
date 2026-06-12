import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/** GET /api/industry-profile?user_id=xxx */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_industry_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

/** POST /api/industry-profile  — 保存用户输入 + 异步生成AI档案 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, industry, mainProduct, material, teamSize } = body as {
    userId: string;
    industry: string;
    mainProduct: string;
    material?: string;
    teamSize: string;
  };

  if (!userId || !industry || !mainProduct || !teamSize) {
    return NextResponse.json({ error: '缺少必填参数' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // 1. 先保存用户输入（profile_data暂空）
  const { data: profile, error: insertError } = await supabase
    .from('user_industry_profiles')
    .insert({
      user_id: userId,
      industry,
      main_product: mainProduct,
      material: material || null,
      team_size: teamSize,
      profile_data: null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2. 更新users表：标记已完成 + 冗余industry字段
  await supabase
    .from('users')
    .update({
      industry_profile_completed: true,
      industry,
    })
    .eq('id', userId);

  // 3. 异步调用AI生成档案（不阻塞响应）
  generateIndustryProfile(profile.id, userId, industry, mainProduct, material || '', teamSize, request.headers).catch(() => {});

  return NextResponse.json({ data: profile, message: '行业档案创建成功，AI正在生成专属内容...' });
}

/** PATCH /api/industry-profile — 更新行业档案 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, industry, mainProduct, material, teamSize } = body as {
    userId: string;
    industry?: string;
    mainProduct?: string;
    material?: string;
    teamSize?: string;
  };

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // 查找现有档案
  const { data: existing } = await supabase
    .from('user_industry_profiles')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: '行业档案不存在' }, { status: 404 });
  }

  const updates: Record<string, string> = {};
  if (industry !== undefined) updates.industry = industry;
  if (mainProduct !== undefined) updates.main_product = mainProduct;
  if (material !== undefined) updates.material = material;
  if (teamSize !== undefined) updates.team_size = teamSize;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('user_industry_profiles')
      .update(updates)
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 如果行业变了，更新users表冗余字段
    if (industry !== undefined) {
      await supabase
        .from('users')
        .update({ industry })
        .eq('id', userId);
    }

    // 重新生成AI档案
    const finalIndustry = industry ?? (await supabase.from('user_industry_profiles').select('industry').eq('id', existing.id).single()).data?.industry ?? '';
    const finalProduct = mainProduct ?? (await supabase.from('user_industry_profiles').select('main_product').eq('id', existing.id).single()).data?.main_product ?? '';
    const finalMaterial = material ?? (await supabase.from('user_industry_profiles').select('material').eq('id', existing.id).single()).data?.material ?? '';
    const finalTeamSize = teamSize ?? (await supabase.from('user_industry_profiles').select('team_size').eq('id', existing.id).single()).data?.team_size ?? '';

    generateIndustryProfile(existing.id, userId, finalIndustry, finalProduct, finalMaterial, finalTeamSize, request.headers).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

/** 异步调用AI生成行业档案内容 */
async function generateIndustryProfile(
  profileId: string,
  userId: string,
  industry: string,
  mainProduct: string,
  material: string,
  teamSize: string,
  headers: Headers
) {
  const systemPrompt = `你是一位电商行业分析专家。请根据用户提供的行业信息，生成一份结构化的行业档案。

要求：
1. 严格按照JSON格式输出，不要输出任何其他文字
2. 每个字段给出具体、可操作的内容，不要泛泛而谈
3. 内容要贴合{行业}+{主营产品}+{产品材质}的实际场景
4. 考虑团队人数的影响

输出JSON格式如下：
{
  "complaint_types": ["客诉类型1", "客诉类型2", ...],  // 5-8条，行业常见客诉类型
  "after_sales_scenarios": ["售后场景1", "售后场景2", ...],  // 3-5个，典型售后场景
  "cost_pain_points": ["成本痛点1", "成本痛点2", ...],  // 3-5个，关键成本痛点
  "script_directions": ["话术方向1", "话术方向2", ...],  // 3-5个，常用话术方向
  "management_challenges": ["管理挑战1", "管理挑战2", ...]  // 3-5个，管理挑战
}`;

  const materialInfo = material ? `\n产品材质：${material}` : '';
  const userMessage = `行业：${industry}
主营产品：${mainProduct}${materialInfo}
客服团队人数：${teamSize}

请生成该行业的专属档案。`;

  try {
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(headers);
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
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

    // 尝试解析JSON（AI可能包含markdown代码块）
    let profileData: Record<string, string[]>;
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      profileData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: [fullResponse] };
    } catch {
      profileData = { raw: [fullResponse] };
    }

    // 更新profile_data到数据库
    const supabase = getSupabaseClient();
    await supabase
      .from('user_industry_profiles')
      .update({
        profile_data: profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);
  } catch (err) {
    console.error('[industry-profile] AI generation failed:', err);
  }
}
