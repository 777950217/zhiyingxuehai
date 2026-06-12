'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ImportLog {
  id: string;
  type: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: string;
  createdAt: string;
}

export default function DataImportPage() {
  const [activeTab, setActiveTab] = useState<'alipay' | 'wechat' | 'platform'>('alipay');
  const [uploading, setUploading] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([
    { id: '1', type: '支付宝', fileName: 'alipay_statement.xlsx', totalRows: 150, successRows: 148, failedRows: 2, status: 'completed', createdAt: '2026-06-12 10:30:00' },
    { id: '2', type: '微信支付', fileName: 'wechat_bill.xlsx', totalRows: 80, successRows: 80, failedRows: 0, status: 'completed', createdAt: '2026-06-12 09:15:00' },
    { id: '3', type: '电商平台', fileName: 'sales_orders.xlsx', totalRows: 200, successRows: 195, failedRows: 5, status: 'completed', createdAt: '2026-06-11 16:45:00' },
  ]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const log: ImportLog = {
        id: Date.now().toString(),
        type: activeTab === 'alipay' ? '支付宝' : activeTab === 'wechat' ? '微信支付' : '电商平台',
        fileName: file.name,
        totalRows: 100,
        successRows: 98,
        failedRows: 2,
        status: 'completed',
        createdAt: new Date().toLocaleString('zh-CN'),
      };

      setImportLogs([log, ...importLogs]);
    } catch (err) {
      console.error('上传失败:', err);
    } finally {
      setUploading(false);
    }
  };

  const getTypeLabel = () => {
    switch (activeTab) {
      case 'alipay': return '支付宝Excel';
      case 'wechat': return '微信支付账单';
      case 'platform': return '电商平台销售订单';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">数据导入</h1>
            <p className="text-slate-500 text-sm mt-1">支付宝/微信/平台对账单批量导入</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('alipay')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'alipay'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              支付宝Excel
            </button>
            <button
              onClick={() => setActiveTab('wechat')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'wechat'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              微信支付账单
            </button>
            <button
              onClick={() => setActiveTab('platform')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'platform'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              电商平台销售订单
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <div className="flex flex-col items-center">
                <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-slate-700 mb-2">点击或拖拽上传 {getTypeLabel()}</p>
                <p className="text-sm text-slate-500">支持 .xlsx, .xls 格式</p>
              </div>
            </label>
            {uploading && (
              <div className="mt-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-sm text-slate-500 mt-2">上传中...</p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">字段映射说明</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600">平台日期</span>
                <span className="mx-2">→</span>
                <span className="font-medium text-blue-600">date</span>
              </div>
              <div>
                <span className="text-slate-600">金额</span>
                <span className="mx-2">→</span>
                <span className="font-medium text-green-600">revenue</span>
              </div>
              <div>
                <span className="text-slate-600">退款</span>
                <span className="mx-2">→</span>
                <span className="font-medium text-red-600">refund_amount</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">导入日志</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">文件名</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">总行数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">成功</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">失败</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">导入时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.type === '支付宝' ? 'bg-blue-100 text-blue-800' :
                        log.type === '微信支付' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">{log.fileName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">{log.totalRows}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{log.successRows}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-500">{log.failedRows}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status === 'completed' ? '已完成' : '处理中'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500">{log.createdAt}</td>
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