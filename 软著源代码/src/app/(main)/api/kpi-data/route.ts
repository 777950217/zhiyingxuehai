import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, verifyCompanyAccess, forbiddenResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    // 下载导入模板
    if (action === 'template') {
      const BOM = '\uFEFF';
      const header = '客服姓名,考核月份,指标名称,目标值,实际值,备注\n';
      const example1 = '张三,2026-01,平均首次响应时长,≤30秒,28,达标\n';
      const example2 = '张三,2026-01,客户满意度,≥90%,92%,持续保持\n';
      const example3 = '李四,2026-01,问题解决率,≥85%,80%,需改进\n';
      const csvContent = BOM + header + example1 + example2 + example3;
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': 'attachment; filename=kpi_import_template.csv',
        },
      });
    }

    // 获取KPI记录列表
    let query = supabase
      .from('kpi_records')
      .select('*')
      .order('created_at', { ascending: false });

    // 非 admin 强制企业过滤
    if (auth.role !== 'admin') {
      if (auth.companyId) {
        query = query.eq('company_id', auth.companyId);
      }
      // staff 只能看自己的 KPI
      if (auth.role === 'staff' || auth.role === 'personal_user') {
        query = query.eq('recorded_by', auth.userId);
      } else if (userId) {
        query = query.eq('recorded_by', userId);
      }
    } else {
      // admin 可选过滤
      const companyId = searchParams.get('companyId');
      if (companyId) query = query.eq('company_id', companyId);
      if (userId) query = query.eq('recorded_by', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('[API] GET /kpi-data error:', err);
    return NextResponse.json({ error: '获取KPI数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 只有主管和老板可以录入
  if (auth.role !== 'admin' && auth.role !== 'enterprise_admin' && auth.role !== 'enterprise_manager') {
    return forbiddenResponse('只有主管或管理员可以录入绩效数据');
  }

  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { action } = body;

    // 批量导入
    if (action === 'import') {
      const { records } = body;
      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({ error: '导入数据不能为空' }, { status: 400 });
      }

      const companyId = auth.companyId;
      const userId = auth.userId;

      // 批量插入
      const insertRows = records.map((r: {
        agentName?: string;
        agentId?: string;
        period?: string;
        recordDate?: string;
        metricName?: string;
        target?: string;
        actual?: string | number;
        remark?: string;
      }) => ({
        company_id: companyId,
        agent_id: r.agentId || null,
        metric_name: r.metricName || '综合指标',
        period: r.period || r.recordDate?.slice(0, 7) || new Date().toISOString().slice(0, 7),
        recorded_by: userId,
        record_date: r.recordDate || new Date().toISOString().slice(0, 10),
        metrics_data: {
          target: r.target || '',
          actual: r.actual !== undefined ? Number(r.actual) : null,
          remark: r.remark || '',
          agentName: r.agentName || '',
        },
      }));

      const { data, error } = await supabase
        .from('kpi_records')
        .insert(insertRows)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        imported: data?.length || 0,
        data,
      });
    }

    // 单条录入
    const { recordDate, metricsData, period, agentId, metricName, score, maxScore } = body;

    if (!recordDate) {
      return NextResponse.json({ error: '缺少考核日期' }, { status: 400 });
    }

    const companyId = auth.companyId;
    const userId = auth.userId;

    // 检查同客服同月份同指标是否已有记录
    if (agentId && metricName) {
      const { data: existing } = await supabase
        .from('kpi_records')
        .select('id')
        .eq('company_id', companyId)
        .eq('agent_id', agentId)
        .eq('metric_name', metricName)
        .eq('period', period || recordDate.slice(0, 7))
        .maybeSingle();

      if (existing) {
        // 更新已有记录
        const { data, error } = await supabase
          .from('kpi_records')
          .update({
            metrics_data: metricsData,
            score: score ?? null,
            max_score: maxScore ?? null,
            recorded_by: userId,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ data, updated: true });
      }
    }

    const { data, error } = await supabase
      .from('kpi_records')
      .insert({
        company_id: companyId,
        agent_id: agentId || null,
        recorded_by: userId,
        period: period || recordDate.slice(0, 7),
        metric_name: metricName || '综合指标',
        metrics_data: metricsData,
        score: score ?? null,
        max_score: maxScore ?? null,
        record_date: recordDate,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /kpi-data error:', err);
    return NextResponse.json({ error: '保存KPI数据失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, metricsData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少id' }, { status: 400 });
    }

    // 非 admin 校验归属：只能修改自己企业的 KPI 记录
    if (auth.role !== 'admin') {
      const { data: existing } = await supabase
        .from('kpi_records')
        .select('company_id, recorded_by')
        .eq('id', id)
        .single();

      if (!existing) {
        return NextResponse.json({ error: '记录不存在' }, { status: 404 });
      }
      if (existing.company_id !== auth.companyId) {
        return forbiddenResponse('无权修改此记录');
      }
      // staff 只能改自己的
      if ((auth.role === 'staff' || auth.role === 'personal_user') && existing.recorded_by !== auth.userId) {
        return forbiddenResponse('只能修改自己的KPI记录');
      }
    }

    const { data, error } = await supabase
      .from('kpi_records')
      .update({
        metrics_data: metricsData,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] PUT /kpi-data error:', err);
    return NextResponse.json({ error: '更新KPI数据失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 只有 admin/enterprise_admin 可以删除 KPI 记录
  if (auth.role !== 'admin' && auth.role !== 'enterprise_admin') {
    return forbiddenResponse('无权删除KPI记录');
  }

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });

    // 非 admin 校验归属
    if (auth.role !== 'admin') {
      const { data: existing } = await supabase
        .from('kpi_records')
        .select('company_id')
        .eq('id', id)
        .single();

      if (!existing) {
        return NextResponse.json({ error: '记录不存在' }, { status: 404 });
      }
      if (existing.company_id !== auth.companyId) {
        return forbiddenResponse('无权删除此记录');
      }
    }

    const { error } = await supabase
      .from('kpi_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /kpi-data error:', err);
    return NextResponse.json({ error: '删除KPI数据失败' }, { status: 500 });
  }
}
