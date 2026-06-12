import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Training Progress
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const companyId = searchParams.get('company_id');
    const type = searchParams.get('type'); // 'progress' | 'exam' | 'onboarding'

    if (type === 'exam') {
      let query = supabase.from('exam_records').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'onboarding') {
      let query = supabase.from('onboarding_records').select('*').order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Default: training_progress
    let query = supabase.from('training_progress').select('*');
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /training-data error:', err);
    return NextResponse.json({ error: '获取培训数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const type = body.type; // 'progress' | 'exam' | 'onboarding'

    if (type === 'exam') {
      const { data, error } = await supabase
        .from('exam_records')
        .insert({
          user_id: body.user_id,
          score: body.score,
          answers: JSON.stringify(body.answers || []),
          passed: body.passed,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'onboarding') {
      // 先检查是否已有记录（upsert逻辑）
      const { data: existing } = await supabase
        .from('onboarding_records')
        .select('id')
        .eq('user_id', body.user_id)
        .eq('company_id', body.company_id)
        .maybeSingle();

      if (existing) {
        // 更新已有记录
        const updates: Record<string, string> = { updated_at: new Date().toISOString() };
        if (body.step1_status) updates.step1_status = body.step1_status;
        if (body.step2_status) updates.step2_status = body.step2_status;
        if (body.step3_status) updates.step3_status = body.step3_status;
        if (body.step4_status) updates.step4_status = body.step4_status;
        const { data, error } = await supabase
          .from('onboarding_records')
          .update(updates)
          .eq('id', (existing as { id: string }).id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ data });
      }

      // 新建入职档案
      const { data, error } = await supabase
        .from('onboarding_records')
        .insert({
          company_id: body.company_id,
          user_id: body.user_id,
          agent_id: body.agent_id,
          step1_status: body.step1_status || '待分配',
          step2_status: body.step2_status || '未开始',
          step3_status: body.step3_status || '未开始',
          step4_status: body.step4_status || '未开始',
        })
        .select()
        .single();
      if (error) throw error;

      // 自动创建agents记录（如果该用户还没有agent记录）
      if (body.user_id && body.company_id) {
        const { data: existingAgent } = await supabase
          .from('agents')
          .select('id')
          .eq('company_id', body.company_id)
          .eq('name', body.agent_name || body.user_name || '')
          .maybeSingle();

        if (!existingAgent) {
          await supabase.from('agents').insert({
            company_id: body.company_id,
            name: body.agent_name || body.user_name || '新员工',
            position: '售中客服',
            training_stage: '基础',
            status: '在职',
          });
        }
      }

      return NextResponse.json({ data });
    }

    // training_progress - upsert
    const { data, error } = await supabase
      .from('training_progress')
      .upsert({
        user_id: body.user_id,
        module_id: body.module_id,
        current_step: body.current_step,
        completed: body.completed || false,
        completed_at: body.completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,module_id' })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /training-data error:', err);
    return NextResponse.json({ error: '保存培训数据失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const type = body.type;

    if (type === 'onboarding') {
      const { id, ...updates } = body;
      const { data, error } = await supabase
        .from('onboarding_records')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // training_progress
    const { id, ...updates } = body;
    const { data, error } = await supabase
      .from('training_progress')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] PUT /training-data error:', err);
    return NextResponse.json({ error: '更新培训数据失败' }, { status: 500 });
  }
}
