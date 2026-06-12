import { getSupabaseClient } from "@/storage/database/supabase-client";

// 分类标签映射
const CATEGORY_LABELS: Record<string, string> = {
  product_params: "产品参数",
  install_guide: "安装说明",
  after_sales_policy: "售后政策",
  faq: "常见问题",
  other: "其他",
};

/**
 * 获取企业自定义知识并格式化为prompt片段
 * @param companyId 企业ID
 * @returns 格式化的知识库prompt片段，如果没有则返回空字符串
 */
export async function getCustomKnowledgePrompt(
  companyId: string
): Promise<string> {
  if (!companyId) return "";

  try {
    const supabase = getSupabaseClient();

    // 获取最多20条最近更新的活跃知识
    const { data, error } = await supabase
      .from("custom_knowledge")
      .select("id, title, content, category, updated_at")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      return "";
    }

    // 按分类分组
    const categorized: Record<string, { title: string; content: string }[]> =
      {};
    let totalChars = 0;
    const MAX_CHARS = 2000;

    for (const item of data) {
      // 超过字数限制时停止添加
      const itemChars = item.title.length + item.content.length;
      if (
        totalChars + itemChars > MAX_CHARS &&
        Object.keys(categorized).length > 0
      ) {
        break;
      }
      totalChars += itemChars;

      const catLabel =
        CATEGORY_LABELS[item.category] || item.category;
      if (!categorized[catLabel]) {
        categorized[catLabel] = [];
      }
      categorized[catLabel].push({
        title: item.title,
        content: item.content,
      });
    }

    // 构建prompt片段
    const sections: string[] = [];

    if (categorized["产品参数"] && categorized["产品参数"].length > 0) {
      const items = categorized["产品参数"]
        .map((item) => `- ${item.title}: ${item.content}`)
        .join("\n");
      sections.push(`【产品参数】\n${items}`);
    }

    if (categorized["安装说明"] && categorized["安装说明"].length > 0) {
      const items = categorized["安装说明"]
        .map((item) => `- ${item.title}: ${item.content}`)
        .join("\n");
      sections.push(`【安装说明】\n${items}`);
    }

    if (categorized["售后政策"] && categorized["售后政策"].length > 0) {
      const items = categorized["售后政策"]
        .map((item) => `- ${item.title}: ${item.content}`)
        .join("\n");
      sections.push(`【售后政策】\n${items}`);
    }

    if (categorized["常见问题"] && categorized["常见问题"].length > 0) {
      const items = categorized["常见问题"]
        .map((item) => `- ${item.title}: ${item.content}`)
        .join("\n");
      sections.push(`【常见问题】\n${items}`);
    }

    if (categorized["其他"] && categorized["其他"].length > 0) {
      const items = categorized["其他"]
        .map((item) => `- ${item.title}: ${item.content}`)
        .join("\n");
      sections.push(`【其他知识】\n${items}`);
    }

    if (sections.length === 0) {
      return "";
    }

    return `\n\n## 企业自定义知识库\n以下为客户上传的产品资料和专业知识，回答时请优先参考：\n\n${sections.join("\n\n")}\n`;
  } catch (error) {
    console.error("获取自定义知识失败:", error);
    return "";
  }
}
