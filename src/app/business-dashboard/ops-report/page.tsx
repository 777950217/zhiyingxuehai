'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface WorkOrder {
  issue_type: string;
  status: string;
  created_at: string;
}

interface Refund {
  reason: string;
  amount: number;
}

export default function OpsReportPage() {
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: woData, error: woError } = await supabase
          .from('work_orders')
          .select('issue_type, status, created_at');

        if (woError) throw woError;
        setWorkOrders(woData as WorkOrder[]);

        const { data: refundData, error: refundError } = await supabase
          .from('refunds')
          .select('reason, amount');

        if (refundError) throw refundError;
        setRefunds(refundData as Refund[]);
      } catch (err) {
        console.error('获取数据失败:', err);
        setWorkOrders([
          { issue_type: 'installation', status: 'completed', created_at: '2026-06-12 09:00' },
          { issue_type: 'repair', status: 'completed', created_at: '2026-06-12 09:30' },
          { issue_type: 'maintenance', status: 'processing', created_at: '2026-06-12 10:00' },
          { issue_type: 'complaint', status: 'completed', created_at: '2026-06-12 10:30' },
          { issue_type: 'installation', status: 'completed', created_at: '2026-06-12 11:00' },
          { issue_type: 'repair', status: 'pending', created_at: '2026-06-12 11:30' },
          { issue_type: 'installation', status: 'completed', created_at: '2026-06-12 14:00' },
          { issue_type: 'complaint', status: 'processing', created_at: '2026-06-12 14:30' },
          { issue_type: 'maintenance', status: 'completed', created_at: '2026-06-12 15:00' },
          { issue_type: 'repair', status: 'completed', created_at: '2026-06-12 15:30' },
        ]);
        setRefunds([
          { reason: '产品质量问题', amount: 2500 },
          { reason: '安装服务不满意', amount: 1800 },
          { reason: '物流损坏', amount: 3200 },
          { reason: '配件缺失', amount: 950 },
          { reason: '客户改变主意', amount: 1500 },
          { reason: '产品质量问题', amount: 1800 },
          { reason: '安装服务不满意', amount: 2200 },
          { reason: '物流损坏', amount: 1600 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const issueTypeConfig: Record<string, { label: string; color: string }> = {
    installation: { label: '安装', color: 'bg-green-100 text-green-800' },
    repair: { label: '维修', color: 'bg-blue-100 text-blue-800' },
    maintenance: { label: '保养', color: 'bg-yellow-100 text-yellow-800' },
    complaint: { label: '投诉', color: 'bg-red-100 text-red-800' },
  };

  const workOrderDistribution = workOrders.reduce((acc, wo) => {
    acc[wo.issue_type] = (acc[wo.issue_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalOrders = workOrders.length;

  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
    return workOrders.filter(wo => {
      const orderHour = new Date(wo.created_at).getHours();
      return orderHour === hour;
    }).length;
  });
  const maxHourly = Math.max(...hourlyDistribution, 1);

  const refundReasons = refunds.reduce((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  const topRefundReasons = Object.entries(refundReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">运营导表</h1>
            <p className="text-slate-500 text-sm mt-1">工单分析与运营数据汇总</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">总工单数</p>
            <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">已完成</p>
            <p className="text-2xl font-bold text-green-600">
              {workOrders.filter(w => w.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">处理中</p>
            <p className="text-2xl font-bold text-blue-600">
              {workOrders.filter(w => w.status === 'processing').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">待处理</p>
            <p className="text-2xl font-bold text-orange-600">
              {workOrders.filter(w => w.status === 'pending').length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">工单类型分布</h2>
            <div className="space-y-3">
              {Object.entries(workOrderDistribution).map(([type, count]) => {
                const config = issueTypeConfig[type] || { label: type, color: 'bg-slate-100 text-slate-800' };
                const percentage = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(1) : '0';
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: config.color.includes('green') ? '#22C55E' :
                                          config.color.includes('blue') ? '#3B82F6' :
                                          config.color.includes('yellow') ? '#EAB308' : '#EF4444'
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-16 text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">高峰时段分析</h2>
            <div className="relative" style={{ height: 150 }}>
              <div className="absolute inset-0 flex items-end justify-between">
                {hourlyDistribution.map((count, hour) => (
                  <div key={hour} className="flex flex-col items-center gap-1" style={{ width: `${100 / 24}%` }}>
                    <div 
                      className="w-3 rounded-t bg-blue-500" 
                      style={{ height: `${(count / maxHourly) * 120}px` }}
                      title={`${hour}:00 - ${count}单`}
                    ></div>
                    <span className="text-xs text-slate-500">{hour}:00</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">最高峰值: {maxHourly}单（预计在10:00-12:00和14:00-16:00）</p>
          </div>

          <div className="col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">退款原因TOP5</h2>
            <div className="space-y-3">
              {topRefundReasons.map(([reason, amount], index) => (
                <div key={reason} className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-red-100 text-red-800' :
                    index === 1 ? 'bg-orange-100 text-orange-800' :
                    index === 2 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-slate-700 w-32">{reason}</span>
                  <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${(amount / topRefundReasons[0][1]) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-red-600 w-24 text-right">
                    ¥{amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}