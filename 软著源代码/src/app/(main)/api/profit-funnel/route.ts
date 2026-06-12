import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 获取产品盈利列表
// POST: 添加/更新产品盈利记录
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    const { data: products, error } = await supabase
      .from('product_profit_records')
      .select('*')
      .eq('company_id', companyId)
      .order('net_profit', { ascending: true });

    if (error) {
      return NextResponse.json({ error: '产品列表加载失败' }, { status: 500 });
    }

    const result = (products || []).map((p: { id: string; product_name: string; sku: string | null; sell_price: string | null; cost_price: string | null; after_sale_loss: string | null; net_profit: string | null; profit_level: string | null; refund_count: number | null; refund_rate: string | null }) => {
      const sellPrice = Number(p.sell_price || 0);
      const costPrice = Number(p.cost_price || 0);
      const afterSaleLoss = Number(p.after_sale_loss || 0);
      const netProfit = sellPrice - costPrice - afterSaleLoss;
      const profitRate = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;

      return {
        id: p.id,
        productName: p.product_name,
        sku: p.sku || '',
        sellPrice,
        costPrice,
        afterSaleLoss,
        netProfit: Math.round(netProfit * 100) / 100,
        profitRate: Math.round(profitRate * 10) / 10,
        profitLevel: p.profit_level || '保本',
        refundCount: p.refund_count || 0,
        refundRate: Number(p.refund_rate || 0),
      };
    });

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { action, company_id, id, product_name, sku, sell_price, cost_price, after_sale_loss } = body;

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    if (action === 'upsert' && product_name) {
      // 计算净利和等级
      const sp = Number(sell_price || 0);
      const cp = Number(cost_price || 0);
      const asl = Number(after_sale_loss || 0);
      const netProfit = sp - cp - asl;
      const profitRate = sp > 0 ? (netProfit / sp) * 100 : 0;
      let profitLevel = '保本';
      if (profitRate > 30) profitLevel = '暴利';
      else if (profitRate > 10) profitLevel = '平利';
      else if (profitRate <= 0) profitLevel = '亏损';

      const record: Record<string, unknown> = {
        company_id,
        product_name,
        sku: sku || '',
        sell_price: sp,
        cost_price: cp,
        after_sale_loss: asl,
        net_profit: Math.round(netProfit * 100) / 100,
        profit_level: profitLevel,
      };

      let result;
      if (id) {
        const { data, error } = await supabase
          .from('product_profit_records')
          .update(record)
          .eq('id', id)
          .select()
          .single();
        if (error) return NextResponse.json({ error: '更新失败' }, { status: 500 });
        result = data;
      } else {
        const { data, error } = await supabase
          .from('product_profit_records')
          .insert(record)
          .select()
          .single();
        if (error) return NextResponse.json({ error: '添加失败' }, { status: 500 });
        result = data;
      }

      return NextResponse.json({ data: result });
    }

    if (action === 'delete' && id) {
      const { error } = await supabase
        .from('product_profit_records')
        .delete()
        .eq('id', id);

      if (error) return NextResponse.json({ error: '删除失败' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
