import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

// GET: 查询当前商家的配件图鉴 + platform 默认配件
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) return NextResponse.json({ error: '无企业信息' }, { status: 400 });

  const companyId = profile.company_id;

  // 查询 platform 默认 + 商家自己的
  const { data, error } = await supabase
    .from('accessory_gallery')
    .select('*')
    .in('company_id', [companyId, 'platform'])
    .eq('is_deleted', false)
    .order('is_default', { ascending: false })
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 商家自己的记录优先（同名覆盖 platform 默认）
  const seen = new Map<string, typeof data[0]>();
  for (const item of data) {
    const key = item.name;
    if (!seen.has(key) || item.company_id === companyId) {
      seen.set(key, item);
    }
  }

  // 查询商家删除的默认配件名列表
  const { data: deleted } = await supabase
    .from('accessory_gallery')
    .select('name')
    .eq('company_id', companyId)
    .eq('is_deleted', true);

  const deletedNames = new Set((deleted || []).map(d => d.name));

  const result = Array.from(seen.values()).filter(item => {
    // 过滤掉商家删除的 platform 默认配件
    if (item.company_id === 'platform' && deletedNames.has(item.name)) return false;
    return true;
  });

  return NextResponse.json({ data: result });
}

// POST: 添加配件或上传图片
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) return NextResponse.json({ error: '无企业信息' }, { status: 400 });

  const body = await request.json();
  const { name, image_url, id } = body;

  if (id) {
    // 更新已有配件（上传图片）
    const { data, error } = await supabase
      .from('accessory_gallery')
      .update({
        ...(image_url !== undefined && { image_url }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // 添加新配件
  if (!name) return NextResponse.json({ error: '配件名称必填' }, { status: 400 });

  const { data, error } = await supabase
    .from('accessory_gallery')
    .insert({
      company_id: profile.company_id,
      name,
      image_url: image_url || null,
      is_default: false,
      source: 'merchant',
      review_status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// PATCH: 更新配件（重命名等）
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) return NextResponse.json({ error: '无企业信息' }, { status: 400 });

  const body = await request.json();
  const { id, name, image_url } = body;
  if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (image_url !== undefined) updates.image_url = image_url;

  const { data, error } = await supabase
    .from('accessory_gallery')
    .update(updates)
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE: 软删除配件
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) return NextResponse.json({ error: '无企业信息' }, { status: 400 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });

  // 检查是商家自己的还是 platform 默认的
  const { data: item } = await supabase
    .from('accessory_gallery')
    .select('company_id, name, is_default')
    .eq('id', id)
    .single();

  if (!item) return NextResponse.json({ error: '配件不存在' }, { status: 404 });

  if (item.company_id === 'platform') {
    // platform 默认配件：商家标记为删除（插入一条 is_deleted=true 的记录）
    const { error } = await supabase
      .from('accessory_gallery')
      .insert({
        company_id: profile.company_id,
        name: item.name,
        is_default: false,
        source: 'merchant',
        is_deleted: true,
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // 商家自己的配件：直接软删除
    const { error } = await supabase
      .from('accessory_gallery')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', profile.company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
