import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/** GET /api/management-plan?user_id=xxx&company_id=xxx */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const companyId = searchParams.get("company_id");

  if (!userId || !companyId) {
    return NextResponse.json({ error: "缺少 user_id 或 company_id" }, { status: 400 });
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("management_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[management-plan GET]", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }

  return NextResponse.json({ data: data || null });
}

/** POST /api/management-plan  保存/更新方案 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, companyId, module, content, aiContent } = body;

  if (!userId || !companyId || !module) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  // 先查是否已有记录
  const { data: existing } = await supabase
    .from("management_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  // 模块字段映射
  const moduleFieldMap: Record<string, { contentField: string; aiField: string; completedField: string }> = {
    scripts: { contentField: "scripts_framework", aiField: "scripts_ai_optimized", completedField: "scripts_completed" },
    kpi: { contentField: "kpi_plan", aiField: "kpi_ai_optimized", completedField: "kpi_completed" },
    scheduling: { contentField: "scheduling_rules", aiField: "scheduling_ai_optimized", completedField: "scheduling_completed" },
    quality: { contentField: "quality_standards", aiField: "quality_ai_optimized", completedField: "quality_completed" },
    sop: { contentField: "sop_checklist", aiField: "sop_ai_optimized", completedField: "sop_completed" },
  };

  const mapping = moduleFieldMap[module];
  if (!mapping) {
    return NextResponse.json({ error: "未知模块" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    [mapping.contentField]: content ?? null,
    [mapping.completedField]: !!content && content.trim().length > 0,
    updated_at: new Date().toISOString(),
  };
  if (aiContent !== undefined) {
    updateData[mapping.aiField] = aiContent;
  }

  // 计算进度
  if (existing) {
    // 先获取当前数据
    const { data: current } = await supabase
      .from("management_plans")
      .select("*")
      .eq("id", existing.id)
      .single();

    if (current) {
      const fields = [
        current.scripts_framework,
        current.kpi_plan,
        current.scheduling_rules,
        current.quality_standards,
        current.sop_checklist,
      ];
      // 替换当前模块的内容后重新计算
      const moduleIndex = ["scripts", "kpi", "scheduling", "quality", "sop"].indexOf(module);
      if (moduleIndex >= 0) {
        fields[moduleIndex] = content;
      }
      const completedCount = fields.filter((f: string | null) => f && f.trim().length > 0).length;
      updateData.progress = Math.round((completedCount / 5) * 100);
    }

    const { error } = await supabase
      .from("management_plans")
      .update(updateData)
      .eq("id", existing.id);

    if (error) {
      console.error("[management-plan POST update]", error);
      return NextResponse.json({ error: "保存失败" }, { status: 500 });
    }
  } else {
    // 创建新记录
    const completedCount = content && content.trim().length > 0 ? 1 : 0;
    const newData = {
      user_id: userId,
      company_id: companyId,
      ...updateData,
      progress: Math.round((completedCount / 5) * 100),
    };
    const { error } = await supabase.from("management_plans").insert(newData);
    if (error) {
      console.error("[management-plan POST insert]", error);
      return NextResponse.json({ error: "创建失败" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

/** PATCH /api/management-plan  生成方案文档 / 标记毕业 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, companyId, action, generatedDoc } = body;

  if (!userId || !companyId) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  const { data: existing } = await supabase
    .from("management_plans")
    .select("id, progress")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "方案不存在" }, { status: 404 });
  }

  if (action === "generate_doc") {
    if (existing.progress < 100) {
      return NextResponse.json({ error: "请先完成所有5个模块" }, { status: 400 });
    }
    const { error } = await supabase
      .from("management_plans")
      .update({
        generated_doc: generatedDoc,
        is_graduated: true,
        graduated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[management-plan PATCH generate_doc]", error);
      return NextResponse.json({ error: "操作失败" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
