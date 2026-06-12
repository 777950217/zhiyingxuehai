import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType,
} from 'docx';

/* ─── 认证 ─── */
async function verifyEnterpriseAdmin(request: NextRequest) {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };
  const { data: profile } = await supabase.from('users').select('role, company_id').eq('id', user.id).single();
  if (!profile) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };
  // enterprise_admin 和 admin 直接通过
  if (profile.role === 'enterprise_admin' || profile.role === 'admin') {
    return { userId: user.id, companyId: profile.company_id, role: profile.role };
  }
  // enterprise_manager 需要旗舰版
  if (profile.role === 'enterprise_manager') {
    const { data: company } = await supabase.from('companies').select('plan').eq('id', profile.company_id).single();
    if (company?.plan === 'flagship') {
      return { userId: user.id, companyId: profile.company_id, role: profile.role };
    }
  }
  return { error: NextResponse.json({ error: '仅旗舰版可导出CDA报告' }, { status: 403 }) };
}

/* ─── 统计 ─── */
function calcMean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function calcStd(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const mean = calcMean(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / (nums.length - 1));
}

/* ─── 经营数据 ─── */
interface BusinessRecord {
  year: number; month: number;
  total_revenue: number; total_expense: number; net_profit: number;
  purchase_total: number; ad_total: number; shipping_pack_total: number;
  salary_total: number; rent_total: number; utilities_total: number;
  after_sales_total: number; returns_total: number; platform_fee_total: number;
}

const COST_FIELDS: Array<{ key: keyof BusinessRecord; label: string }> = [
  { key: 'total_revenue', label: '收入' },
  { key: 'total_expense', label: '总支出' },
  { key: 'purchase_total', label: '进货成本' },
  { key: 'ad_total', label: '广告投放' },
  { key: 'shipping_pack_total', label: '快递包装' },
  { key: 'salary_total', label: '人员工资' },
  { key: 'after_sales_total', label: '售后赔付' },
  { key: 'returns_total', label: '退货损失' },
];

/* ─── 文档辅助 ─── */
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 32 : 26 })] });
}

function bodyText(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new Paragraph({
    spacing: { after: 100 },
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

/* ─── POST: 生成CDA导出报告 ─── */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyEnterpriseAdmin(request);
    if ('error' in auth) return auth.error;
    const { companyId } = auth;

    const body = await request.json();
    const { format = 'docx' } = body; // docx | pdf (pdf暂用html替代)

    const supabase = getSupabaseClient();

    // 1. 获取公司信息
    const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single();
    const companyName = company?.name || '未知公司';

    // 2. 读取近6个月经营数据
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const records: BusinessRecord[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const { data } = await supabase
        .from('business_records')
        .select('year, month, total_revenue, total_expense, net_profit, purchase_total, ad_total, shipping_pack_total, salary_total, rent_total, utilities_total, after_sales_total, returns_total, platform_fee_total')
        .eq('company_id', companyId)
        .eq('year', y)
        .eq('month', m)
        .single();
      if (data) records.push(data as BusinessRecord);
    }

    if (records.length === 0) {
      return NextResponse.json({ error: '暂无经营数据，请先在经营工具箱中录入' }, { status: 400 });
    }

    const dataSufficient = records.length >= 3;

    // 3. 计算控制图数据 + 异常检测
    interface AnalysisResult { field: string; label: string; months: string[]; values: number[]; ucl: number; lcl: number; mean: number; anomalies: Array<{ month: string; value: number; isHigh: boolean; changePercent: number }>; trend: string; }
    const analysisResults: AnalysisResult[] = [];

    for (const field of COST_FIELDS) {
      const values = records.map(r => Number(r[field.key]) || 0);
      const months = records.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`);
      const anomalies: AnalysisResult['anomalies'] = [];

      let ucl = 0, lcl = 0, mean = 0, trend = '稳定';

      if (dataSufficient) {
        mean = calcMean(values);
        const std = calcStd(values);
        ucl = mean + 3 * std;
        lcl = Math.max(0, mean - 3 * std);

        for (let i = 0; i < values.length; i++) {
          if (values[i] > ucl || values[i] < lcl) {
            const prevValue = i > 0 ? values[i - 1] : 0;
            const changePercent = prevValue > 0 ? ((values[i] - prevValue) / prevValue * 100) : 0;
            anomalies.push({ month: months[i], value: values[i], isHigh: values[i] > ucl, changePercent });
          }
        }
      } else {
        mean = calcMean(values);
        for (let i = 0; i < values.length; i++) {
          const prevValue = i > 0 ? values[i - 1] : 0;
          const changePercent = prevValue > 0 ? ((values[i] - prevValue) / prevValue * 100) : 0;
          if (Math.abs(changePercent) > 30 && values[i] > 0) {
            anomalies.push({ month: months[i], value: values[i], isHigh: changePercent > 0, changePercent });
          }
        }
      }

      // 简单趋势判断
      if (values.length >= 3) {
        const recent3 = values.slice(-3);
        const firstHalf = recent3.slice(0, Math.ceil(recent3.length / 2));
        const secondHalf = recent3.slice(Math.ceil(recent3.length / 2));
        const avgFirst = calcMean(firstHalf);
        const avgSecond = calcMean(secondHalf);
        if (avgSecond > avgFirst * 1.05) trend = '上升';
        else if (avgSecond < avgFirst * 0.95) trend = '下降';
      }

      analysisResults.push({ field: field.key, label: field.label, months, values, ucl: Math.round(ucl), lcl: Math.round(lcl), mean: Math.round(mean), anomalies, trend });
    }

    // 4. 生成docx文档
    const periodStart = records[0] ? `${records[0].year}年${records[0].month}月` : '';
    const periodEnd = records[records.length - 1] ? `${records[records.length - 1].year}年${records[records.length - 1].month}月` : '';
    const periodLabel = periodStart === periodEnd ? periodStart : `${periodStart} - ${periodEnd}`;

    const children: Paragraph[] = [];

    // 封面
    children.push(new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: companyName, bold: true, size: 44, color: '1e3a5f' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'CDA 专业数据分析报告', bold: true, size: 40, color: '1e3a5f' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: `报告周期：${periodLabel}`, size: 24, color: '666666' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `生成时间：${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN')}`, size: 22, color: '999999' })] }));
    children.push(new Paragraph({ spacing: { before: 1000 }, children: [] }));

    // 一、数据概览
    children.push(heading('一、数据概览', HeadingLevel.HEADING_1));
    children.push(bodyText(`以下为${periodLabel}期间各成本维度的数据汇总：`));

    // 数据概览表格
    const overviewRows = [
      new TableRow({
        tableHeader: true,
        children: ['成本维度', ...records.map(r => `${r.month}月`), '均值'].map(text =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: '1e3a5f' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF' })] })],
          })
        ),
      }),
      ...analysisResults.map(ar =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ar.label, bold: true, size: 20 })] })] }),
            ...ar.values.map(v =>
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `¥${v.toLocaleString()}`, size: 20 })] })] })
            ),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `¥${ar.mean.toLocaleString()}`, bold: true, size: 20 })] })] }),
          ],
        })
      ),
    ];

    children.push(new Paragraph({
      children: [new Table({ rows: overviewRows, width: { size: 100, type: WidthType.PERCENTAGE } })],
    } as never));

    children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));

    // 二、控制图分析
    children.push(heading('二、控制图分析', HeadingLevel.HEADING_1));
    children.push(bodyText(dataSufficient
      ? `基于控制图法（均值±3σ），对${analysisResults.length}个成本维度进行异常检测。`
      : '数据不足3个月，使用固定阈值法（环比>30%报警），录入3个月以上数据后自动切换为智能预警。'
    ));

    for (const ar of analysisResults) {
      children.push(heading(ar.label, HeadingLevel.HEADING_2));
      if (dataSufficient) {
        children.push(bodyText(`UCL(上控制线): ¥${ar.ucl.toLocaleString()}  |  LCL(下控制线): ¥${ar.lcl.toLocaleString()}  |  均值: ¥${ar.mean.toLocaleString()}`));
      }
      // 数据表格
      const chartRows = [
        new TableRow({
          tableHeader: true,
          children: ['月份', '实际值', dataSufficient ? 'UCL' : '阈值', dataSufficient ? 'LCL' : '-', '是否异常'].map(text =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: '2d4a6f' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18, color: 'FFFFFF' })] })],
            })
          ),
        }),
        ...ar.months.map((month, i) => {
          const isAnomaly = ar.anomalies.some(a => a.month === month);
          return new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: month, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `¥${ar.values[i].toLocaleString()}`, size: 18, bold: isAnomaly, color: isAnomaly ? 'CC0000' : '333333' })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: dataSufficient ? `¥${ar.ucl.toLocaleString()}` : '30%', size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: dataSufficient ? `¥${ar.lcl.toLocaleString()}` : '-', size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: isAnomaly ? '异常' : '正常', bold: isAnomaly, size: 18, color: isAnomaly ? 'CC0000' : '008800' })] })] }),
            ],
          });
        }),
      ];
      children.push(new Paragraph({
        children: [new Table({ rows: chartRows, width: { size: 100, type: WidthType.PERCENTAGE } })],
      } as never));
      children.push(new Paragraph({ spacing: { before: 100 }, children: [] }));
    }

    // 三、异常检测结果
    children.push(heading('三、异常检测结果', HeadingLevel.HEADING_1));
    const allAnomalies = analysisResults.flatMap(ar => ar.anomalies.map(a => ({ ...a, label: ar.label })));
    if (allAnomalies.length === 0) {
      children.push(bodyText('未检测到异常数据，各项成本指标均在正常范围内。', { color: '008800' }));
    } else {
      children.push(bodyText(`共检测到 ${allAnomalies.length} 项异常：`));
      for (const a of allAnomalies) {
        const direction = a.isHigh ? '超上控制线' : '低于下控制线';
        children.push(bulletItem(`${a.label} - ${a.month}：¥${a.value.toLocaleString()}，${direction}，环比${a.changePercent > 0 ? '+' : ''}${a.changePercent.toFixed(1)}%`));
        children.push(bodyText(`  💡 这意味着：${a.label}${a.isHigh ? '偏高，需要关注是否存在异常支出或业务波动' : '偏低，可能与业务量下降有关'}`, { color: '666666', size: 20 }));
        children.push(bodyText(`  🗣️ 跟老板怎么说："${a.label}${a.isHigh ? '这个月比上月多了' : '这个月比上月少了'}${Math.abs(a.changePercent).toFixed(0)}%，我正在排查原因"`, { color: '1e3a5f', size: 20 }));
      }
    }

    // 四、趋势判断
    children.push(heading('四、趋势判断', HeadingLevel.HEADING_1));
    for (const ar of analysisResults) {
      const icon = ar.trend === '上升' ? '📈' : ar.trend === '下降' ? '📉' : '➡️';
      children.push(bulletItem(`${ar.label}：${icon} ${ar.trend}`));
    }

    // 五、建议行动
    children.push(heading('五、建议行动', HeadingLevel.HEADING_1));
    const highAnomalies = allAnomalies.filter(a => a.isHigh);
    if (highAnomalies.length > 0) {
      children.push(bodyText('🔴 优先处理（成本超标的维度）：'));
      for (const a of highAnomalies.slice(0, 3)) {
        children.push(bulletItem(`${a.label}：本月¥${a.value.toLocaleString()}，环比+${a.changePercent.toFixed(1)}%，建议逐笔核查异常支出`));
      }
    }
    const downAnomalies = allAnomalies.filter(a => !a.isHigh);
    if (downAnomalies.length > 0) {
      children.push(bodyText('🟡 关注变化（下降的维度）：'));
      for (const a of downAnomalies.slice(0, 3)) {
        children.push(bulletItem(`${a.label}：本月¥${a.value.toLocaleString()}，环比${a.changePercent.toFixed(1)}%，确认是否为业务量下降所致`));
      }
    }
    if (allAnomalies.length === 0) {
      children.push(bodyText('各项指标正常，建议继续保持当前成本管控节奏，定期检查经营工具箱数据。', { color: '008800' }));
    }

    // 生成文档
    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    // 返回文件下载
    const filename = `${companyName}_CDA分析报告_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}.docx`;
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
