import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logAction, AuditAction, ResourceType } from '@/lib/audit-log';

const VALID_TYPES = ['script', 'sop', 'case', 'quality', 'plan', 'speech'] as const;
type CheckupType = typeof VALID_TYPES[number];

const TYPE_CATEGORY_MAP: Record<CheckupType, string> = {
  script: '话术体检',
  sop: 'SOP体检',
  case: '案例体检',
  quality: '质检体检',
  plan: '方案体检',
  speech: '话术体检',
};

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, data } = body as { type: string; data: Record<string, unknown> };

    if (!type || !VALID_TYPES.includes(type as CheckupType)) {
      return NextResponse.json(
        { error: `无效的体检类型，可选: ${VALID_TYPES.join('/')}` },
        { status: 400 }
      );
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: '缺少体检数据' }, { status: 400 });
    }

    const checkupType = type as CheckupType;
    const supabase = getSupabaseClient();

    // 1. 保存到 ai_checkup_submissions
    const { data: submission, error: subErr } = await supabase
      .from('ai_checkup_submissions')
      .insert({
        user_id: auth.userId,
        company_id: auth.companyId || null,
        checkup_type: checkupType,
        submission_data: data,
        result_data: data.results || {},
      })
      .select('id')
      .single();

    if (subErr) {
      console.error('[health-check/submit] insert submission error:', subErr.message);
      return NextResponse.json({ error: '保存体检数据失败' }, { status: 500 });
    }

    // 2. 同时保存到 phrase_library（兼容现有知识库体系）
    const category = TYPE_CATEGORY_MAP[checkupType];
    const title = data.title || `${category}结果-${new Date().toLocaleDateString('zh-CN')}`;
    const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.results || data, null, 2);

    const { data: phrase, error: phraseErr } = await supabase
      .from('phrase_library')
      .insert({
        user_id: auth.userId,
        company_id: auth.companyId || null,
        category,
        title,
        content,
        tags: [checkupType, category],
        status: 'active',
        review_status: 'approved',
      })
      .select('id')
      .single();

    if (phraseErr) {
      console.error('[health-check/submit] insert phrase error:', phraseErr.message);
      // phrase失败不影响主流程，submission已保存
    }

    // 3. 关联phrase_id
    if (phrase?.id) {
      await supabase
        .from('ai_checkup_submissions')
        .update({ phrase_id: phrase.id })
        .eq('id', submission.id);
    }

    // 4. 审计日志
    await logAction({
      userId: auth.userId,
      companyId: auth.companyId || undefined,
      action: AuditAction.CREATE,
      resourceType: ResourceType.CHECKUP,
      resourceId: submission.id,
      detail: { checkupType, phraseId: phrase?.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        phraseId: phrase?.id || null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('[health-check/submit] error:', message);
    return NextResponse.json({ error: '提交失败，请稍后重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();
    let query = supabase
      .from('ai_checkup_submissions')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && VALID_TYPES.includes(type as CheckupType)) {
      query = query.eq('checkup_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[health-check/submit] GET error:', error.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('[health-check/submit] GET error:', message);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
