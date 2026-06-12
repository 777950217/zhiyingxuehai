import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getTemplateById } from '@/lib/templates-data';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { templateId, companyId } = body;

    if (!templateId || !companyId) {
      return NextResponse.json({ error: '参数不完整：templateId和companyId必填' }, { status: 400 });
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    // 检查是否已导入过（避免重复）
    const { data: existingPhrases } = await supabase
      .from('phrase_library')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_preset', true)
      .limit(1);

    const { data: existingSops } = await supabase
      .from('sop_templates')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_preset', true)
      .limit(1);

    // 话术导入
    let phrasesImported = 0;
    if (template.phrases.length > 0) {
      const phraseRows = template.phrases.map(p => ({
        company_id: companyId,
        category: p.category,
        content: p.content,
        is_preset: true,
        use_count: 0,
        scene: p.scene || '',
        question: p.question || '',
        answer: p.answer || '',
        tags: p.tags || '',
      }));

      // 如果已有预设话术，先删除再导入（覆盖式导入）
      if (existingPhrases && existingPhrases.length > 0) {
        await supabase
          .from('phrase_library')
          .delete()
          .eq('company_id', companyId)
          .eq('is_preset', true);
      }

      const { data: insertedPhrases, error: phraseErr } = await supabase
        .from('phrase_library')
        .insert(phraseRows)
        .select('id');

      if (phraseErr) throw phraseErr;
      phrasesImported = insertedPhrases?.length || 0;
    }

    // SOP导入
    let sopsImported = 0;
    if (template.sops.length > 0) {
      const sopRows = template.sops.map(s => ({
        company_id: companyId,
        category: s.category,
        name: `[模板]${s.name}`,
        scenario: s.scenario || '',
        steps_json: JSON.stringify(s.steps),
        role: s.role,
        is_preset: true,
        needs_update: false,
        version: 1,
      }));

      // 如果已有预设SOP，先删除再导入
      if (existingSops && existingSops.length > 0) {
        await supabase
          .from('sop_templates')
          .delete()
          .eq('company_id', companyId)
          .eq('is_preset', true);
      }

      const { data: insertedSops, error: sopErr } = await supabase
        .from('sop_templates')
        .insert(sopRows)
        .select('id');

      if (sopErr) throw sopErr;
      sopsImported = insertedSops?.length || 0;
    }

    return NextResponse.json({
      success: true,
      templateName: template.name,
      phrasesImported,
      sopsImported,
      message: `已导入「${template.name}」：${phrasesImported}条话术 + ${sopsImported}个SOP流程`,
    });
  } catch (err) {
    console.error('[API] POST /templates/import error:', err);
    return NextResponse.json({ error: '导入模板失败' }, { status: 500 });
  }
}
