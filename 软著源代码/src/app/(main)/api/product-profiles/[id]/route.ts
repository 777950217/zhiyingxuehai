import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { updated_at: clientUpdatedAt, user_id, company_id, ...fields } = body;
    const supabase = getSupabaseClient();

    // Optimistic lock: check updated_at if provided
    if (clientUpdatedAt) {
      const { data: existing } = await supabase
        .from('product_profiles')
        .select('updated_at')
        .eq('id', id)
        .single();
      if (existing && existing.updated_at && existing.updated_at !== clientUpdatedAt) {
        return NextResponse.json(
          { error: '数据已被修改，请刷新后重试', code: 'CONFLICT' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('product_profiles')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Audit log
    await logAction({
      userId: user_id || 'unknown',
      companyId: company_id || data?.company_id,
      action: AuditAction.UPDATE,
      resourceType: ResourceType.PRODUCT_PROFILE,
      resourceId: id,
      detail: { updated_fields: Object.keys(fields) },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[product-profiles] PATCH error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'unknown';
    const companyId = searchParams.get('company_id');
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('product_profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;

    // Audit log
    await logAction({
      userId,
      companyId: companyId || undefined,
      action: AuditAction.DELETE,
      resourceType: ResourceType.PRODUCT_PROFILE,
      resourceId: id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[product-profiles] DELETE error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
