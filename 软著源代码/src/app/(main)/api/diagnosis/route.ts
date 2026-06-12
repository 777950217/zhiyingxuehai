import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const keyword = searchParams.get('keyword');

  let query = client
    .from('scripts')
    .select('*', { count: 'exact' })
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (category) query = query.eq('category', category);
  if (keyword) {
    query = query.or(`phenomenon.ilike.%${keyword}%,diagnosis.ilike.%${keyword}%,solution.ilike.%${keyword}%,detail.ilike.%${keyword}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`查询诊断数据失败: ${error.message}`);

  return NextResponse.json({ data, total: count });
}
