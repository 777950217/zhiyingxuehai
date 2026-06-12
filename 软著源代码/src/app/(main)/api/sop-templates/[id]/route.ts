import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** GET /api/sop-templates/[id] — single SOP detail */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sop_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PUT /api/sop-templates/[id] — update SOP */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, scenario, steps_json, role, needs_update, updated_by } = body;

    const supabase = getSupabaseClient();

    // Get current version
    const { data: current } = await supabase
      .from('sop_templates')
      .select('version')
      .eq('id', id)
      .single();

    const nextVersion = (current?.version || 1) + 1;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      version: nextVersion,
    };
    if (name !== undefined) updates.name = name;
    if (scenario !== undefined) updates.scenario = scenario;
    if (steps_json !== undefined) updates.steps_json = steps_json;
    if (role !== undefined) updates.role = role;
    if (needs_update !== undefined) updates.needs_update = needs_update;
    if (updated_by !== undefined) updates.updated_by = updated_by;

    const { data, error } = await supabase
      .from('sop_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Save version snapshot to localStorage (handled client-side)
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/sop-templates/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('sop_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
