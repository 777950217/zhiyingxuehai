import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest } from '@/lib/api-auth';

// GET: 查询行业知识库（公开，支持分类/搜索/分页）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);
    const offset = (page - 1) * pageSize;

    const supabase = await getSupabaseClient();

    let query = supabase
      .from('industry_knowledge')
      .select('id, source_user_id, source_company_id, category, title, content, tags, usage_count, like_count, status, created_at', { count: 'exact' })
      .eq('status', 'approved')
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: `查询失败: ${error.message}` }, { status: 500 });
    }

    // 获取贡献排行榜TOP10
    const { data: topContributors } = await supabase
      .from('industry_knowledge')
      .select('source_user_id')
      .eq('status', 'approved');

    const contributorMap: Record<string, number> = {};
    (topContributors || []).forEach((r: { source_user_id: string }) => {
      contributorMap[r.source_user_id] = (contributorMap[r.source_user_id] || 0) + 1;
    });
    const leaderboard = Object.entries(contributorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ user_id: userId, contribution_count: count, display_name: '' as string }));

    // 如果有用户信息，补充用户名
    if (leaderboard.length > 0) {
      const userIds = leaderboard.map(l => l.user_id);
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', userIds);

      const userMap: Record<string, string> = {};
      (users || []).forEach((u: { id: string; display_name: string }) => {
        userMap[u.id] = u.display_name;
      });
      leaderboard.forEach(l => {
        const name = userMap[l.user_id] || '匿名';
        // 脱敏：只显示首字
        l.display_name = name.length > 1 ? name[0] + '**' : name;
      });
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      leaderboard,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[industry-knowledge GET] Error:', message);
    return NextResponse.json({ error: `查询失败: ${message}` }, { status: 500 });
  }
}

// POST: 贡献内容到行业知识库（需登录）
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { category, title, content, tags } = body;

    if (!category || !title || !content) {
      return NextResponse.json({ error: '分类、标题和内容不能为空' }, { status: 400 });
    }

    // 自动脱敏：移除公司名/人名模式
    const sanitizedContent = content
      .replace(/[某][某科技有限公司有限公司]+/g, '某企业')
      .replace(/(张|李|王|赵|刘|陈|杨|黄|吴|周|徐|孙|朱|马|胡|郭|林|何|高|罗|郑|梁|谢|宋|唐|韩|邓|冯|曹|彭|曾|肖|田|董|潘|袁|蒋|蔡|余|于|杜|叶|程|魏|苏|吕|丁|任|卢|姚|沈|钟|姜|崔|谭|陆|范|汪|廖|石|金|贾|夏|韦|付|方|邹|熊|白|孟|秦|邱|侯|江|尹|薛|闫|雷|龙|段|郝|孔|邵|史|毛|常|万|顾|赖|武|康|贺|严|尚|钱|覃|尹|武|戴|莫)[^\s，。！？、；：""''（）\[\]]{1,3}/g, '某员工');

    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('industry_knowledge')
      .insert({
        source_user_id: auth.userId!,
        source_company_id: auth.companyId || null,
        category,
        title,
        content: sanitizedContent,
        tags: tags || [],
        status: 'approved',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `贡献失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[industry-knowledge POST] Error:', message);
    return NextResponse.json({ error: `贡献失败: ${message}` }, { status: 500 });
  }
}
