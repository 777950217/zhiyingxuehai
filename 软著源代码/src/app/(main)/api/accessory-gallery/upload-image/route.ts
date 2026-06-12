import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

// POST: 上传配件图片到 Supabase Storage 并更新配件记录
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) return NextResponse.json({ error: '无企业信息' }, { status: 400 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const accessoryId = formData.get('accessoryId') as string | null;
  if (!file) return NextResponse.json({ error: '未选择文件' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `accessories/${user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('training-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from('training-images').getPublicUrl(fileName);
  const imageUrl = urlData.publicUrl;

  // 如果有 accessoryId，更新配件记录的 image_url
  if (accessoryId) {
    const { error: updateError } = await supabase
      .from('accessory_gallery')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', accessoryId)
      .eq('company_id', profile.company_id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: imageUrl });
}
