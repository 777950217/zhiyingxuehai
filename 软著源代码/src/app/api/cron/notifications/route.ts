import { NextRequest, NextResponse } from 'next/server';
import { SearchClient } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const CRON_SECRET = 'wgy-cron-2024';

// 每种类型每天最多推送条数
const MAX_PER_TYPE = 5;
// 搜索词匹配最大条数（多搜多筛，保证够量）
const SEARCH_COUNT = 10;

// 搜索查询模板
const SEARCH_QUERIES: Record<string, { queries: string[]; titlePrefix: string }> = {
  industry_trend: {
    queries: [
      '卫浴行业 最新动态 2026',
      '智能马桶 电商 运营 经验',
      '卫浴商家 店铺 运营技巧',
    ],
    titlePrefix: '行业趋势',
  },
  platform_rule: {
    queries: [
      '淘宝天猫 规则变更 商家 2026',
      '京东 拼多多 售后规则 更新',
      '抖音电商 新规 商家须知',
    ],
    titlePrefix: '规则变动',
  },
};

// 低质量标题过滤
const TITLE_BLACKLIST = [
  '十大品牌', '品牌排行', '品牌排名', '10大品牌', '排行榜',
  '黑猫投诉', '投诉维权', '消费者投诉',
  '加盟', '招商', '代理', '转让',
  '.docx', '.pdf', '.pptx',
  '模板范文', '行业报告.doc', '下载',
  '专利授权', '专利申请', '外观设计专利', '实用新型专利',
  '侵害商标权', '纠纷案', '开庭', '法院',
  '行业资讯_', '学习中心', '规则中心', '网站地图',
];

function isQualityTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return !TITLE_BLACKLIST.some(kw => lower.includes(kw.toLowerCase()));
}

// 标题相似度去重：提取核心关键词比较
function isSimilarToExisting(title: string, existing: Array<{ title: string }>): boolean {
  const extractKeywords = (s: string) =>
    s.replace(/[《》""''【】\s，。！？、：；]/g, '')
     .replace(/^(4月|5月|3月)\d+日起?/, '')  // 去掉日期前缀
     .slice(0, 30);
  const normalized = extractKeywords(title);
  return existing.some(e => {
    const eNorm = extractKeywords(e.title);
    // 包含关系
    if (eNorm.includes(normalized) || normalized.includes(eNorm)) return true;
    // 关键词重叠：拆成4字片段，重叠>60%视为重复
    if (normalized.length >= 6 && eNorm.length >= 6) {
      const segs = new Set<string>();
      for (let i = 0; i <= normalized.length - 4; i++) segs.add(normalized.slice(i, i + 4));
      let overlap = 0;
      for (let i = 0; i <= eNorm.length - 4; i++) {
        if (segs.has(eNorm.slice(i, i + 4))) overlap++;
      }
      const ratio = overlap / Math.min(segs.size, eNorm.length - 3);
      if (ratio > 0.5) return true;
    }
    return false;
  });
}

// 判断文章发布时间是否在7天内
function isRecent(publishTime: string | null | undefined): boolean {
  if (!publishTime) return true;
  try {
    const pubDate = new Date(publishTime);
    const now = new Date();
    const diffDays = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  } catch {
    return true;
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type') as 'industry_trend' | 'platform_rule' | 'all' | null;
  const typesToProcess = type && type !== 'all' ? [type] : ['industry_trend', 'platform_rule'] as const;

  const results: Record<string, unknown> = {};

  try {
    const supabase = getSupabaseClient();

    // 获取所有活跃企业
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('status', 'active');

    if (companyError || !companies || companies.length === 0) {
      return NextResponse.json({ error: 'No active companies found' }, { status: 500 });
    }

    const searchClient = new SearchClient();

    for (const notifyType of typesToProcess) {
      const config = SEARCH_QUERIES[notifyType];
      if (!config) continue;

      // ① 先清理该类型超过1天的旧通知（每天只保留当天的）
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('type', notifyType)
        .lt('created_at', yesterday.toISOString());

      if (deleteError) {
        console.error(`[cron] 清理旧${notifyType}通知失败:`, deleteError);
      }

      // ② 搜索最新内容，收集高质量结果
      const candidates: Array<{ title: string; content: string }> = [];

      for (const query of config.queries) {
        if (candidates.length >= MAX_PER_TYPE) break;
        try {
          const searchResult = await searchClient.webSearch(query, SEARCH_COUNT);
          const items = searchResult?.web_items || [];

          for (const item of items) {
            if (candidates.length >= MAX_PER_TYPE) break;
            if (!item.title || !item.snippet) continue;
            if (!isQualityTitle(item.title)) continue;
            if (!isRecent(item.publish_time)) continue;
            // 去重：标题不重复（精确匹配 + 相似度匹配）
            if (candidates.some(c => c.title === item.title)) continue;
            if (isSimilarToExisting(item.title, candidates)) continue;

            const source = item.site_name || '网络资讯';
            const pubTime = item.publish_time
              ? new Date(item.publish_time).toLocaleDateString('zh-CN')
              : new Date().toLocaleDateString('zh-CN');
            const content = `来源：${source} | ${pubTime}<br/><br/>${item.snippet}<br/><br/><a href="${item.url || '#'}" target="_blank" rel="noopener" style="color:#f97316;">查看原文 →</a>`;

            candidates.push({ title: item.title, content });
          }
        } catch (searchErr) {
          console.error(`[cron] 搜索失败 "${query}":`, searchErr);
        }
      }

      // ③ 为每个企业插入当天的通知（按company_id+title去重）
      let totalInserted = 0;
      for (const candidate of candidates) {
        for (const company of companies) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('title', candidate.title)
            .eq('type', notifyType)
            .eq('company_id', company.id)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error: insertError } = await supabase
            .from('notifications')
            .insert({
              user_id: null,
              company_id: company.id,
              type: notifyType,
              title: candidate.title,
              content: candidate.content,
              is_read: false,
            });

          if (!insertError) totalInserted++;
        }
      }

      results[notifyType] = {
        candidates: candidates.length,
        inserted: totalInserted,
        companies: companies.length,
        cleanedBefore: yesterday.toISOString().split('T')[0],
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err) {
    console.error('[cron] Notifications cron failed:', err);
    return NextResponse.json(
      { error: 'Cron job failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
