const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';

async function main() {
  const supabase = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 查 1052087287 的公司
  const { data: adminUser } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('email', '1052087287@qq.com')
    .single();
  console.log('1052087287:', adminUser);

  // 查这个公司的信息
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', adminUser?.company_id)
    .single();
  console.log('公司信息:', company);

  // 查这个公司下的所有用户
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, display_name, role, status, company_id')
    .eq('company_id', adminUser?.company_id);
  console.log('公司下所有用户:', allUsers);
}

main().catch(console.error);
