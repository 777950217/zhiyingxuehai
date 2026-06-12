import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
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

/* ─── 文档辅助 ─── */
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 32 : 26, color: '1e3a5f' })] });
}

function bodyText(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, bold: opts?.bold, size: opts?.size ?? 22, color: opts?.color ?? '333333' })],
  });
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
    // Headings
    if (line.startsWith('## ')) { paragraphs.push(heading(line.slice(3), HeadingLevel.HEADING_2)); continue; }
    if (line.startsWith('# ')) { paragraphs.push(heading(line.slice(2), HeadingLevel.HEADING_1)); continue; }
    // Bullet items
    if (line.startsWith('- ') || line.startsWith('* ')) { paragraphs.push(bulletItem(line.slice(2))); continue; }
    // Numbered items
    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) { paragraphs.push(bulletItem(line.slice(numMatch[0].length))); continue; }
    // Empty line
    if (line.trim() === '') { paragraphs.push(new Paragraph({ spacing: { after: 60 }, children: [] })); continue; }
    // Regular paragraph - extract bold markers
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

/* ─── POST: 生成个人版CDA导出报告 ─── */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if ('error' in auth) return auth.error;
    const { userId, displayName } = auth;

    const supabase = getSupabaseClient();

    // 1. 检查是否有已生成的CDA报告
    const { data: existingReport } = await supabase
      .from('personal_reports')
      .select('content')
      .eq('user_id', userId)
      .eq('has_cda', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let cdaContent = existingReport?.content || '';

    // 2. 如果没有CDA报告，先生成（消耗次数）
    if (!cdaContent) {
      // 检查次数
      const { data: creditData } = await supabase
        .from('cda_credits')
        .select('total_credits, used_credits')
        .eq('user_id', userId)
        .single();
      const total = creditData?.total_credits ?? 0;
      const used = creditData?.used_credits ?? 0;
      let usedTrial = false;
      if (total - used <= 0) {
        const { data: tData } = await supabase
          .from('personal_feature_trials')
          .select('used_count')
          .eq('user_id', userId)
          .eq('feature', 'cda')
          .single();
        const trialUsed = tData?.used_count ?? 0;
        if (trialUsed >= 1) {
          return NextResponse.json({ error: '需要CDA分析次数才能导出专业报告', creditsInsufficient: true }, { status: 403 });
        }
        usedTrial = true;
      }

      // 检查数据量
      const { data: records } = await supabase
        .from('personal_data_records')
        .select('*')
        .eq('user_id', userId)
        .order('record_date', { ascending: true });

      if (!records || records.length < 4) {
        return NextResponse.json({ error: `数据不足，需要至少4条记录，当前${records?.length ?? 0}条`, dataInsufficient: true }, { status: 400 });
      }

      // 调用LLM生成CDA
      const dataText = records.map(r =>
        `${r.record_date}: 接待${r.visits} 响应${r.avg_response_time}s 咨询${r.consultations} 成交${r.orders} 差评${r.complaints} 转化率${r.conversion_rate}% 差评率${r.complaint_rate}% 环比${r.mom_change > 0 ? '+' : ''}${r.mom_change}%`
      ).join('\n');

      const avgVisits = records.reduce((s: number, r: { visits: number }) => s + r.visits, 0) / records.length;
      const stdVisits = Math.sqrt(records.reduce((s: number, r: { visits: number }) => s + Math.pow(r.visits - avgVisits, 2), 0) / records.length);

      const systemPrompt = `你是"职盈学海"CDA数据分析专家，帮助客服主管做专业数据分析。

## 分析方法
1. 异常检测：用控制图法，均值±2σ作为上下控制线
   - 接待量参考：均值=${avgVisits.toFixed(1)}, UCL=${Math.round(avgVisits + 2 * stdVisits)}, LCL=${Math.round(Math.max(0, avgVisits - 2 * stdVisits))}
2. 趋势预测：基于数据趋势做简单线性外推
3. 相关性分析：分析指标间关联
4. 归因分析：差评率变化的根因推断

## 输出格式（严格遵守）

# CDA 专业数据分析

## 一、异常检测
- 每个异常项：指标名→实际值→控制线→偏差→💡这意味着什么→🗣️跟老板怎么说

## 二、趋势预测
- 每个预测项：指标→当前值→预测值→趋势→💡这意味着什么→🗣️跟老板怎么说

## 三、相关性分析
- 每个关联：指标A↔指标B→相关方向→💡这意味着什么→🗣️跟老板怎么说

## 四、归因分析
- 每个归因：现象→数据佐证→根因→💡这意味着什么→🗣️跟老板怎么说

## 五、行动建议
（3条具体可执行的建议，附优先级🔴🟡🟢）

规则：
- 每个结论必须附💡人话解释
- 每个结论必须附🗣️跟老板怎么说（30字以内）
- 数据必须基于真实数据，不要编造`;

      const config = new Config();
      const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
      const client = new LLMClient(config, customHeaders);

      let fullResponse = '';
      const llmStream = client.stream(
        [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: `以下是我的工作数据：\n${dataText}` },
        ],
        { model: 'doubao-seed-2-0-lite-260215', temperature: 0.7 },
      );

      for await (const chunk of llmStream) {
        if (chunk.content) fullResponse += chunk.content.toString();
      }

      if (!fullResponse) {
        return NextResponse.json({ error: 'CDA分析生成失败，请重试' }, { status: 500 });
      }

      // 扣减次数
      if (usedTrial) {
        const { data: existingTrial } = await supabase
          .from('personal_feature_trials')
          .select('used_count')
          .eq('user_id', userId)
          .eq('feature', 'cda')
          .single();
        if (existingTrial) {
          await supabase.from('personal_feature_trials').update({ used_count: (existingTrial.used_count ?? 0) + 1 }).eq('user_id', userId).eq('feature', 'cda');
        } else {
          await supabase.from('personal_feature_trials').insert({ user_id: userId, feature: 'cda', used_count: 1 });
        }
      } else {
        await supabase.from('cda_credits').update({ used_credits: used + 1, updated_at: new Date().toISOString() }).eq('user_id', userId);
      }

      // 保存报告
      const now = new Date();
      const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await supabase.from('personal_reports').insert({
        user_id: userId, report_type: 'cda', period: periodStr,
        title: `CDA分析 ${periodStr}`, content: fullResponse, has_cda: true,
      });

      cdaContent = fullResponse;
    }

    // 3. 读取数据记录
    const { data: records } = await supabase
      .from('personal_data_records')
      .select('*')
      .eq('user_id', userId)
      .order('record_date', { ascending: true });

    // 4. 生成docx文档
    const now = new Date();
    const periodLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

    const children: Paragraph[] = [];

    // 封面
    children.push(new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${displayName} - CDA专业数据分析报告`, bold: true, size: 40, color: '1e3a5f' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: `报告周期：${periodLabel}`, size: 24, color: '666666' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `生成时间：${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN')}`, size: 22, color: '999999' })] }));
    children.push(new Paragraph({ spacing: { before: 800 }, children: [] }));

    // 一、数据概览
    children.push(heading('一、数据概览'));
    if (records && records.length > 0) {
      const dataRows = [
        new TableRow({
          tableHeader: true,
          children: ['日期', '接待量', '响应(秒)', '咨询', '成交', '差评', '转化率', '差评率'].map(text =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: '1e3a5f' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18, color: 'FFFFFF' })] })],
            })
          ),
        }),
        ...records.map(r =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.record_date, size: 18 })] })] }),
              ...[r.visits, r.avg_response_time, r.consultations, r.orders, r.complaints].map(v =>
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(v ?? '-'), size: 18 })] })] })
              ),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${(r.conversion_rate ?? 0).toFixed(1)}%`, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${(r.complaint_rate ?? 0).toFixed(1)}%`, size: 18 })] })] }),
            ],
          })
        ),
      ];
      children.push(new Paragraph({ children: [new Table({ rows: dataRows, width: { size: 100, type: WidthType.PERCENTAGE } })] } as never));

      // 目标达成率
      const hasTarget = records.some((r: { target_visits: number | null }) => r.target_visits != null);
      if (hasTarget) {
        children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
        children.push(heading('目标达成率', HeadingLevel.HEADING_2));
        for (const r of records) {
          if (r.target_visits != null) {
            const rate = Math.round((r.visits / r.target_visits) * 100);
            const color = rate >= 100 ? '008800' : rate >= 80 ? 'CC8800' : 'CC0000';
            children.push(bulletItem(`${r.record_date}：接待量达成率 ${rate}%（目标${r.target_visits}，实际${r.visits}）`));
          }
        }
      }
    }

    // 二、CDA分析结果
    children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    children.push(heading('二、CDA分析结果'));
    const cdaParagraphs = parseMarkdownToParagraphs(cdaContent);
    children.push(...cdaParagraphs);

    // 三、建议行动（已包含在CDA分析中）
    children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    children.push(bodyText('— 报告结束 —', { color: '999999', size: 20 }));

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    const filename = `${displayName}_CDA分析报告_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}.docx`;
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '生成报告失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
