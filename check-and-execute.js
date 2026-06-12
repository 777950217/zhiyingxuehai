// 使用 Supabase 的 SQL 执行方式
const fs = require('fs');

const SUPABASE_URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';

const sql = fs.readFileSync('/workspace/projects/create-all-missing-tables.sql', 'utf8');

// 分割 SQL 语句
const statements = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function main() {
  // 尝试使用 fetch 直接调用 Supabase 的 Postgres API
  // Supabase 暴露了 PostgREST API，但不支持 DDL
  
  // 尝试使用 Supabase 内置的 SQL 执行端点
  // Dashboard 使用的是 /api/sql 端点，但这需要特殊的认证
  
  // 唯一可行的方式是通过 Dashboard 手动执行
  console.log('===========================================');
  console.log('Supabase REST API 不支持执行 DDL 语句');
  console.log('请手动在 Dashboard 执行 SQL 脚本：');
  console.log('===========================================\n');
  console.log('1. 打开: https://supabase.com/dashboard/project/ojolpkzgeivgbokotaap/sql/new');
  console.log('2. 粘贴文件内容: /workspace/projects/create-all-missing-tables.sql');
  console.log('3. 点击 Run 执行\n');
  
  // 或者尝试生成一个可以直接用 curl 执行的方案
  // Supabase 的 SQL Editor 实际上是通过内部 API 执行的
  
  // 让我们尝试另一种方式：创建一个存储过程来执行动态 SQL
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  // 先尝试创建一个执行动态 SQL 的函数
  console.log('尝试创建动态 SQL 执行函数...\n');
  
  // 这个需要 DDL 权限，通常也做不到
  // 但我们可以检查 Supabase 是否有可用的 pg_net 或其他扩展
  
  // 检查数据库连接状态
  const { data: healthCheck, error: healthError } = await supabase
    .from('companies')
    .select('count', { count: 'exact', head: true });
    
  if (healthError) {
    console.log('❌ 数据库连接异常:', healthError.message);
  } else {
    console.log('✅ 数据库连接正常，companies 表可访问');
  }
  
  // 输出需要在 Dashboard 执行的 SQL
  console.log('\n===========================================');
  console.log('请在 Supabase Dashboard 手动执行建表脚本');
  console.log('===========================================');
}

main();
