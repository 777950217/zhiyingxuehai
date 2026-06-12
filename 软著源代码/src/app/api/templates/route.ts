import { NextRequest, NextResponse } from 'next/server';
import { INDUSTRY_TEMPLATES, getTemplateSummary } from '@/lib/templates-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const detail = searchParams.get('detail') === 'true';

    // 单个模板详情
    if (templateId) {
      const template = INDUSTRY_TEMPLATES.find(t => t.id === templateId);
      if (!template) {
        return NextResponse.json({ error: '模板不存在' }, { status: 404 });
      }
      const summary = getTemplateSummary(template);
      return NextResponse.json({
        template: detail ? template : {
          id: template.id,
          name: template.name,
          description: template.description,
          icon: template.icon,
          color: template.color,
          targetUser: template.targetUser,
          teamSize: template.teamSize,
          tags: template.tags,
        },
        summary,
      });
    }

    // 模板列表（不含完整话术/SOP数据）
    const list = INDUSTRY_TEMPLATES.map(t => {
      const summary = getTemplateSummary(t);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        color: t.color,
        targetUser: t.targetUser,
        teamSize: t.teamSize,
        tags: t.tags,
        summary,
      };
    });

    return NextResponse.json({ templates: list });
  } catch (err) {
    console.error('[API] GET /templates error:', err);
    return NextResponse.json({ error: '获取模板列表失败' }, { status: 500 });
  }
}
