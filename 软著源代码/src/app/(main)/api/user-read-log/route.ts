import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const item_type = searchParams.get('item_type');

    if (!user_id) {
      return NextResponse.json({ error: 'user_id必填' }, { status: 400 });
    }

    let query = supabase
      .from('user_read_log')
      .select('item_id, item_type, read_at')
      .eq('user_id', user_id);

    if (item_type) {
      query = query.eq('item_type', item_type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const body = await req.json();
    const { user_id, item_type, item_id } = body;

    if (!user_id || !item_type || !item_id) {
      return NextResponse.json({ error: 'user_id、item_type和item_id必填' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_read_log')
      .upsert(
        { user_id, item_type, item_id },
        { onConflict: 'user_id,item_type,item_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 批量标记已读
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const body = await req.json();
    const { user_id, item_type, item_ids } = body as {
      user_id: string;
      item_type: string;
      item_ids: string[];
    };

    if (!user_id || !item_type || !Array.isArray(item_ids)) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const rows = item_ids.map((id: string) => ({
      user_id,
      item_type,
      item_id: id,
    }));

    const { error } = await supabase
      .from('user_read_log')
      .upsert(rows, { onConflict: 'user_id,item_type,item_id' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
