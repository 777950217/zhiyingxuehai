'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, BookOpen, CheckCircle2, ChevronDown, Circle,
  Lightbulb, Loader2, PenLine, Plus, Target, Trash2, X,
  Download, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { DataSecurityBadge } from '@/components/data-security-badge';

interface DataRecord {
  id?: string;
  record_date: string;
  visits: number;
  avg_response_time: number;
  consultations: number;
  orders: number;
  complaints: number;
  conversion_rate?: number;
  complaint_rate?: number;
  mom_change?: number;
  notes?: string;
  target_visits?: number | null;
  target_response_time?: number | null;
  target_consultations?: number | null;
  target_orders?: number | null;
  target_complaints?: number | null;
  target_conversion_rate?: number | null;
}

const PLATFORM_GUIDES = [
  {
    name: '抖音', color: 'bg-rose-50 text-rose-700 border-rose-200',
    rows: [
      ['接待�?, '抖店后台→数据→客服数据→咨询量', '选择日期范围，看"有效咨询�?'],
      ['平均响应时长', '抖店后台→数据→客服数据→响应时�?, '"平均首次响应时长"，单位秒'],
      ['咨询人数', '抖店后台→数据→客服数据→咨询人�?, '与接待量不同，去除重复咨�?],
      ['成交人数', '抖店后台→数据→交易数据→成交订�?, '�?客服关联成交"筛�?],
      ['差评/投诉�?, '抖店后台→评价管理→差评列表', '差评�?投诉数合�?],
    ]
  },
  {
    name: '天猫', color: 'bg-orange-50 text-orange-700 border-orange-200',
    rows: [
      ['接待�?, '千牛后台→数据→客服数据→接待量', '"旺旺接待�?'],
      ['平均响应时长', '千牛后台→数据→客服数据→响应时�?, '"平均响应时长"，单位秒'],
      ['咨询人数', '千牛后台→数据→客服数据→咨询人�?, '"独立访客咨询�?'],
      ['成交人数', '千牛后台→数据→交易数据→客服成�?, '�?客服引导成交"筛�?],
      ['差评/投诉�?, '千牛后台→评价管�?, '"中差评数"+"投诉�?'],
    ]
  },
  {
    name: '拼多�?, color: 'bg-red-50 text-red-700 border-red-200',
    rows: [
      ['接待�?, '拼多多商家后台→数据中心→客服数据→接待�?, '"有效接待�?'],
      ['平均响应时长', '拼多多商家后台→数据中心→客服数�?, '"平均响应时长"，单位秒'],
      ['咨询人数', '拼多多商家后台→数据中心→客服数�?, '"咨询买家�?'],
      ['成交人数', '拼多多商家后台→数据中心→交易数�?, '"成团订单�?'],
      ['差评/投诉�?, '拼多多商家后台→售后管理', '"售后纠纷�?+"差评�?'],
    ]
  },
  {
    name: '京东', color: 'bg-blue-50 text-blue-700 border-blue-200',
    rows: [
      ['接待�?, '京东商家后台→咚咚→数据→接待量', '"有效接待�?'],
      ['平均响应时长', '京东商家后台→咚咚→数据', '"平均响应时长"，单位秒'],
      ['咨询人数', '京东商家后台→咚咚→数据', '"咨询客户�?'],
      ['成交人数', '京东商家后台→数据→交易', '"客服关联成交"'],
      ['差评/投诉�?, '京东商家后台→评价管�?纠纷管理', '"差评�?+"纠纷�?'],
    ]
  },
  {
    name: '淘宝', color: 'bg-amber-50 text-amber-700 border-amber-200',
    rows: [
      ['接待�?, '千牛后台→数据→客服数据→接待量', '"旺旺接待�?'],
      ['平均响应时长', '千牛后台→数据→客服数据', '"平均响应时长"，单位秒'],
      ['咨询人数', '千牛后台→数据→客服数据', '"独立访客咨询�?'],
      ['成交人数', '千牛后台→数据→交易数据', '"客服引导成交"'],
      ['差评/投诉�?, '千牛后台→评价管�?, '"中差评数"+"投诉�?'],
    ]
  },
];

export default function DataInputPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({
    record_date: new Date().toISOString().slice(0, 10),
    visits: '', avg_response_time: '', consultations: '', orders: '', complaints: '', notes: '',
    target_visits: '', target_response_time: '', target_consultations: '', target_orders: '', target_complaints: '', target_conversion_rate: '',
  });

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/personal/data-records');
      if (res.ok) { const data = await res.json(); setRecords(data.records || []); }
    } catch { toast.error('加载数据失败'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const formatDate = (d: string) => d?.slice(0, 10) || '';

  const handleSubmit = async () => {
    const numFields = ['visits', 'avg_response_time', 'consultations', 'orders', 'complaints'] as const;
    for (const f of numFields) {
      if (!form[f]) { toast.error('请填写完整数�?); return; }
    }
    try {
      const body: Record<string, unknown> = {
        record_date: form.record_date,
        visits: Number(form.visits),
        avg_response_time: Number(form.avg_response_time),
        consultations: Number(form.consultations),
        orders: Number(form.orders),
        complaints: Number(form.complaints),
        notes: form.notes || undefined,
      };
      const targetFields = ['target_visits', 'target_response_time', 'target_consultations', 'target_orders', 'target_complaints', 'target_conversion_rate'] as const;
      for (const f of targetFields) {
        if (form[f]) body[f] = Number(form[f]);
      }
      const res = await fetch('/api/personal/data-records', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('数据录入成功');
        setShowForm(false);
        setForm({ record_date: new Date().toISOString().slice(0, 10), visits: '', avg_response_time: '', consultations: '', orders: '', complaints: '', notes: '', target_visits: '', target_response_time: '', target_consultations: '', target_orders: '', target_complaints: '', target_conversion_rate: '' });
        fetchRecords();
      } else {
        const err = await res.json();
        toast.error(err.error || '录入失败');
      }
    } catch { toast.error('录入失败'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该条记录�?)) return;
    try {
      const res = await fetch(`/api/personal/data-records?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('已删�?); fetchRecords(); }
      else { toast.error('删除失败'); }
    } catch { toast.error('删除失败'); }
  };

  const handleExportCsv = () => {
    if (records.length === 0) { toast.error('暂无数据可导�?); return; }
    const headers = ['日期', '接待�?, '响应时长(�?', '咨询人数', '成交人数', '差评�?, '转化�?%)', '差评�?%)'];
    const rows = records.map(r => [formatDate(r.record_date), r.visits, r.avg_response_time, r.consultations, r.orders, r.complaints, (r.conversion_rate ?? 0).toFixed(1), (r.complaint_rate ?? 0).toFixed(1)]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `数据记录_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  };

  const handleImportCsv = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const clean = text.replace(/^\uFEFF/, '');
      const lines = clean.split('\n').filter(l => l.trim());
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 6) continue;
        try {
          await fetch('/api/personal/data-records', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              record_date: cols[0]?.trim(), visits: Number(cols[1]), avg_response_time: Number(cols[2]),
              consultations: Number(cols[3]), orders: Number(cols[4]), complaints: Number(cols[5]),
            }),
          });
          imported++;
        } catch { /* skip */ }
      }
      toast.success(`成功导入 ${imported} 条记录`);
      fetchRecords();
    };
    input.click();
  };

  if (!profile) return null;
  if (profile.role !== 'personal_user') {
    return <div className="p-8 text-center text-gray-500">此功能仅限个人版用户</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center"><BarChart3 className="w-5 h-5 text-sky-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">数据录入</h1>
          <p className="text-sm text-gray-500">录入每日客服数据，AI自动核算转化率和差评�?/p>
        </div>
      </div>
      <DataSecurityBadge />
      {/* 价值引�?*/}
      <div className="mb-6 px-4 py-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl">
        <p className="text-sm font-medium text-sky-800">�?个数，AI帮你算全盘——转化率、环比、达标率，全自动</p>
        <p className="text-xs text-sky-600 mt-1">只需要从后台�?个数字，剩余的AI全部帮你算好</p>
      </div>

      {/* 首次使用引导 */}
      {records.length === 0 && (
        <div className="mb-6 p-5 bg-white border-2 border-dashed border-sky-300 rounded-xl">
          <h3 className="text-base font-bold text-gray-900 mb-3">首次使用�?步搞定数据录�?/h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm font-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm font-medium text-gray-900">下载导入模板</p>
                <p className="text-xs text-gray-500">包含表头和示例行，照着填就�?/p>
                <button onClick={() => {
                  const csv = '\uFEFF日期,接待�?响应时长(�?,咨询人数,成交人数,差评数\n2025-01-15,120,45,100,30,2\n2025-01-16,135,38,110,35,1';
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = '数据录入模板.csv'; a.click();
                  URL.revokeObjectURL(url);
                }} className="mt-1 inline-flex items-center gap-1 text-xs text-[#2B7DE9] hover:underline font-medium">
                  <Download className="w-3.5 h-3.5" /> 下载CSV模板
                </button>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm font-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm font-medium text-gray-900">填入你的数据</p>
                <p className="text-xs text-gray-500">从店铺后台抄5个数字，填到对应�?/p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm font-bold flex items-center justify-center">3</span>
              <div>
                <p className="text-sm font-medium text-gray-900">一键导�?/p>
                <p className="text-xs text-gray-500">点击上方「导入」按钮，选择填好的CSV文件</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作�?*/}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 bg-[#0F2B46] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5c] transition-colors">
          <Plus className="w-4 h-4" /> 录入数据
        </button>
        <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> 导出
        </button>
        <button onClick={handleImportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          <Upload className="w-4 h-4" /> 导入
        </button>
      </div>

      {/* 取数指引 */}
      <div className="mb-4">
        <button onClick={() => setShowGuide(!showGuide)} className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 cursor-pointer transition-colors mb-2">
          <Lightbulb className="w-4 h-4" /> 不知道在哪里看数据？点击查看5大平台取数指�?
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
        </button>
        {showGuide && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50">
              {PLATFORM_GUIDES.map((platform, idx) => (
                <button key={platform.name} onClick={() => setGuidePlatform(idx)} className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${guidePlatform === idx ? 'bg-white text-sky-700 border-b-2 border-sky-500' : 'text-gray-500 hover:text-gray-700'}`}>
                  {platform.name}
                </button>
              ))}
            </div>
            <div className="p-4">
              {PLATFORM_GUIDES[guidePlatform] && (
                <div className="space-y-2">
                  {PLATFORM_GUIDES[guidePlatform].rows.map((row, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded shrink-0">{row[0]}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 font-medium">{row[1]}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{row[2]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 录入表单 */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">录入数据</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div><label className="text-xs text-gray-500 mb-1 block">日期</label><input type="date" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">接待�?/label><input type="number" value={form.visits} onChange={e => setForm(f => ({ ...f, visits: e.target.value }))} placeholder="0" className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">响应时长(�?</label><input type="number" value={form.avg_response_time} onChange={e => setForm(f => ({ ...f, avg_response_time: e.target.value }))} placeholder="0" className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">咨询人数</label><input type="number" value={form.consultations} onChange={e => setForm(f => ({ ...f, consultations: e.target.value }))} placeholder="0" className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">成交人数</label><input type="number" value={form.orders} onChange={e => setForm(f => ({ ...f, orders: e.target.value }))} placeholder="0" className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">差评/投诉�?/label><input type="number" value={form.complaints} onChange={e => setForm(f => ({ ...f, complaints: e.target.value }))} placeholder="0" className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
            <div className="col-span-2 md:col-span-3"><label className="text-xs text-gray-500 mb-1 block">备注(可�?</label><input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="备注..." className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
          </div>

          {/* 本月目标(折叠) */}
          <div className="border-t border-gray-200 pt-3 mb-3">
            <button onClick={() => setShowTargets(!showTargets)} className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700">
              <Target className="w-4 h-4" /> {showTargets ? '收起' : '展开'}本月目标
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTargets ? 'rotate-180' : ''}`} />
            </button>
            {showTargets && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <div><label className="text-xs text-gray-500 mb-1 block">目标接待�?/label><input type="number" value={form.target_visits} onChange={e => setForm(f => ({ ...f, target_visits: e.target.value }))} placeholder="可�? className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">目标响应(�?</label><input type="number" value={form.target_response_time} onChange={e => setForm(f => ({ ...f, target_response_time: e.target.value }))} placeholder="可�? className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">目标咨询人数</label><input type="number" value={form.target_consultations} onChange={e => setForm(f => ({ ...f, target_consultations: e.target.value }))} placeholder="可�? className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">目标成交人数</label><input type="number" value={form.target_orders} onChange={e => setForm(f => ({ ...f, target_orders: e.target.value }))} placeholder="可�? className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">目标差评�?/label><input type="number" value={form.target_complaints} onChange={e => setForm(f => ({ ...f, target_complaints: e.target.value }))} placeholder="可�? className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">目标转化�?%)</label><input type="number" value={form.target_conversion_rate} onChange={e => setForm(f => ({ ...f, target_conversion_rate: e.target.value }))} placeholder="可�? className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2" /></div>
                <div className="col-span-2 md:col-span-3">
                  <p className="text-xs text-sky-600 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> 目标值是帮你衡量工作效果的基准。设定目标→对比实际→找到差距→改进，这是管理第一�?/p>
                </div>
              </div>
            )}
          </div>

          {/* AI自动计算提示 */}
          <div className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-3 mb-3">
            <p className="text-xs font-medium text-sky-700 mb-2">AI为你自动计算以下指标�?/p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs text-sky-600">
                <span className="w-5 h-5 bg-sky-200 rounded flex items-center justify-center text-sky-800 font-bold text-[10px]">1</span>
                转化�?= 成交÷咨询×100%
              </div>
              <div className="flex items-center gap-2 text-xs text-sky-600">
                <span className="w-5 h-5 bg-sky-200 rounded flex items-center justify-center text-sky-800 font-bold text-[10px]">2</span>
                差评�?= 差评÷咨询×100%
              </div>
              <div className="flex items-center gap-2 text-xs text-sky-600">
                <span className="w-5 h-5 bg-sky-200 rounded flex items-center justify-center text-sky-800 font-bold text-[10px]">3</span>
                环比变化 = 与上一条记录对�?
              </div>
              <div className="flex items-center gap-2 text-xs text-sky-600">
                <span className="w-5 h-5 bg-sky-200 rounded flex items-center justify-center text-sky-800 font-bold text-[10px]">4</span>
                达成�?= 实际÷目标×100%
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-[#0F2B46] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5c]">保存</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300">取消</button>
          </div>
        </div>
      )}

      {/* 数据列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-base">暂无数据</p>
          <p className="text-sm mt-1">点击"录入数据"开始记录你的客服数�?/p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-3">日期</th>
                  <th className="text-right py-2 px-3">接待�?/th>
                  <th className="text-right py-2 px-3">响应(�?</th>
                  <th className="text-right py-2 px-3">咨询</th>
                  <th className="text-right py-2 px-3">成交</th>
                  <th className="text-right py-2 px-3">差评</th>
                  <th className="text-right py-2 px-3">转化�?/th>
                  <th className="text-right py-2 px-3">差评�?/th>
                  {records.some(r => r.target_visits != null || r.target_conversion_rate != null) && (
                    <th className="text-right py-2 px-3">达成�?/th>
                  )}
                  <th className="text-center py-2 px-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const hasTarget = r.target_visits != null || r.target_conversion_rate != null;
                  const visitRate = r.target_visits ? Math.round((r.visits / r.target_visits) * 100) : null;
                  const convDiff = (r.target_conversion_rate != null && r.conversion_rate != null)
                    ? Math.round(((r.conversion_rate - r.target_conversion_rate) * 10)) / 10 : null;
                  const rateColor = (val: number | null) => {
                    if (val == null) return 'text-gray-400';
                    if (val >= 100) return 'text-emerald-600';
                    if (val >= 80) return 'text-amber-600';
                    return 'text-red-600';
                  };
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{formatDate(r.record_date)}</td>
                      <td className="py-2 px-3 text-right text-gray-700">{r.visits}</td>
                      <td className="py-2 px-3 text-right text-gray-700">{r.avg_response_time}</td>
                      <td className="py-2 px-3 text-right text-gray-700">{r.consultations}</td>
                      <td className="py-2 px-3 text-right text-gray-700">{r.orders}</td>
                      <td className="py-2 px-3 text-right text-gray-700">{r.complaints}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={(r.conversion_rate ?? 0) >= 10 ? 'text-emerald-600' : 'text-red-600'}>
                          {(r.conversion_rate ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={(r.complaint_rate ?? 0) <= 5 ? 'text-emerald-600' : 'text-red-600'}>
                          {(r.complaint_rate ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      {records.some(rec => rec.target_visits != null || rec.target_conversion_rate != null) && (
                        <td className="py-2 px-3 text-right text-xs">
                          {hasTarget ? (
                            <div className="space-y-1">
                              {visitRate != null && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${visitRate >= 100 ? 'bg-emerald-500' : visitRate >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(visitRate, 100)}%` }} />
                                  </div>
                                  <span className={rateColor(visitRate)}>接待{visitRate}%</span>
                                </div>
                              )}
                              {convDiff != null && (
                                <div className="flex items-center gap-1.5">
                                  <span className={convDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                    转化{convDiff > 0 ? '+' : ''}{convDiff}%
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : <span className="text-gray-400">�?/span>}
                        </td>
                      )}
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => handleDelete(r.id!)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
