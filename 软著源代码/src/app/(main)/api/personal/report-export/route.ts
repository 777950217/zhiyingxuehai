import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, ShadingType, WidthType,
} from 'docx';

/* ─── 认证 ─── */
async function verifyPersonalUser(request: NextRequest) {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };
  const { data: profile } = await supabase.from('users').select('role, display_name').eq('id', user.id).single();
  if (!profile || profile.role !== 'personal_user') {
    return { error: NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 }) };
  }
  return { userId: user.id, displayName: profile.display_name || '用户' };
}

/* ─── Markdown → Paragraphs ─── */
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 32 : 26, color: '1e3a5f' })] });
}

function bulletItem(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function parseMarkdownToParagraphs(md: string): Paragraph[] {
  const lines = md.split('\n');
  const paragraphs: Paragraph[] = [];
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) {
      paragraphs.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: line, font: 'Courier New', size: 18, color: '555555' })] }));
      continue;
    }
    if (line.startsWith('## ')) { paragraphs.push(heading(line.slice(3), HeadingLevel.HEADING_2)); continue; }
    if (line.startsWith('# ')) { paragraphs.push(heading(line.slice(2), HeadingLevel.HEADING_1)); continue; }
    if (line.startsWith('- ') || line.startsWith('* ')) { paragraphs.push(bulletItem(line.slice(2))); continue; }
    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) { paragraphs.push(bulletItem(line.slice(numMatch[0].length))); continue; }
    if (line.trim() === '') { paragraphs.push(new Paragraph({ spacing: { after: 60 }, children: [] })); continue; }
    const runs: TextRun[] = [];
    const parts = line.split(/(\*\*.*?\*\*)/g);
    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 22 }));
      } else if (part) {
        runs.push(new TextRun({ text: part, size: 22 }));
      }
    }
    paragraphs.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
  }
  return paragraphs;
}

/* ─── POST: 导出个人版报告 ─── */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if ('error' in auth) return auth.error;
    const { userId, displayName } = auth;

    const body = await request.json();
    const { report_id, format = 'docx' } = body;
    if (!report_id) return NextResponse.json({ error: '缺少report_id参数' }, { status: 400 });

    const supabase = getSupabaseClient();

    // 读取报告
    const { data: report, error } = await supabase
      .from('personal_reports')
      .select('*')
      .eq('id', report_id)
      .eq('user_id', userId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    const now = new Date();
    const children: Paragraph[] = [];

    // 封面
    children.push(new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [] }));
    const reportTypeLabel = report.report_type === 'weekly' ? '周报' : report.report_type === 'monthly' ? '月报' : report.report_type === 'cda' ? 'CDA分析报告' : '报告';
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${displayName} - ${reportTypeLabel}`, bold: true, size: 40, color: '1e3a5f' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: report.title, size: 28, color: '333333' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `周期：${report.period}`, size: 24, color: '666666' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `生成时间：${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN')}`, size: 22, color: '999999' })] }));
    children.push(new Paragraph({ spacing: { before: 800 }, children: [] }));

    // 报告正文
    const contentParagraphs = parseMarkdownToParagraphs(report.content);
    children.push(...contentParagraphs);

    // 页脚
    children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '— 职盈学海 AI 生成 —', size: 18, color: 'BBBBBB' })] }));

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    const filename = `${displayName}_${reportTypeLabel}_${report.period}.docx`;
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '导出报告失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
