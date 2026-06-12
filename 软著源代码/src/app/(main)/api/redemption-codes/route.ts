import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** GET /api/redemption-codes — list all codes (admin only) */
export async function GET(request: NextRequest) {
  const adminId = request.headers.get('x-admin-id');
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  const supabase = getSupabaseClient();
  const { data: admin } = await supabase
    .from('users')
    .select('role')
    .eq('id', adminId)
    .single();

  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
  const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
  const filter = request.nextUrl.searchParams.get('filter') || 'all'; // all | used | unused

  let query = supabase
    .from('redemption_codes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filter === 'used') query = query.eq('is_used', true);
  if (filter === 'unused') query = query.eq('is_used', false);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data, total: count, page, pageSize });
}

/** POST /api/redemption-codes — batch generate codes (admin only) */
export async function POST(request: NextRequest) {
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

  const body = await request.json() as {
    count: number;
    planType: string;
    expiresInDays?: number;
  };

  const { count: numCodes, planType = 'personal_user', expiresInDays } = body;

  if (!numCodes || numCodes < 1 || numCodes > 100) {
    return NextResponse.json({ error: 'count must be between 1 and 100' }, { status: 400 });
  }

  // Generate codes
  const codes: string[] = [];
  const records: { code: string; plan_type: string; created_by: string; expires_at: string | null }[] = [];

  for (let i = 0; i < numCodes; i++) {
    const code = generateCode();
    codes.push(code);
    records.push({
      code,
      plan_type: planType,
      created_by: adminId,
      expires_at: expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
    });
  }

  const { data, error } = await supabase
    .from('redemption_codes')
    .insert(records)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data, generated: codes });
}

/** Generate a random code: ZY + 8 alphanumeric chars */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ZY';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
