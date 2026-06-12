import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { format, report_ids, company_id } = body as {
      format: 'xlsx' | 'csv';
      report_ids?: string[];
      company_id?: string;
    };

    if (!format || !['xlsx', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'format 必须为 xlsx 或 csv' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 查询报告
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (report_ids && report_ids.length > 0) {
      query = query.in('id', report_ids);
    }
    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: reports, error } = await query;
    if (error) throw error;
    if (!reports || reports.length === 0) {
      return NextResponse.json({ error: '没有找到报告数据' }, { status: 404 });
    }

    // 动态导入 xlsx
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();
    const typeNames: Record<string, string> = {
      cost_weekly: '成本周报',
      quality_weekly: '质检周报',
      workorder_weekly: '工单周报',
      ai_monthly: 'AI月报',
    };

    // 按类型分组，每种类型一个 sheet
    const grouped = new Map<string, typeof reports>();
    for (const r of reports) {
      const key = r.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    for (const [type, typeReports] of grouped) {
      const sheetName = typeNames[type] || type;

      // 概览数据
      const overviewRows = typeReports.map(r => ({
        '报告标题': r.title,
        '报告周期': `${r.period_start} ~ ${r.period_end}`,
        'AI摘要': r.summary || '',
        '生成时间': new Date(r.created_at).toLocaleString('zh-CN'),
      }));

      const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
      // 调整列宽
      wsOverview['!cols'] = [
        { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsOverview, sheetName);

      // 洞察数据（如果有）
      const allInsights = typeReports.flatMap(r => {
        const insights = (r.insights as Array<{ type: string; text: string }>) || [];
        return insights.map(ins => ({
          '报告标题': r.title,
          '洞察类型': ins.type === 'warning' ? '预警' : ins.type === 'good' ? '正面' : '趋势',
          '洞察内容': ins.text,
        }));
      });

      if (allInsights.length > 0) {
        const wsInsights = XLSX.utils.json_to_sheet(allInsights);
        wsInsights['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, wsInsights, `${sheetName}-洞察`);
      }

      // 原始数据（取最新一期）
      const latestReport = typeReports[0];
      if (latestReport?.data) {
        const rawData = latestReport.data as Record<string, unknown>;
        // 将 JSON 展平为 key-value 行
        const dataRows = flattenToRows(rawData);
        if (dataRows.length > 0) {
          const wsData = XLSX.utils.json_to_sheet(dataRows);
          wsData['!cols'] = [{ wch: 25 }, { wch: 30 }];
          XLSX.utils.book_append_sheet(wb, wsData, `${sheetName}-数据`);
        }
      }
    }

    // 生成文件
    const buf = format === 'csv'
      ? XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
      : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const fileName = `职盈学海_数据报告_${new Date().toISOString().slice(0, 10)}.${format === 'csv' ? 'csv' : 'xlsx'}`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err) {
    console.error('Export reports error:', err);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}

/** 递归展平 JSON 为 [{key, value}] 行 */
function flattenToRows(
  obj: Record<string, unknown>,
  prefix = ''
): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flattenToRows(v as Record<string, unknown>, fullKey));
    } else if (Array.isArray(v)) {
      if (v.length > 0 && typeof v[0] === 'object') {
        // 数组对象取第一条
        rows.push({ key: `${fullKey}[0]`, value: JSON.stringify(v[0], null, 2) });
        if (v.length > 1) {
          rows.push({ key: `${fullKey}...`, value: `共${v.length}条` });
        }
      } else {
        rows.push({ key: fullKey, value: JSON.stringify(v) });
      }
    } else {
      rows.push({ key: fullKey, value: String(v ?? '') });
    }
  }
  return rows;
}
