const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';

async function main() {
  const supabase = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 查 users 表的 RLS 策略
  const { data: policies, error } = await supabase.rpc('get_policies', { table_name: 'users' });
  
  if (error) {
    // 如果没有 get_policies 函数，直接查 pg_policies
    const { data: pgPolicies, error: pgErr } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'users');
    
    if (pgErr) {
      console.error('查 RLS 失败:', pgErr);
      // 尝试用 raw SQL
      const { data: sqlData, error: sqlErr } = await supabase.rpc('exec_sql', {
        sql: `SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'users'`
      });
      if (sqlErr) {
        console.error('SQL 也失败:', sqlErr);
        return;
      }
      console.log('RLS 策略:', sqlData);
      return;
    }
    console.log('RLS 策略:', pgPolicies);
    return;
  }
  
  console.log('RLS 策略:', policies);
}

main().catch(console.error);
