const fs = require('fs');

// 官方 Supabase 连接信息
const SUPABASE_URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';

// 读取 SQL 文件
const sql = fs.readFileSync('/workspace/projects/create-all-missing-tables.sql', 'utf8');

// 分割 SQL 语句
const statements = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`总共 ${statements.length} 条 SQL 语句待执行\n`);

async function executeViaEdgeFunction() {
  // 方法1: 尝试使用 Supabase 的 SQL Editor API
  // 这需要先创建一个 edge function 来执行 SQL
  
  // 方法2: 使用 Supabase Management API
  // 但这需要不同的认证
  
  // 方法3: 直接用 REST API 创建表
  // Supabase REST API 不支持 DDL，但我们可以逐个创建表
  
  console.log('尝试直接连接 Supabase 数据库...\n');
  
  // 尝试不同的连接方式
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  // 先测试连接
  console.log('测试 Supabase API 连接...');
  const { data, error } = await supabase.from('companies').select('id').limit(1);
  
  if (error) {
    console.log('❌ API 连接失败:', error.message);
    return;
  }
  
  console.log('✅ API 连接成功！\n');
  
  // 获取当前表列表
  console.log('获取当前表列表...');
  const { data: tables, error: tableError } = await supabase.rpc('exec', {
    query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
  });
  
  if (tableError) {
    console.log('exec rpc 不可用，尝试其他方式...\n');
    
    // 尝试逐个检测表是否存在
    const tableNames = [
      'kpi_schemes', 'phrase_library', 'agents', 'work_orders', 
      'sop_templates', 'notifications', 'courses', 'payment_orders'
    ];
    
    console.log('检测现有表:');
    for (const table of tableNames) {
      const { error: tErr } = await supabase.from(table).select('id').limit(1);
      console.log(`  ${table}: ${tErr ? '❌ 不存在' : '✅ 存在'}`);
    }
  } else {
    console.log('当前表:', tables);
  }
}

executeViaEdgeFunction();
