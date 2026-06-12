import { getSupabaseClient } from "@/storage/database/supabase-client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "缺少companyId参数" }, { status: 400 });
  }

  try {
    const { data: alerts, error } = await supabase
      .from("notifications")
      .select("id, title, content, is_read, created_at")
      .eq("company_id", companyId)
      .eq("type", "cost_alert")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error) {
    console.error("获取成本预警记录失败:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}
