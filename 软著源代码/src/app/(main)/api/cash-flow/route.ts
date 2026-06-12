import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/cash-flow?companyId=xxx&yearMonth=2026-05
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const yearMonth = searchParams.get('yearMonth'); // e.g. '2026-05'

  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();

    // Fetch cash flow records
    let recordsQuery = supabase
      .from('cash_flow_records')
      .select('*')
      .eq('company_id', companyId)
      .order('record_date', { ascending: false });

    if (yearMonth) {
      const startDate = `${yearMonth}-01`;
      const [y, m] = yearMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().slice(0, 10);
      recordsQuery = recordsQuery.gte('record_date', startDate).lte('record_date', endDate);
    }

    const { data: records, error: recordsError } = await recordsQuery;
    if (recordsError) throw recordsError;

    // Fetch monthly totals
    let totalsQuery = supabase
      .from('monthly_totals')
      .select('*')
      .eq('company_id', companyId);

    if (yearMonth) {
      totalsQuery = totalsQuery.eq('year_month', yearMonth);
    }

    const { data: totals, error: totalsError } = await totalsQuery;
    if (totalsError) throw totalsError;

    // Compute monthly summary from records
    const monthlySummary: Record<string, { income: number; expense: number; records: typeof records }> = {};
    for (const r of records ?? []) {
      const ym = (r.record_date as string).slice(0, 7);
      if (!monthlySummary[ym]) monthlySummary[ym] = { income: 0, expense: 0, records: [] };
      if (r.type === 'income') monthlySummary[ym].income += Number(r.amount);
      else monthlySummary[ym].expense += Number(r.amount);
      monthlySummary[ym].records.push(r);
    }

    return NextResponse.json({
      records: records ?? [],
      totals: totals ?? [],
      monthlySummary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/cash-flow — Create a cash flow record or monthly total
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { action, companyId, record, monthlyTotal } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    if (action === 'add-record') {
      if (!record?.category || !record?.amount || !record?.type) {
        return NextResponse.json({ error: 'category, amount, type required' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('cash_flow_records')
        .insert({
          company_id: companyId,
          category: record.category,
          amount: record.amount,
          type: record.type,
          record_date: record.recordDate || new Date().toISOString().slice(0, 10),
          note: record.note || null,
          created_by: record.createdBy || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'delete-record') {
      const { recordId } = body;
      if (!recordId) {
        return NextResponse.json({ error: 'recordId required' }, { status: 400 });
      }
      const { error } = await supabase
        .from('cash_flow_records')
        .delete()
        .eq('id', recordId)
        .eq('company_id', companyId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'save-monthly-total') {
      if (!monthlyTotal?.yearMonth) {
        return NextResponse.json({ error: 'yearMonth required' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('monthly_totals')
        .upsert({
          company_id: companyId,
          year_month: monthlyTotal.yearMonth,
          income_total: monthlyTotal.incomeTotal || 0,
          expense_total: monthlyTotal.expenseTotal || 0,
        }, { onConflict: 'company_id,year_month' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
