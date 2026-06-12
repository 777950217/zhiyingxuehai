const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';

async function main() {
  const supabase = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 更新 users 表角色为 enterprise_manager
  const { error: updateErr } = await supabase
    .from('users')
    .update({ role: 'enterprise_manager' })
    .eq('email', '305858555@qq.com');

  if (updateErr) {
    console.error('更新 users 表失败:', updateErr);
    process.exit(1);
  }
  console.log('users 表角色已更新为 enterprise_manager');

  // 获取用户 ID
  const { data: userData, error: findErr } = await supabase
    .from('users')
    .select('id')
    .eq('email', '305858555@qq.com')
    .single();

  if (findErr || !userData) {
    console.error('找不到用户:', findErr);
    process.exit(1);
  }

  // 更新 auth.users 的 user_metadata
  const { error: authErr } = await supabase.auth.admin.updateUserById(userData.id, {
    user_metadata: { display_name: '内测主管', role: 'enterprise_manager' }
  });

  if (authErr) {
    console.error('更新 auth 失败:', authErr);
    process.exit(1);
  }
  console.log('auth.users 已更新，角色 enterprise_manager');

  // 确认结果
  const { data: confirm } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('id', userData.id)
    .single();
  console.log('最终状态:', confirm);
}

main().catch(console.error);
