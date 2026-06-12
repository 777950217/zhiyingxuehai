import { getSupabaseClient, getSupabaseServiceRoleKey, getSupabaseCredentials } from '@/storage/database/supabase-client';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 不能删除自己
    if (id === adminId) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 验证当前用户是admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: '无权限执行此操作' }, { status: 403 });
    }

    // 删除相关数据（按外键依赖顺序，先删引用users的子表）

    // 1. user_industry_profiles
    const { error: indProfError } = await supabase
      .from('user_industry_profiles')
      .delete()
      .eq('user_id', id);
    if (indProfError) console.error('删除行业档案失败:', indProfError);

    // 2. certificates
    const { error: certError } = await supabase
      .from('certificates')
      .delete()
      .eq('user_id', id);
    if (certError) console.error('删除证书失败:', certError);

    // 3. business_records
    const { error: bizError } = await supabase
      .from('business_records')
      .delete()
      .eq('user_id', id);
    if (bizError) console.error('删除业务记录失败:', bizError);

    // 4. work_orders
    const { error: woError } = await supabase
      .from('work_orders')
      .delete()
      .eq('user_id', id);
    if (woError) console.error('删除工单失败:', woError);

    // 5. cost_records (created_by)
    const { error: costError } = await supabase
      .from('cost_records')
      .delete()
      .eq('created_by', id);
    if (costError) console.error('删除成本记录失败:', costError);

    // 6. custom_knowledge (created_by)
    const { error: ckError } = await supabase
      .from('custom_knowledge')
      .delete()
      .eq('created_by', id);
    if (ckError) console.error('删除自定义知识失败:', ckError);

    // 7. 释放该用户的兑换码
    const { error: redemptionError } = await supabase
      .from('redemption_codes')
      .update({ used_by: null, is_used: false, used_at: null })
      .eq('used_by', id);
    if (redemptionError) console.error('释放兑换码失败:', redemptionError);

    // 8. 删除该用户的付款订单
    const { error: ordersError } = await supabase
      .from('payment_orders')
      .delete()
      .eq('user_id', id);
    if (ordersError) console.error('删除付款订单失败:', ordersError);

    // 9. 删除该用户的AI使用记录
    const { error: usageError } = await supabase
      .from('ai_usage_daily')
      .delete()
      .eq('user_id', id);
    if (usageError) console.error('删除AI使用记录失败:', usageError);

    // 10. 删除用户profile（如果存在）
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (profileError) console.error('删除profile失败:', profileError);

    // 11. 删除users表记录
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (userError) {
      console.error('删除用户失败:', userError);
      throw userError;
    }

    // 12. 尝试删除auth.users（需要service_role key）
    const serviceRoleKey = getSupabaseServiceRoleKey();
    const credentials = getSupabaseCredentials();
    if (serviceRoleKey && credentials) {
      try {
        const adminClient = createClient(credentials.url, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await adminClient.auth.admin.deleteUser(id);
      } catch (authErr) {
        console.error('删除auth用户失败(非致命):', authErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('删除用户失败:', err);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
