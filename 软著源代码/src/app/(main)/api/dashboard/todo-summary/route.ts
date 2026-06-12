import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const OVERDUE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'staff';
    const now = new Date();

    // 待处理工单
    let workOrdersQuery = client
      .from('work_orders')
      .select('id, created_at, status, priority', { count: 'exact' })
      .neq('status', '已完成');

    if (companyId) {
      workOrdersQuery = workOrdersQuery.eq('company_id', companyId);
    }
    if ((role === 'staff' || role === 'personal_user') && userId) {
      workOrdersQuery = workOrdersQuery.eq('user_id', userId);
    }

    const { data: workOrders, count: pendingWorkOrders } = await workOrdersQuery;

    const overdueWorkOrders = (workOrders || []).filter((order: { created_at: string }) => {
      const createdAt = new Date(order.created_at);
      return now.getTime() - createdAt.getTime() > OVERDUE_THRESHOLD_MS;
    });

    // 未读平台规则
    let platformRulesQuery = client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'platform_rule')
      .eq('is_read', false);

    if (companyId) {
      platformRulesQuery = platformRulesQuery.eq('company_id', companyId);
    }
    const { count: unreadPlatformRules } = await platformRulesQuery;

    // 高优先级案例
    let highPriorityQuery = client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'daily_case')
      .eq('is_read', false)
      .eq('priority', 'high');

    if (companyId) {
      highPriorityQuery = highPriorityQuery.eq('company_id', companyId);
    }
    const { count: highPriorityCases } = await highPriorityQuery;

    // 未读审核通知
    let reviewsQuery = client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'review')
      .eq('is_read', false);

    if (companyId) {
      reviewsQuery = reviewsQuery.eq('company_id', companyId);
    }
    const { count: unreadReviews } = await reviewsQuery;

    // 今日成本是否已录入
    let dailyCostNotRecorded = false;
    if (companyId && ['admin', 'enterprise_admin', 'enterprise_manager'].includes(role)) {
      const today = now.toISOString().split('T')[0];
      const { count: costRecordCount } = await client
        .from('cost_records')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('record_date', today);
      dailyCostNotRecorded = (costRecordCount || 0) === 0;
    }

    const summary = {
      workOrders: { total: pendingWorkOrders || 0, overdue: overdueWorkOrders.length },
      platformRules: unreadPlatformRules || 0,
      highPriorityCases: highPriorityCases || 0,
      reviews: unreadReviews || 0,
      dailyCostNotRecorded,
      hasAnyTodo:
        (pendingWorkOrders || 0) > 0 ||
        (unreadPlatformRules || 0) > 0 ||
        (highPriorityCases || 0) > 0 ||
        (unreadReviews || 0) > 0 ||
        dailyCostNotRecorded,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('获取待办摘要失败:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
