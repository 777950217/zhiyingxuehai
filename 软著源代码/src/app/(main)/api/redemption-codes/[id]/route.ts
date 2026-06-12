import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** DELETE /api/redemption-codes/[id] — delete a code (admin only) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminId = request.headers.get('x-admin-id');
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseClient();

  // Verify admin role
  const { data: admin } = await supabase
    .from('users')
    .select('role')
    .eq('id', adminId)
    .single();

  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only allow deleting unused codes
  const { data: code } = await supabase
    .from('redemption_codes')
    .select('is_used')
    .eq('id', id)
    .single();

  if (!code) {
    return NextResponse.json({ error: 'Code not found' }, { status: 404 });
  }

  if (code.is_used) {
    return NextResponse.json({ error: 'Cannot delete used code' }, { status: 400 });
  }

  const { error } = await supabase
    .from('redemption_codes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
