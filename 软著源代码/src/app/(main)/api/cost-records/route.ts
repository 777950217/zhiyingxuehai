import { getSupabaseClient } from "@/storage/database/supabase-client";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse, verifyCompanyAccess, forbiddenResponse } from "@/lib/api-auth";

const ALERT_THRESHOLD = 30; // 环比上涨30%触发预警

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 非 admin 强制使用 auth.companyId，admin 可选指定
  const { searchParams } = new URL(request.url);
  let companyId: string;

  if (auth.role === 'admin') {
    const requestedId = searchParams.get("companyId");
    if (!requestedId) {
      return NextResponse.json({ error: "缺少companyId参数" }, { status: 400 });
    }
    companyId = requestedId;
  } else {
    companyId = auth.companyId;
  }

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    const supabase = getSupabaseClient();

    // 查询成本记录
    let query = supabase
      .from("cost_records")
      .select("*")
      .eq("company_id", companyId)
      .order("record_date", { ascending: false });

    if (startDate) {
      query = query.gte("record_date", startDate);
    }
    if (endDate) {
      query = query.lte("record_date", endDate);
    }

    const { data: records, error } = await query;
    if (error) {
      console.error('[cost-records GET] query error:', error);
      throw error;
    }

    console.log('[cost-records GET]', { companyId, recordCount: records?.length });

    const monthParam = searchParams.get("month"); // e.g. "2026-05"
    // 计算统计数据
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const monthStart = monthParam ? `${monthParam}-01` : (today.substring(0, 8) + "01");
    const monthEnd = monthParam ? `${monthParam}-31` : today;

    // 今日成本
    const { data: todayRecord } = await supabase
      .from("cost_records")
      .select("total_cost")
      .eq("company_id", companyId)
      .eq("record_date", today)
      .maybeSingle();

    // 昨日成本
    const { data: yesterdayRecord } = await supabase
      .from("cost_records")
      .select("total_cost")
      .eq("company_id", companyId)
      .eq("record_date", yesterday)
      .maybeSingle();

    // 本月累计
    const { data: monthRecords } = await supabase
      .from("cost_records")
      .select("total_cost, record_date")
      .eq("company_id", companyId)
      .gte("record_date", monthStart)
      .lte("record_date", monthEnd);

    const todayCost = todayRecord ? parseFloat(todayRecord.total_cost) : 0;
    const yesterdayCost = yesterdayRecord ? parseFloat(yesterdayRecord.total_cost) : 0;

    // 环比变化（除零时返回null）
    let changePercent: number | null = null;
    if (yesterdayCost > 0) {
      changePercent = Math.round(((todayCost - yesterdayCost) / yesterdayCost) * 1000) / 10;
    }

    // 本月累计与日均
    const monthTotal = (monthRecords || []).reduce((sum: number, r: { total_cost: string }) => {
      return sum + parseFloat(r.total_cost);
    }, 0);
    const monthDays = (monthRecords || []).length;
    const monthAvg = monthDays > 0 ? Math.round((monthTotal / monthDays) * 100) / 100 : 0;

    const stats = {
      today: todayCost,
      yesterday_change_percent: changePercent,
      month_total: Math.round(monthTotal * 100) / 100,
      month_avg: monthAvg,
    };

    return NextResponse.json({ records: records || [], stats });
  } catch (error) {
    console.error("获取成本记录失败:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 仅 manager+ 角色可创建成本记录
  if (auth.role === 'staff' || auth.role === 'personal_user') {
    return forbiddenResponse('无权创建成本记录');
  }

  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { record_date, total_cost, work_order_count, refund_count, note } = body;

    // companyId 从 auth 获取，防止伪造
    const company_id = auth.companyId;

    console.log('[cost-records POST]', { company_id, record_date, total_cost, role: auth.role });

    if (!record_date || total_cost === undefined || total_cost === null) {
      return NextResponse.json({ error: "缺少必填字段: record_date, total_cost" }, { status: 400 });
    }

    if (total_cost < 0) {
      return NextResponse.json({ error: "total_cost不能为负数" }, { status: 400 });
    }

    // UPSERT: 同一企业同一天只保留一条记录
    const { data: existingRecord, error: existingError } = await supabase
      .from("cost_records")
      .select("id, total_cost")
      .eq("company_id", company_id)
      .eq("record_date", record_date)
      .maybeSingle();

    if (existingError) {
      console.error('[cost-records POST] check existing error:', existingError);
    }

    let record;
    if (existingRecord) {
      // 更新已有记录
      const { data, error } = await supabase
        .from("cost_records")
        .update({
          total_cost: String(total_cost),
          work_order_count: work_order_count ?? null,
          refund_count: refund_count ?? null,
          note: note ?? null,
          created_by: auth.userId,
        })
        .eq("id", existingRecord.id)
        .select()
        .single();
      if (error) {
        console.error('[cost-records POST] update error:', error);
        throw error;
      }
      console.log('[cost-records POST] updated record:', data?.id);
      record = data;
    } else {
      // 插入新记录
      const { data, error } = await supabase
        .from("cost_records")
        .insert({
          company_id,
          record_date,
          total_cost: String(total_cost),
          work_order_count: work_order_count ?? null,
          refund_count: refund_count ?? null,
          note: note ?? null,
          created_by: auth.userId,
        })
        .select()
        .single();
      if (error) {
        console.error('[cost-records POST] insert error:', error);
        throw error;
      }
      console.log('[cost-records POST] inserted record:', data?.id);
      record = data;
    }

    // 查询昨日数据计算环比
    const yesterday = new Date(new Date(record_date).getTime() - 86400000)
      .toISOString()
      .split("T")[0];

    const { data: yesterdayData } = await supabase
      .from("cost_records")
      .select("total_cost")
      .eq("company_id", company_id)
      .eq("record_date", yesterday)
      .maybeSingle();

    const todayCost = parseFloat(String(total_cost));
    const yesterdayCost = yesterdayData ? parseFloat(yesterdayData.total_cost) : 0;

    let changePercent: number | null = null;
    if (yesterdayCost > 0) {
      changePercent = Math.round(((todayCost - yesterdayCost) / yesterdayCost) * 1000) / 10;
    }

    // 环比上涨≥30%时创建预警通知
    let alertTriggered = false;
    let alertMessage: string | null = null;

    if (changePercent !== null && changePercent >= ALERT_THRESHOLD) {
      alertTriggered = true;
      alertMessage = `⚠️ 今日售后赔付环比上涨${changePercent}%，请检查是否有大额安装赔付单`;

      // 检查是否已存在相同预警（防重复）
      const { data: existingAlert } = await supabase
        .from("notifications")
        .select("id")
        .eq("company_id", company_id)
        .eq("type", "cost_alert")
        .gte("created_at", new Date().toISOString().split("T")[0])
        .limit(1);

      if (!existingAlert || existingAlert.length === 0) {
        await supabase.from("notifications").insert({
          company_id,
          type: "cost_alert",
          title: "成本异常预警",
          content: alertMessage,
          is_read: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      record,
      alert_triggered: alertTriggered,
      change_percent: changePercent,
      alert_message: alertMessage,
    });
  } catch (error) {
    console.error("创建成本记录失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
