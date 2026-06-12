/**
 * 预设课程种子数据
 * 使用方法：在 Supabase 中执行 SQL 或通过 API 导入
 * feishu_doc_url 使用 weiguanjia.com 域名指向飞书文档
 */

export interface SeedCourse {
  title: string;
  category: string;
  description: string;
  feishu_doc_url: string | null;
  is_preset: boolean;
}

export const SEED_COURSES: SeedCourse[] = [
  // ── 基础培训 ──
  {
    title: '卫浴基础知识',
    category: '基础培训',
    description: '卫浴产品分类、材质、工艺基础知识，新手必学',
    feishu_doc_url: 'https://weiguanjia.com/wiki/basics',
    is_preset: true,
  },
  {
    title: '客服入职第一天必读',
    category: '基础培训',
    description: '系统操作指南、工作流程、注意事项',
    feishu_doc_url: 'https://weiguanjia.com/wiki/onboarding-day1',
    is_preset: true,
  },
  {
    title: '卫浴行业术语手册',
    category: '基础培训',
    description: '坑距、虹吸、连体、壁挂等常见术语解释',
    feishu_doc_url: 'https://weiguanjia.com/wiki/glossary',
    is_preset: true,
  },

  // ── 产品知识 ──
  {
    title: '智能马桶安装条件与常见问题',
    category: '产品知识',
    description: '坑距、水压、电路等安装条件详解，安装问题话术',
    feishu_doc_url: 'https://weiguanjia.com/wiki/smart-toilet-install',
    is_preset: true,
  },
  {
    title: '花洒套装选购与故障排查',
    category: '产品知识',
    description: '恒温花洒、增压花洒区别，出水不畅/漏水排查话术',
    feishu_doc_url: 'https://weiguanjia.com/wiki/shower-guide',
    is_preset: true,
  },
  {
    title: '浴室柜材质与尺寸搭配',
    category: '产品知识',
    description: '实木/多层板/铝合金材质对比，尺寸测量与搭配建议',
    feishu_doc_url: 'https://weiguanjia.com/wiki/vanity-material',
    is_preset: true,
  },

  // ── 售前技能 ──
  {
    title: '售前咨询话术与促单技巧',
    category: '售前技能',
    description: '从咨询接待到促单成交的完整话术体系',
    feishu_doc_url: 'https://weiguanjia.com/wiki/presale-script',
    is_preset: true,
  },
  {
    title: '客户比价应对话术',
    category: '售前技能',
    description: '客户说"别人家更便宜"的标准应对方法',
    feishu_doc_url: 'https://weiguanjia.com/wiki/price-objection',
    is_preset: true,
  },

  // ── 售后技能 ──
  {
    title: '售后投诉处理流程与话术',
    category: '售后技能',
    description: '退换货、投诉、差评应对的标准流程与话术',
    feishu_doc_url: 'https://weiguanjia.com/wiki/aftersale-complaint',
    is_preset: true,
  },
  {
    title: '退换货判断链与赔偿标准',
    category: '售后技能',
    description: '7天/15天/超期退货判断，质量问题认定，赔偿尺度',
    feishu_doc_url: 'https://weiguanjia.com/wiki/return-policy',
    is_preset: true,
  },
  {
    title: '差评挽回与好评引导',
    category: '售后技能',
    description: '差评回复模板、电话回访话术、好评引导技巧',
    feishu_doc_url: 'https://weiguanjia.com/wiki/review-recovery',
    is_preset: true,
  },

  // ── 大促专题 ──
  {
    title: '618大促备战指南',
    category: '大促专题',
    description: '大促期间的值班安排、话术准备、应急处理',
    feishu_doc_url: 'https://weiguanjia.com/wiki/618-guide',
    is_preset: true,
  },
  {
    title: '双11客服作战手册',
    category: '大促专题',
    description: '双11流量高峰应对、并发处理、异常订单处理',
    feishu_doc_url: null, // 筹备中
    is_preset: true,
  },
];

/**
 * 生成 INSERT SQL 语句
 * 用于在 Supabase SQL Editor 中执行
 */
export function generateSeedSQL(): string {
  const values = SEED_COURSES.map((c) => {
    const url = c.feishu_doc_url ? `'${c.feishu_doc_url}'` : 'NULL';
    return `  ('${c.title}', '${c.category}', '${c.description}', ${url}, ${c.is_preset})`;
  }).join(',\n');

  return `INSERT INTO courses (title, category, description, feishu_doc_url, is_preset)
VALUES
${values}
ON CONFLICT DO NOTHING;`;
}
