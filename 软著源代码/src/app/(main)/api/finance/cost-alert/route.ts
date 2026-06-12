import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface BusinessRecord {
  year: number;
  month: number;
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  purchase_total: number;
  ad_total: number;
  shipping_pack_total: number;
  salary_total: number;
  rent_total: number;
  utilities_total: number;
  after_sales_total: number;
  returns_total: number;
  platform_fee_total: number;
}

interface DataPoint {
  month: string;
  value: number;
  ucl: number;
  lcl: number;
  mean: number;
  isAnomaly: boolean;
}

interface AlertItem {
  type: string;
  month: string;
  value: number;
  threshold: number;
  message: string;
  contribution: string;
}

function calcMean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function calcStd(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const mean = calcMean(nums);
  const variance = nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    if (!userId || !userRole) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    if (userRole !== 'enterprise_admin' && userRole !== 'admin' && userRole !== 'enterprise_manager') {
      return NextResponse.json({ error: '仅专业版及以上可访问' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();
    if (!user?.company_id) {
      return NextResponse.json({ error: '未找到公司' }, { status: 404 });
    }

    // enterprise_manager 需要旗舰版才能使用智能预警（控制图+CDA导出）
    if (userRole === 'enterprise_manager') {
      const { data: company } = await supabase
        .from('companies')
        .select('plan')
        .eq('id', user.company_id)
        .single();
      if (!company || company.plan !== 'flagship') {
        return NextResponse.json({ error: '旗舰版管理员可使用智能预警功能' }, { status: 403 });
      }
    }
    const companyId = user.company_id;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 读取近6个月的经营数据
    const records: BusinessRecord[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      const { data } = await supabase
        .from('business_records')
        .select('year, month, total_revenue, total_expense, net_profit, purchase_total, ad_total, shipping_pack_total, salary_total, rent_total, utilities_total, after_sales_total, returns_total, platform_fee_total')
        .eq('company_id', companyId)
        .eq('year', y)
        .eq('month', m)
        .single();

      if (data) {
        records.push(data as BusinessRecord);
      }
    }

    const dataSufficient = records.length >= 3;

    // 成本项定义
    const costFields: Array<{ key: keyof BusinessRecord; label: string }> = [
      { key: 'total_revenue', label: '收入' },
      { key: 'total_expense', label: '总支出' },
      { key: 'purchase_total', label: '进货成本' },
      { key: 'ad_total', label: '广告投放' },
      { key: 'shipping_pack_total', label: '快递包装' },
      { key: 'salary_total', label: '人员工资' },
      { key: 'after_sales_total', label: '售后赔付' },
      { key: 'returns_total', label: '退货损失' },
    ];

    const allDataPoints: Record<string, DataPoint[]> = {};
    const alerts: AlertItem[] = [];

    for (const field of costFields) {
      const values = records.map(r => Number(r[field.key]) || 0);
      const months = records.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`);

      const points: DataPoint[] = [];

      if (dataSufficient) {
        // 控制图法：均值 ± 3倍标准差
        const mean = calcMean(values);
        const std = calcStd(values);
        const ucl = mean + 3 * std;
        const lcl = Math.max(0, mean - 3 * std);

        for (let i = 0; i < values.length; i++) {
          const isAnomaly = values[i] > ucl || values[i] < lcl;
          points.push({
            month: months[i],
            value: values[i],
            ucl: Math.round(ucl),
            lcl: Math.round(lcl),
            mean: Math.round(mean),
            isAnomaly,
          });

          if (isAnomaly) {
            const isHigh = values[i] > ucl;
            const prevValue = i > 0 ? values[i - 1] : 0;
            const changePercent = prevValue > 0 ? ((values[i] - prevValue) / prevValue * 100) : 0;

            alerts.push({
              type: field.label,
              month: months[i],
              value: values[i],
              threshold: isHigh ? Math.round(ucl) : Math.round(lcl),
              message: `${months[i]} ${field.label} ¥${values[i].toLocaleString()} ${isHigh ? '超上控制线' : '低于下控制线'}(¥${isHigh ? Math.round(ucl).toLocaleString() : Math.round(lcl).toLocaleString()})${changePercent !== 0 ? `，环比${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%` : ''}`,
              contribution: isHigh ? `高出均值 ¥${Math.round(values[i] - mean).toLocaleString()}` : `低于均值 ¥${Math.round(mean - values[i]).toLocaleString()}`,
            });
          }
        }
      } else {
        // 固定阈值法：环比增长超过30%报警
        for (let i = 0; i < values.length; i++) {
          const prevValue = i > 0 ? values[i - 1] : 0;
          const changePercent = prevValue > 0 ? ((values[i] - prevValue) / prevValue * 100) : 0;
          const isAnomaly = Math.abs(changePercent) > 30 && values[i] > 0;

          points.push({
            month: months[i],
            value: values[i],
            ucl: 0,
            lcl: 0,
            mean: i > 0 ? Math.round(calcMean(values.slice(0, i + 1))) : values[i],
            isAnomaly,
          });

          if (isAnomaly) {
            alerts.push({
              type: field.label,
              month: months[i],
              value: values[i],
              threshold: 30,
              message: `${months[i]} ${field.label} ¥${values[i].toLocaleString()}，环比${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%，超过30%预警阈值`,
              contribution: `较上月${changePercent > 0 ? '增加' : '减少'} ¥${Math.round(Math.abs(values[i] - prevValue)).toLocaleString()}`,
            });
          }
        }
      }

      allDataPoints[field.key] = points;
    }

    // 按月份倒序排列告警（最新的在前）
    alerts.sort((a, b) => b.month.localeCompare(a.month));

    return NextResponse.json({
      method: dataSufficient ? 'control_chart' : 'fixed_threshold',
      dataPoints: allDataPoints,
      alerts,
      dataSufficient,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
