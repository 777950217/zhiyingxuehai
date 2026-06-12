import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** POST /api/payment-orders/upload — 上传付款截图到 Supabase Storage */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    // 确保桶存在
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'payment-screenshots';
    const bucketExists = buckets?.some((b) => b.name === bucketName);

    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    // 生成文件路径
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) throw new Error(`上传失败: ${uploadErr.message}`);

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '上传失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
