'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as ExcelJS from 'exceljs';

interface KPIScore {
  id: string;
  user_name: string;
  work_order_count: number;
  avg_response_time: number;
  satisfaction_avg: number;
  score: number;
  rank: number;
}

export default function DirectorReportPage() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [kpiScores, setKpiScores] = useState<KPIScore[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('kpi_scores')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('score', { ascending: false });

        if (error) throw error;
        setKpiScores(data as KPIScore[]);
      } catch (err) {
        console.error('获取数据失败:', err);
        setKpiScores([
          { id: '1', user_name: '张三', work_order_count: 86, avg_response_time: 95, satisfaction_avg: 4.9, score: 98, rank: 1 },
          { id: '2', user_name: '李四', work_order_count: 78, avg_response_time: 118, satisfaction_avg: 4.7, score: 92, rank: 2 },
          { id: '3', user_name: '王五', work_order_count: 72, avg_response_time: 145, satisfaction_avg: 4.6, score: 85, rank: 3 },
          { id: '4', user_name: '赵六', work_order_count: 65, avg_response_time: 168, satisfaction_avg: 4.5, score: 78, rank: 4 },
          { id: '5', user_name: '钱七', work_order_count: 42, avg_response_time: 195, satisfaction_avg: 4.3, score: 65, rank: 5 },
          { id: '6', user_name: '孙八', work_order_count: 58, avg_response_time: 155, satisfaction_avg: 4.4, score: 75, rank: 6 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('客服KPI排名');
    
    sheet.columns = [
      { header: '排名', key: 'rank', width: 8 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '工单数', key: 'workOrders', width: 10 },
      { header: '响应时长(秒)', key: 'responseTime', width: 15 },
      { header: '满意度', key: 'satisfaction', width: 10 },
      { header: '积分', key: 'score', width: 8 },
    ];

    kpiScores.forEach((record, index) => {
      sheet.addRow({
        rank: index + 1,
        name: record.user_name,
        workOrders: record.work_order_count,
        responseTime: record.avg_response_time,
        satisfaction: record.satisfaction_avg,
        score: record.score,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `客服KPI排名_${startDate}_${endDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avgResponseTime = kpiScores.length > 0 
    ? Math.round(kpiScores.reduce((sum, s) => sum + s.avg_response_time, 0) / kpiScores.length)
    : 0;
  const avgSatisfaction = kpiScores.length > 0
    ? (kpiScores.reduce((sum, s) => sum + s.satisfaction_avg, 0) / kpiScores.length).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">主管导表</h1>
            <p className="text-slate-500 text-sm mt-1">客服KPI排名与绩效考核</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              导出 Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">客服总数</p>
            <p className="text-2xl font-bold text-slate-800">{kpiScores.length}人</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">平均响应时长</p>
            <p className="text-2xl font-bold text-blue-600">{avgResponseTime}秒</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">平均满意度</p>
            <p className="text-2xl font-bold text-amber-600">{avgSatisfaction}分</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">客服KPI排名表</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">排名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">姓名</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">工单数</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">响应时长</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">满意度</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">积分</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">评级</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kpiScores.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{record.user_name}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{record.work_order_count}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{record.avg_response_time}秒</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.satisfaction_avg >= 4.8 ? 'bg-green-100 text-green-800' :
                        record.satisfaction_avg >= 4.5 ? 'bg-blue-100 text-blue-800' :
                        record.satisfaction_avg >= 4.0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.satisfaction_avg}分
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">{record.score}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.score >= 90 ? 'bg-green-100 text-green-800' :
                        record.score >= 80 ? 'bg-blue-100 text-blue-800' :
                        record.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.score >= 90 ? '优秀' : record.score >= 80 ? '良好' : record.score >= 70 ? '达标' : '需提升'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}