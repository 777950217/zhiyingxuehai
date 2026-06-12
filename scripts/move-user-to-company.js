// 把 305858555@qq.com 移到 1052087287@qq.com 的公司旗下
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';

async function main() {
  const supabase = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. 找到 1052087287@qq.com 的 company_id
  const { data: adminUser, error: adminErr } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('email', '1052087287@qq.com')
    .single();

  if (adminErr || !adminUser) {
    console.error('找不到 1052087287@qq.com:', adminErr);
    process.exit(1);
  }
  const targetCompanyId = adminUser.company_id;
  console.log('目标公司ID:', targetCompanyId);

  // 2. 找到 305858555@qq.com 的用户
  const { data: targetUser, error: targetErr } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('email', '305858555@qq.com')
    .single();

  if (targetErr || !targetUser) {
    console.error('找不到 305858555@qq.com:', targetErr);
    process.exit(1);
  }
  console.log('目标用户:', targetUser);

  // 3. 更新 users 表
  const { error: updateErr } = await supabase
    .from('users')
    .update({ company_id: targetCompanyId, role: 'staff' })
    .eq('id', targetUser.id);

  if (updateErr) {
    console.error('更新 users 表失败:', updateErr);
    process.exit(1);
  }
  console.log('users 表已更新');

  // 4. 更新 auth.users 的 user_metadata
  const { error: authErr } = await supabase.auth.admin.updateUserById(targetUser.id, {
    user_metadata: { display_name: '客服', role: 'staff', company_id: targetCompanyId }
  });

  if (authErr) {
    console.error('更新 auth 失败:', authErr);
    process.exit(1);
  }
  console.log('auth.users 已更新，company_id 已改为', targetCompanyId);

  // 5. 确认结果
  const { data: confirm } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('id', targetUser.id)
    .single();
  console.log('更新后:', confirm);
}

main().catch(console.error);
