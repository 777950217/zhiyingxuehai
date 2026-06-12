import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// GET /api/certificate?action=generate — 生成/获取证书（需登录）
// GET /api/certificate/[code] — 验证证书（公开）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "generate") {
    return handleGenerate(request);
  }

  return NextResponse.json({ error: "无效操作" }, { status: 400 });
}

// POST /api/certificate — 保存证书记录
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { certificateCode, userName, completedAt } = body;

    if (!certificateCode || !userName || !completedAt) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 检查是否已有证书记录
    const { data: existing } = await supabase
      .from("certificates")
      .select("id, certificate_code")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ certificate: existing });
    }

    // 插入证书记录
    const { data, error } = await supabase
      .from("certificates")
      .insert({
        user_id: user.id,
        certificate_code: certificateCode,
        user_name: userName,
        completed_at: completedAt,
      })
      .select()
      .single();

    if (error) {
      console.error("保存证书失败:", error);
      return NextResponse.json({ error: "保存证书失败" }, { status: 500 });
    }

    return NextResponse.json({ certificate: data });
  } catch (err) {
    console.error("证书API错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

async function handleGenerate(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 获取用户信息
    const { data: userData } = await supabase
      .from("users")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 检查是否已有证书
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingCert) {
      return NextResponse.json({ certificate: existingCert });
    }

    // 检查是否完成全部25节课
    const { data: progressList } = await supabase
      .from("user_course_progress")
      .select("lesson_id, status")
      .eq("user_id", user.id)
      .eq("status", "completed");

    const completedCount = progressList?.length ?? 0;
    if (completedCount < 25) {
      return NextResponse.json({
        eligible: false,
        completedCount,
        totalRequired: 25,
      });
    }

    // 获取最后完成时间
    const { data: lastProgress } = await supabase
      .from("user_course_progress")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    const completedAt = lastProgress?.completed_at ?? new Date().toISOString();

    // 生成证书编号：GWXS-YYYYMMDD-XXXXX
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const seq = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
    const certificateCode = `GWXS-${dateStr}-${seq}`;

    // 保存证书
    const { data: certData, error: certError } = await supabase
      .from("certificates")
      .insert({
        user_id: user.id,
        certificate_code: certificateCode,
        user_name: userData.display_name || "学员",
        completed_at: completedAt,
      })
      .select()
      .single();

    if (certError) {
      console.error("生成证书失败:", certError);
      return NextResponse.json({ error: "生成证书失败" }, { status: 500 });
    }

    return NextResponse.json({ eligible: true, certificate: certData });
  } catch (err) {
    console.error("生成证书API错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
