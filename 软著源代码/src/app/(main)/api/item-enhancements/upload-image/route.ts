import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * POST /api/item-enhancements/upload-image
 * 上传示例图片到 Supabase Storage (bucket: training-images)
 *
 * FormData:
 *   - file: File (必填)
 *   - module_key: string (必填)
 *   - section_index: string (必填)
 *   - item_index: string (必填)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '未关联企业' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const moduleKey = formData.get('module_key') as string | null;
    const sectionIndex = formData.get('section_index') as string | null;
    const itemIndex = formData.get('item_index') as string | null;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    if (!moduleKey || sectionIndex === null || itemIndex === null) {
      return NextResponse.json({ error: '缺少参数: module_key, section_index, item_index' }, { status: 400 });
    }

    // Generate unique file path
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filePath = `${profile.company_id}/${moduleKey}/${sectionIndex}_${itemIndex}/${timestamp}_${randomSuffix}.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('training-images')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[item-enhancements/upload-image] Upload error:', uploadError.message);
      return NextResponse.json({ error: '上传失败: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('training-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl || '';

    return NextResponse.json({ url: publicUrl, path: filePath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[item-enhancements/upload-image] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
