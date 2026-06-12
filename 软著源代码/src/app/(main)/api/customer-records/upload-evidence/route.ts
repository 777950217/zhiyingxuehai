import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

/** POST /api/customer-records/upload-evidence — 上传售后凭证到 Supabase Storage */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '无企业信息' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    // 文件大小校验
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 视频50MB / 图片10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: `${isVideo ? '视频' : '图片'}文件不能超过${isVideo ? '50' : '10'}MB` }, { status: 400 });
    }

    // 确保桶存在
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'evidence-files';
    const bucketExists = buckets?.some((b) => b.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const folder = isVideo ? 'videos' : 'images';
    const filePath = `${profile.company_id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) throw new Error(`上传失败: ${uploadErr.message}`);

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: urlData.publicUrl, type: isVideo ? 'video' : 'image' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '上传失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
