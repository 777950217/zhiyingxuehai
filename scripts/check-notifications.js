import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://br-tidy-erne-pidottiag-119782-uw.br-b-1.vtcdb.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZHV0LWVybmUtZV9waWRvdHRpYWctMTE5NzgyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjQ4MDAsImV4cCI6MjA2NDM0MDgwMH0.EjOYG7gRoPm8S7NE8WYeCs397J3a62Aq2JFRowsJyk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotifications() {
  console.log('检查 notifications 表中的 platform_rule 通知...\n');

  // 检查是否有 platform_rule 类型的通知
  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('type', 'platform_rule')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('查询失败:', error);
    return;
  }

  console.log(`找到 ${count} 条 platform_rule 通知\n`);

  if (data && data.length > 0) {
    console.log('最近的 10 条通知:');
    data.forEach((n, i) => {
      console.log(`\n[${i + 1}] ID: ${n.id}`);
      console.log(`    标题: ${n.title}`);
      console.log(`    企业ID: ${n.company_id || '广播'}`);
      console.log(`    已读: ${n.is_read}`);
      console.log(`    创建时间: ${n.created_at}`);
    });
  } else {
    console.log('暂无 platform_rule 通知。说明 cron 任务可能还未运行过，或通知已被清理。');
  }

  // also check all notification types
  console.log('\n\n所有通知类型统计:');
  const { data: allTypes, error: allError } = await supabase
    .from('notifications')
    .select('type')
    .limit(1000);

  if (allError) {
    console.error('统计失败:', allError);
    return;
  }

  if (allTypes) {
    const stats = {};
    allTypes.forEach(n => {
      stats[n.type] = (stats[n.type] || 0) + 1;
    });
    Object.entries(stats).forEach(([type, cnt]) => {
      console.log(`  ${type}: ${cnt} 条`);
    });
  }
}

checkNotifications().catch(console.error);
