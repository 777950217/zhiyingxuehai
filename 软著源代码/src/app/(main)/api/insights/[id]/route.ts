import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';

// PATCH /api/insights/[id] - 标记已读
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const client = getSupabaseClient();
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.is_read !== undefined) updateData.is_read = body.is_read;

  const { data, error } = await client
    .from('insight_notifications')
    .update(updateData)
    .eq('id', id)
    .eq('company_id', auth.companyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `更新洞察失败: ${error.message}` }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: '洞察不存在或无权限' }, { status: 404 });
  }

  return NextResponse.json({ insight: data });
}
