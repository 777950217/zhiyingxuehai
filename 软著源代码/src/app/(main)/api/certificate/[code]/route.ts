import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// GET /api/certificate/[code] — 公开验证证书（无需登录）
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ valid: false, error: "缺少证书编号" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("certificate_code, user_name, completed_at, created_at")
      .eq("certificate_code", code)
      .single();

    if (error || !data) {
      return NextResponse.json({
        valid: false,
        error: "证书编号无效，请核实后重试",
      });
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        code: data.certificate_code,
        userName: data.user_name,
        completedAt: data.completed_at,
        issuedAt: data.created_at,
        issuedBy: "职盈学海",
      },
    });
  } catch (err) {
    console.error("证书验证错误:", err);
    return NextResponse.json({ valid: false, error: "服务器错误" }, { status: 500 });
  }
}
