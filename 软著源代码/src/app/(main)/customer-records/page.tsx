'use client';

import { useAuth } from '@/lib/auth-context';
import { markOnboardingDay } from '@/lib/onboarding-helpers';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ========== 常量定义 ==========

const ORDER_TYPES = ['售前咨询', '售后故障', '安装预约', '投诉维权', '退换货'] as const;

const SUB_TYPES: Record<string, string[]> = {
  '售前咨询': ['尺寸咨询', '安装条件', '水压适配', '款式选型', '配件咨询'],
  '售后故障': ['冲水无力', '马桶漏水', '箱体渗水', '下水异响', '物流破损', '安装错位', '配件缺失', '水压不足', '釉面问题', '功能失灵'],
  '安装预约': ['新房安装', '旧机更换', '移位安装'],
  '投诉维权': ['服务态度', '虚假宣传', '拖延处理'],
  '退换货': ['尺码不符', '款式选错', '质量不满�?],
};

const PROGRESS_FLOW: Record<string, string[]> = {
  '售前咨询': ['未响�?, '已答�?, '户型核对', '上门预约', '成交锁单', '意向流失'],
  '售后故障': ['未联系客�?, '已沟通诉�?, '待上传凭�?, '安排补发配件', '预约上门维修', '协商处理方案', '待回�?, '正式闭环'],
  '安装预约': ['未响�?, '已确认需�?, '预约上门', '施工�?, '验收完成', '已取�?],
  '投诉维权': ['未联系客�?, '已沟通诉�?, '待上传凭�?, '协商处理方案', '待回�?, '正式闭环'],
  '退换货': ['未联系客�?, '已沟通诉�?, '待上传凭�?, '协商处理方案', '待回�?, '正式闭环'],
};

const STATUSES = ['未服�?, '服务�?, '售后�?, '已完�?, '已关�?] as const;
const ASSIGN_STATUSES = ['未分�?, '已分�?, '转交�?] as const;
const PLATFORMS = ['淘宝', '京东', '抖音', '拼多�?, '天猫', '线下门店', '其他'] as const;
const CUSTOMER_DEMANDS = ['维修', '换新', '退�?, '补偿', '上门调试', '改尺�?, '其他'] as const;
const FINAL_SOLUTIONS = ['免费维修', '补发配件', '上门调试', '全额退�?, '差价补偿', '现金赔付', '换新货品'] as const;
const CLOSURE_RESULTS = ['已彻底解�?, '临时缓解', '无法解决', '客户自愿终止'] as const;

// 责任归属
const RESPONSIBILITY_OPTIONS = [
  { value: 'product', label: '产品问题' },
  { value: 'logistics', label: '物流问题' },
  { value: 'customer', label: '客户自身' },
  { value: 'staff_mistake', label: '客服失误' },
  { value: 'other', label: '其他' },
] as const;

// P1 售前字段
const INSTALL_SCENARIOS = ['小卫生间(<4�?', '标准卫生�?4-8�?', '大卫生间(>8�?', '暗装', '明装', '有吊�?, '无吊�?] as const;
const PURCHASE_INTENTS = ['犹豫观望', '近期下单', '已定别家', '高意�?] as const;

// ========== 类型定义 ==========

interface ServiceOrder {
  id: string;
  company_id: string;
  customer_name: string;
  customer_phone: string;
  source_platform: string;
  related_order_id: string;
  product_model: string;
  order_type: string;
  sub_type: string;
  progress: string;
  status: string;
  assignee_id: string;
  assign_status: string;
  promised_deadline: string | null;
  follow_up_summary: string;
  customer_demand: string;
  final_solution: string;
  closure_result: string;
  tags: string[];
  created_by: string;
  created_at: string;
  first_response_at: string | null;
  completed_at: string | null;
  // P1 售后字段
  pit_distance: string;
  actual_water_pressure: string;
  evidence_urls: string[];
  compensation_amount: number;
  replacement_parts: ReplacementPart[];
  installer_name: string;
  // P1 售前字段
  house_pit_distance: string;
  house_water_pressure: string;
  install_scenario: string;
  purchase_intent: string;
  // 责任归属
  responsibility: string;
  is_staff_caused: boolean;
}

interface ReplacementPart {
  model: string;
  quantity: number;
  tracking_no: string;
}

interface Agent {
  id: string;
  name: string;
  position: string;
}

interface EvidenceFile {
  url: string;
  type: 'image' | 'video';
  name: string;
}

// ========== 辅助函数 ==========

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    '未服�?: 'bg-gray-100 text-gray-700',
    '服务�?: 'bg-blue-100 text-blue-700',
    '售后�?: 'bg-amber-100 text-amber-700',
    '已完�?: 'bg-green-100 text-green-700',
    '已关�?: 'bg-slate-100 text-slate-600',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

function getOrderTypeColor(type: string): string {
  const map: Record<string, string> = {
    '售前咨询': 'bg-sky-100 text-sky-700',
    '售后故障': 'bg-red-100 text-red-700',
    '安装预约': 'bg-indigo-100 text-indigo-700',
    '投诉维权': 'bg-orange-100 text-orange-700',
    '退换货': 'bg-purple-100 text-purple-700',
  };
  return map[type] || 'bg-gray-100 text-gray-700';
}

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline || status === '已完�? || status === '已关�?) return false;
  return new Date(deadline) < new Date();
}

// 判断是否为售后类工单
function isAftersale(orderType: string): boolean {
  return ['售后故障', '投诉维权', '退换货'].includes(orderType);
}

// 判断是否需要凭证（漏水/破损/故障类）
function needsEvidence(orderType: string, subType: string): boolean {
  if (!isAftersale(orderType)) return false;
  return ['马桶漏水', '箱体渗水', '物流破损', '功能失灵', '釉面问题', '下水异响'].includes(subType);
}

// ========== 主组�?==========

export default function CustomerRecordsPage() {
  const { profile, authFetch } = useAuth();
  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'enterprise_admin' || profile?.role === 'enterprise_manager';

  // 数据状�?
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 筛选状�?
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrderType, setFilterOrderType] = useState('');
  const [filterAssignStatus, setFilterAssignStatus] = useState('');
  const [filterResponsibility, setFilterResponsibility] = useState('');
  const [searchText, setSearchText] = useState('');

  // 弹窗状�?
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [showDetail, setShowDetail] = useState<ServiceOrder | null>(null);
  const [showEdit, setShowEdit] = useState<ServiceOrder | null>(null);

  // 表单数据（string字段�?
  const emptyForm = (): Record<string, string> => ({
    order_type: '', sub_type: '', product_model: '',
    customer_name: '', customer_phone: '', source_platform: '', related_order_id: '',
    assignee_id: '', promised_deadline: '', follow_up_summary: '',
    customer_demand: '', final_solution: '', closure_result: '', responsibility: '',
    status: '未服�?, progress: '未响�?,
    // P1 售后
    pit_distance: '', actual_water_pressure: '', installer_name: '',
    compensation_amount: '',
    // P1 售前
    house_pit_distance: '', house_water_pressure: '', install_scenario: '', purchase_intent: '',
  });
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);

  // P1 结构化数�?
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [replacementParts, setReplacementParts] = useState<ReplacementPart[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // 客服人员列表
  const [agents, setAgents] = useState<Agent[]>([]);

  // ===== 数据获取 =====

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', '20');
      if (filterStatus) params.set('status', filterStatus);
      if (filterOrderType) params.set('order_type', filterOrderType);
      if (filterAssignStatus) params.set('assign_status', filterAssignStatus);
      if (filterResponsibility) params.set('responsibility', filterResponsibility);
      if (searchText) params.set('search', searchText);
      const res = await authFetch(`/api/customer-records?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch, page, filterStatus, filterOrderType, filterAssignStatus, filterResponsibility, searchText]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await authFetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents((data.data || data).map((a: Record<string, unknown>) => ({ id: a.id as string, name: a.name as string, position: a.position as string })));
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { if (showCreate || showEdit) fetchAgents(); }, [showCreate, showEdit, fetchAgents]);

  // ===== 联动逻辑 =====

  const currentSubTypes = useMemo(() => {
    return form.order_type ? (SUB_TYPES[form.order_type] || []) : [];
  }, [form.order_type]);

  const currentProgressFlow = useMemo(() => {
    return form.order_type ? (PROGRESS_FLOW[form.order_type] || []) : [];
  }, [form.order_type]);

  // 条件必填：安装错�?尺寸不符 �?坑距必填
  const pitDistanceRequired = useMemo(() => {
    return ['安装错位', '尺寸不符'].includes(form.sub_type);
  }, [form.sub_type]);

  // 条件必填：冲水无�?水压不足 �?水压必填
  const waterPressureRequired = useMemo(() => {
    return ['冲水无力', '水压不足'].includes(form.sub_type);
  }, [form.sub_type]);

  // 售前咨询 �?坑距必填
  const housePitRequired = form.order_type === '售前咨询';

  // 一级类型变化时，重置二级和进度
  const handleOrderTypeChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      order_type: value,
      sub_type: '',
      progress: PROGRESS_FLOW[value]?.[0] || '未响�?,
      // 切换类型时清空P1专属字段
      pit_distance: '', actual_water_pressure: '', installer_name: '', compensation_amount: '',
      house_pit_distance: '', house_water_pressure: '', install_scenario: '', purchase_intent: '',
    }));
    setEvidenceFiles([]);
    setReplacementParts([]);
  };

  // ===== 凭证上传 =====

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingEvidence(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`${isVideo ? '视频' : '图片'}文件不能超过${isVideo ? '50' : '10'}MB: ${file.name}`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await authFetch('/api/customer-records/upload-evidence', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          setEvidenceFiles(prev => [...prev, { url: data.url, type: data.type || (isVideo ? 'video' : 'image'), name: file.name }]);
        } else {
          alert(`上传失败: ${file.name}`);
        }
      }
    } catch { alert('上传出错，请重试'); }
    setUploadingEvidence(false);
    // 重置input
    e.target.value = '';
  };

  const removeEvidence = (idx: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // ===== 补发配件管理 =====

  const addReplacementPart = () => {
    setReplacementParts(prev => [...prev, { model: '', quantity: 1, tracking_no: '' }]);
  };

  const updateReplacementPart = (idx: number, field: keyof ReplacementPart, value: string | number) => {
    setReplacementParts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removeReplacementPart = (idx: number) => {
    setReplacementParts(prev => prev.filter((_, i) => i !== idx));
  };

  // ===== 创建/更新工单 =====

  const handleSave = async () => {
    setSaving(true);
    try {
      const isEdit = !!showEdit;
      const method = isEdit ? 'PATCH' : 'POST';
      const body = {
        ...(isEdit ? { id: showEdit!.id } : {}),
        ...form,
        compensation_amount: form.compensation_amount ? parseFloat(form.compensation_amount) : 0,
        evidence_urls: evidenceFiles.map(f => f.url),
        replacement_parts: replacementParts,
      };

      const res = await authFetch('/api/customer-records', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (!isEdit) {
          // Day4: 录入第一条售后工�?�?完成
          markOnboardingDay(authFetch, 4);
        }
        setShowCreate(false);
        setShowEdit(null);
        setForm(emptyForm());
        setEvidenceFiles([]);
        setReplacementParts([]);
        setCreateStep(1);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || '保存失败');
      }
    } catch {
      alert('网络错误，请重试');
    }
    setSaving(false);
  };

  // ===== 删除 =====

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此工单？')) return;
    try {
      const res = await authFetch(`/api/customer-records?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchOrders();
      else alert('删除失败');
    } catch { alert('网络错误'); }
  };

  // ===== 表单输入辅助 =====

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  // 从ServiceOrder填充form
  const fillFormFromOrder = (order: ServiceOrder) => {
    setForm({
      customer_name: order.customer_name, customer_phone: order.customer_phone,
      source_platform: order.source_platform, related_order_id: order.related_order_id,
      product_model: order.product_model, order_type: order.order_type,
      sub_type: order.sub_type, progress: order.progress, status: order.status,
      assignee_id: order.assignee_id, assign_status: order.assign_status,
      promised_deadline: order.promised_deadline || '', follow_up_summary: order.follow_up_summary,
      customer_demand: order.customer_demand, final_solution: order.final_solution,
      closure_result: order.closure_result, responsibility: order.responsibility || '',
      // P1 售后
      pit_distance: order.pit_distance || '', actual_water_pressure: order.actual_water_pressure || '',
      installer_name: order.installer_name || '', compensation_amount: String(order.compensation_amount || ''),
      // P1 售前
      house_pit_distance: order.house_pit_distance || '', house_water_pressure: order.house_water_pressure || '',
      install_scenario: order.install_scenario || '', purchase_intent: order.purchase_intent || '',
    });
    setEvidenceFiles((order.evidence_urls || []).map((url: string) => ({
      url,
      type: url.includes('.mp4') || url.includes('.mov') ? 'video' as const : 'image' as const,
      name: url.split('/').pop() || 'file',
    })));
    setReplacementParts(order.replacement_parts || []);
  };

  const totalPages = Math.ceil(total / 20);

  // 是否显示售后专属字段
  const showAftersaleFields = isAftersale(form.order_type);
  const showPresaleFields = form.order_type === '售前咨询';
  const showEvidenceRequired = needsEvidence(form.order_type, form.sub_type);

  // ===== 渲染 =====

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 页面标题 */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800">售后管理</h1>
        <p className="text-sm text-slate-500 mt-1">工单全流程管�?· 售前咨询/售后故障/安装/投诉/退�?/p>
      </div>

      <div className="p-6">
        {/* 筛选栏 */}
        <div className="bg-white rounded-lg border p-4 mb-4 flex flex-wrap items-center gap-3">
          <input type="text" placeholder="搜索客户/订单/型号..." className="border rounded-md px-3 py-1.5 text-sm w-52" value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1); }} />
          <select className="border rounded-md px-3 py-1.5 text-sm" value={filterOrderType} onChange={e => { setFilterOrderType(e.target.value); setPage(1); }}>
            <option value="">全部类型</option>
            {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="border rounded-md px-3 py-1.5 text-sm" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">全部状�?/option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border rounded-md px-3 py-1.5 text-sm" value={filterAssignStatus} onChange={e => { setFilterAssignStatus(e.target.value); setPage(1); }}>
            <option value="">全部分配</option>
            {ASSIGN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border rounded-md px-3 py-1.5 text-sm" value={filterResponsibility} onChange={e => { setFilterResponsibility(e.target.value); setPage(1); }}>
            <option value="">全部责任</option>
            {RESPONSIBILITY_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div className="flex-1" />
          <button onClick={() => { setForm(emptyForm()); setEvidenceFiles([]); setReplacementParts([]); setCreateStep(1); setShowCreate(true); }} className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700">
            + 新建工单
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {STATUSES.map(s => {
            const count = orders.filter(o => o.status === s).length;
            return (
              <div key={s} className="bg-white rounded-lg border p-3 text-center">
                <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(s)}`}>{s}</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{count}</div>
              </div>
            );
          })}
        </div>

        {/* 工单列表 */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">加载�?..</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无工单记录</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-3 font-medium">工单类型</th>
                  <th className="text-left px-4 py-3 font-medium">二级问题</th>
                  <th className="text-left px-4 py-3 font-medium">客户</th>
                  <th className="text-left px-4 py-3 font-medium">产品型号</th>
                  <th className="text-left px-4 py-3 font-medium">平台</th>
                  <th className="text-left px-4 py-3 font-medium">状�?/th>
                  <th className="text-left px-4 py-3 font-medium">进度</th>
                  <th className="text-left px-4 py-3 font-medium">负责�?/th>
                  <th className="text-left px-4 py-3 font-medium">责任归属</th>
                  <th className="text-left px-4 py-3 font-medium">创建时间</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map(order => {
                  const agent = agents.find(a => a.id === order.assignee_id);
                  const overdue = isOverdue(order.promised_deadline, order.status);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getOrderTypeColor(order.order_type)}`}>{order.order_type || '-'}</span></td>
                      <td className="px-4 py-3 text-slate-600">{order.sub_type || '-'}</td>
                      <td className="px-4 py-3"><div className="font-medium text-slate-800">{order.customer_name}</div><div className="text-xs text-slate-400">{order.customer_phone}</div></td>
                      <td className="px-4 py-3 text-slate-600">{order.product_model || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{order.source_platform || '-'}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>{order.status}</span>{overdue && <span className="ml-1 text-xs text-red-500">超时</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{order.progress || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{agent?.name || (order.assignee_id ? order.assignee_id : '未分�?)}</td>
                      <td className="px-4 py-3">
                        {order.responsibility ? (
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                            order.responsibility === 'staff_mistake' ? 'bg-red-100 text-red-700' :
                            order.responsibility === 'product' ? 'bg-orange-100 text-orange-700' :
                            order.responsibility === 'logistics' ? 'bg-yellow-100 text-yellow-700' :
                            order.responsibility === 'customer' ? 'bg-slate-100 text-slate-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {RESPONSIBILITY_OPTIONS.find(r => r.value === order.responsibility)?.label || order.responsibility}
                          </span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatTime(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setShowDetail(order)} className="text-blue-600 hover:underline text-xs">查看</button>
                          {isAdminOrManager && (
                            <>
                              <button onClick={() => { fillFormFromOrder(order); setShowEdit(order); setCreateStep(1); }} className="text-slate-600 hover:underline text-xs">编辑</button>
                              <button onClick={() => handleDelete(order.id)} className="text-red-500 hover:underline text-xs">删除</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-slate-500">�?{total} �?/span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-40">上一�?/button>
              <span className="text-sm text-slate-600">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-40">下一�?/button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 新建/编辑工单弹窗�?步） ===== */}
      {(showCreate || showEdit) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowCreate(false); setShowEdit(null); }}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* 头部 */}
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-800">{showEdit ? '编辑工单' : '新建工单'}</h2>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(step => (
                  <div key={step} className="flex items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${createStep >= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{step}</div>
                    <span className="text-xs text-slate-500 hidden sm:inline">{['选型', '客户', '进度'][step - 1]}</span>
                    {step < 3 && <div className={`w-6 h-0.5 ${createStep > step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
              {/* ===== �?屏：核心选型 + 售前字段 ===== */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">核心选型</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">一级工单类�?<span className="text-red-500">*</span></label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.order_type} onChange={e => handleOrderTypeChange(e.target.value)}>
                      <option value="">请选择工单类型</option>
                      {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {form.order_type && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">二级细分问题 <span className="text-red-500">*</span></label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.sub_type} onChange={e => setField('sub_type', e.target.value)}>
                        <option value="">请选择细分问题</option>
                        {currentSubTypes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">产品型号 <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border rounded-md px-3 py-2 text-sm" placeholder="如：S-8901 智能马桶" value={form.product_model} onChange={e => setField('product_model', e.target.value)} />
                  </div>

                  {/* ── 售前专属字段（P1�?── */}
                  {showPresaleFields && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium text-sky-700 text-sm">售前专属信息</h4>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">房屋坑距 <span className="text-red-500">*</span></label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.house_pit_distance} onChange={e => setField('house_pit_distance', e.target.value)}>
                          <option value="">请选择</option>
                          <option value="305mm">305mm</option>
                          <option value="400mm">400mm</option>
                          <option value="其他">其他</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">居家水压区间</label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.house_water_pressure} onChange={e => setField('house_water_pressure', e.target.value)}>
                          <option value="">请选择</option>
                          <option value="低压(<0.1MPa)">低压(&lt;0.1MPa)</option>
                          <option value="中压(0.1-0.3MPa)">中压(0.1-0.3MPa)</option>
                          <option value="高压(>0.3MPa)">高压(&gt;0.3MPa)</option>
                          <option value="未知">未知</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">安装户型场景</label>
                        <div className="flex flex-wrap gap-2">
                          {INSTALL_SCENARIOS.map(s => (
                            <button key={s} type="button" onClick={() => setField('install_scenario', form.install_scenario === s ? '' : s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.install_scenario === s ? 'bg-sky-100 border-sky-400 text-sky-700' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300'}`}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">客户购买意向</label>
                        <div className="flex flex-wrap gap-2">
                          {PURCHASE_INTENTS.map(p => (
                            <button key={p} type="button" onClick={() => setField('purchase_intent', form.purchase_intent === p ? '' : p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.purchase_intent === p ? 'bg-sky-100 border-sky-400 text-sky-700' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300'}`}>{p}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 售后条件必填提示（P1�?── */}
                  {showAftersaleFields && (pitDistanceRequired || waterPressureRequired) && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <p className="text-xs text-amber-700 font-medium">条件必填提醒</p>
                      {pitDistanceRequired && <p className="text-xs text-amber-600 mt-1">当前二级问题要求填写"现场实测坑距"</p>}
                      {waterPressureRequired && <p className="text-xs text-amber-600 mt-1">当前二级问题要求填写"现场实际水压"</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ===== �?屏：客户+订单信息 ===== */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">客户与订单信�?/h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">客户姓名 <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full border rounded-md px-3 py-2 text-sm" value={form.customer_name} onChange={e => setField('customer_name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">联系手机�?<span className="text-red-500">*</span></label>
                      <input type="tel" className="w-full border rounded-md px-3 py-2 text-sm" value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">下单平台 <span className="text-red-500">*</span></label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.source_platform} onChange={e => setField('source_platform', e.target.value)}>
                        <option value="">请选择</option>
                        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">订单编号 {isAftersale(form.order_type) && <span className="text-red-500">*</span>}</label>
                      <input type="text" className="w-full border rounded-md px-3 py-2 text-sm" placeholder="售后类必�? value={form.related_order_id} onChange={e => setField('related_order_id', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== �?屏：进度+负责�?闭环+P1售后字段 ===== */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">进度与负责人</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">工单状�?/label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.status} onChange={e => setField('status', e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">处理进度</label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.progress} onChange={e => setField('progress', e.target.value)}>
                        {currentProgressFlow.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">跟进负责�?/label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.assignee_id} onChange={e => setField('assignee_id', e.target.value)}>
                        <option value="">未分�?/option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.position})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">承诺办结时间 {isAftersale(form.order_type) && <span className="text-red-500">*</span>}</label>
                      <input type="datetime-local" className="w-full border rounded-md px-3 py-2 text-sm" value={form.promised_deadline} onChange={e => setField('promised_deadline', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">跟进摘要 <span className="text-red-500">*</span></label>
                    <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={2} placeholder="沟通要点、关键信�?.." value={form.follow_up_summary} onChange={e => setField('follow_up_summary', e.target.value)} />
                  </div>

                  {/* ── 售后专属字段（P1�?── */}
                  {showAftersaleFields && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium text-red-700 text-sm">售后专属信息</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">现场实测坑距 {pitDistanceRequired && <span className="text-red-500">*</span>}</label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.pit_distance} onChange={e => setField('pit_distance', e.target.value)}>
                            <option value="">请选择</option>
                            <option value="305mm">305mm</option>
                            <option value="400mm">400mm</option>
                            <option value="其他">其他</option>
                          </select>
                          {pitDistanceRequired && <p className="text-xs text-amber-600 mt-0.5">当前二级问题必填</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">现场实际水压 {waterPressureRequired && <span className="text-red-500">*</span>}</label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.actual_water_pressure} onChange={e => setField('actual_water_pressure', e.target.value)}>
                            <option value="">请选择</option>
                            <option value="低压(<0.1MPa)">低压(&lt;0.1MPa)</option>
                            <option value="中压(0.1-0.3MPa)">中压(0.1-0.3MPa)</option>
                            <option value="高压(>0.3MPa)">高压(&gt;0.3MPa)</option>
                          </select>
                          {waterPressureRequired && <p className="text-xs text-amber-600 mt-0.5">当前二级问题必填</p>}
                        </div>
                      </div>

                      {/* 售后凭证上传 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          售后凭证 {showEvidenceRequired && <span className="text-red-500">*</span>}
                          <span className="text-xs text-slate-400 ml-1">图片�?0MB / 视频�?0MB</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                            📎 上传凭证
                            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleEvidenceUpload} disabled={uploadingEvidence} />
                          </label>
                          {uploadingEvidence && <span className="text-xs text-blue-600">上传�?..</span>}
                        </div>
                        {evidenceFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {evidenceFiles.map((f, idx) => (
                              <div key={idx} className="relative group w-16 h-16 rounded-lg border overflow-hidden bg-slate-100">
                                {f.type === 'video' ? (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">🎬</div>
                                ) : (
                                  <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                                )}
                                <button type="button" onClick={() => removeEvidence(idx)} className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {showEvidenceRequired && <p className="text-xs text-amber-600 mt-0.5">当前工单类型建议上传凭证</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">售后赔付金额</label>
                          <div className="relative">
                            <input type="number" min="0" step="0.01" className="w-full border rounded-md px-3 py-2 text-sm pr-8" placeholder="0.00" value={form.compensation_amount} onChange={e => setField('compensation_amount', e.target.value)} />
                            <span className="absolute right-3 top-2 text-sm text-slate-400">�?/span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">填写后联动成本预�?/p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">上门安装师傅</label>
                          <input type="text" className="w-full border rounded-md px-3 py-2 text-sm" placeholder="师傅姓名" value={form.installer_name} onChange={e => setField('installer_name', e.target.value)} />
                        </div>
                      </div>

                      {/* 补发配件清单 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-600">补发配件清单</label>
                          <button type="button" onClick={addReplacementPart} className="text-xs text-blue-600 hover:underline">+ 添加配件</button>
                        </div>
                        {replacementParts.length > 0 && (
                          <div className="space-y-2">
                            {replacementParts.map((part, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input type="text" className="flex-1 border rounded-md px-2 py-1.5 text-sm" placeholder="配件型号" value={part.model} onChange={e => updateReplacementPart(idx, 'model', e.target.value)} />
                                <input type="number" min="1" className="w-16 border rounded-md px-2 py-1.5 text-sm" placeholder="数量" value={part.quantity} onChange={e => updateReplacementPart(idx, 'quantity', parseInt(e.target.value) || 1)} />
                                <input type="text" className="flex-1 border rounded-md px-2 py-1.5 text-sm" placeholder="发货单号" value={part.tracking_no} onChange={e => updateReplacementPart(idx, 'tracking_no', e.target.value)} />
                                <button type="button" onClick={() => removeReplacementPart(idx)} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 业务闭环结果（仅售后�?+ 进度靠后时显示） */}
                  {isAftersale(form.order_type) && form.progress && !['未联系客�?, '未响�?].includes(form.progress) && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium text-slate-700">业务闭环结果</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">客户核心诉求</label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.customer_demand} onChange={e => setField('customer_demand', e.target.value)}>
                            <option value="">请选择</option>
                            {CUSTOMER_DEMANDS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">最终处理方�?/label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.final_solution} onChange={e => setField('final_solution', e.target.value)}>
                            <option value="">请选择</option>
                            {FINAL_SOLUTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">工单闭环结果</label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.closure_result} onChange={e => setField('closure_result', e.target.value)}>
                            <option value="">请选择</option>
                            {CLOSURE_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">责任归属</label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.responsibility} onChange={e => setField('responsibility', e.target.value)}>
                            <option value="">请选择</option>
                            {RESPONSIBILITY_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          {form.responsibility === 'staff_mistake' && (
                            <p className="text-xs text-red-500 mt-1">已自动标记为客服责任</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="border-t px-6 py-4 flex items-center justify-between shrink-0 bg-white">
              <button onClick={() => { if (createStep > 1) setCreateStep(createStep - 1); else { setShowCreate(false); setShowEdit(null); } }} className="px-4 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50">
                {createStep > 1 ? '上一�? : '取消'}
              </button>
              <div className="flex items-center gap-3">
                {createStep < 3 ? (
                  <button onClick={() => setCreateStep(createStep + 1)} disabled={createStep === 1 && (!form.order_type || !form.sub_type || !form.product_model)} className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                    下一�?
                  </button>
                ) : (
                  <button onClick={handleSave} disabled={saving || !form.customer_name || !form.customer_phone || !form.source_platform} className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                    {saving ? '保存�?..' : '提交工单'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 查看工单详情弹窗 ===== */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-800">工单详情</h2>
              <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* 基本信息 */}
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded text-xs font-medium ${getOrderTypeColor(showDetail.order_type)}`}>{showDetail.order_type}</span>
                <span className={`px-2.5 py-1 rounded text-xs font-medium ${getStatusColor(showDetail.status)}`}>{showDetail.status}</span>
                {isOverdue(showDetail.promised_deadline, showDetail.status) && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">已超�?/span>}
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div><span className="text-slate-500">二级问题�?/span><span className="text-slate-800">{showDetail.sub_type || '-'}</span></div>
                <div><span className="text-slate-500">产品型号�?/span><span className="text-slate-800">{showDetail.product_model || '-'}</span></div>
                <div><span className="text-slate-500">客户姓名�?/span><span className="text-slate-800">{showDetail.customer_name}</span></div>
                <div><span className="text-slate-500">手机号：</span><span className="text-slate-800">{showDetail.customer_phone}</span></div>
                <div><span className="text-slate-500">下单平台�?/span><span className="text-slate-800">{showDetail.source_platform || '-'}</span></div>
                <div><span className="text-slate-500">订单编号�?/span><span className="text-slate-800">{showDetail.related_order_id || '-'}</span></div>
                <div><span className="text-slate-500">处理进度�?/span><span className="text-slate-800 font-medium">{showDetail.progress || '-'}</span></div>
                <div><span className="text-slate-500">分配状态：</span><span className="text-slate-800">{showDetail.assign_status || '-'}</span></div>
                <div><span className="text-slate-500">负责人：</span><span className="text-slate-800">{agents.find(a => a.id === showDetail.assignee_id)?.name || '未分�?}</span></div>
                <div><span className="text-slate-500">承诺办结�?/span><span className={`text-slate-800 ${isOverdue(showDetail.promised_deadline, showDetail.status) ? 'text-red-600 font-medium' : ''}`}>{formatTime(showDetail.promised_deadline)}</span></div>
                <div><span className="text-slate-500">创建时间�?/span><span className="text-slate-800">{formatTime(showDetail.created_at)}</span></div>
                <div><span className="text-slate-500">首次响应�?/span><span className="text-slate-800">{formatTime(showDetail.first_response_at)}</span></div>
                <div><span className="text-slate-500">完结时间�?/span><span className="text-slate-800">{formatTime(showDetail.completed_at)}</span></div>
              </div>

              {/* 跟进摘要 */}
              {showDetail.follow_up_summary && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">跟进摘要</div>
                  <div className="text-sm text-slate-700">{showDetail.follow_up_summary}</div>
                </div>
              )}

              {/* 售前专属信息 */}
              {showDetail.order_type === '售前咨询' && (showDetail.house_pit_distance || showDetail.house_water_pressure || showDetail.install_scenario || showDetail.purchase_intent) && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium text-sky-700 mb-2">售前专属信息</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">房屋坑距�?/span><span className="text-slate-800">{showDetail.house_pit_distance || '-'}</span></div>
                    <div><span className="text-slate-500">居家水压�?/span><span className="text-slate-800">{showDetail.house_water_pressure || '-'}</span></div>
                    <div><span className="text-slate-500">安装户型�?/span><span className="text-slate-800">{showDetail.install_scenario || '-'}</span></div>
                    <div><span className="text-slate-500">购买意向�?/span><span className="text-slate-800">{showDetail.purchase_intent || '-'}</span></div>
                  </div>
                </div>
              )}

              {/* 售后专属信息 */}
              {isAftersale(showDetail.order_type) && (showDetail.pit_distance || showDetail.actual_water_pressure || showDetail.installer_name || showDetail.compensation_amount > 0 || (showDetail.evidence_urls && showDetail.evidence_urls.length > 0) || (showDetail.replacement_parts && showDetail.replacement_parts.length > 0)) && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium text-red-700 mb-2">售后专属信息</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {showDetail.pit_distance && <div><span className="text-slate-500">现场坑距�?/span><span className="text-slate-800">{showDetail.pit_distance}</span></div>}
                    {showDetail.actual_water_pressure && <div><span className="text-slate-500">现场水压�?/span><span className="text-slate-800">{showDetail.actual_water_pressure}</span></div>}
                    {showDetail.installer_name && <div><span className="text-slate-500">安装师傅�?/span><span className="text-slate-800">{showDetail.installer_name}</span></div>}
                    {showDetail.compensation_amount > 0 && <div><span className="text-slate-500">赔付金额�?/span><span className="text-red-600 font-medium">¥{showDetail.compensation_amount}</span></div>}
                  </div>
                  {/* 凭证文件 */}
                  {showDetail.evidence_urls && showDetail.evidence_urls.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 mb-1">售后凭证</div>
                      <div className="flex flex-wrap gap-2">
                        {showDetail.evidence_urls.map((url, idx) => {
                          const isVideo = url.includes('.mp4') || url.includes('.mov');
                          return isVideo ? (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg border bg-slate-100 flex items-center justify-center text-xs text-slate-500 hover:bg-slate-200">🎬</a>
                          ) : (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="凭证" className="w-16 h-16 rounded-lg border object-cover hover:opacity-80" /></a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* 补发配件 */}
                  {showDetail.replacement_parts && showDetail.replacement_parts.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 mb-1">补发配件</div>
                      <div className="space-y-1">
                        {showDetail.replacement_parts.map((p, idx) => (
                          <div key={idx} className="text-sm text-slate-700">
                            {p.model} × {p.quantity} {p.tracking_no && <span className="text-xs text-slate-400">单号: {p.tracking_no}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 业务闭环 */}
              {(showDetail.customer_demand || showDetail.final_solution || showDetail.closure_result) && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium text-slate-700 mb-2">业务闭环结果</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-slate-500">核心诉求�?/span><span className="text-slate-800">{showDetail.customer_demand || '-'}</span></div>
                    <div><span className="text-slate-500">处理方案�?/span><span className="text-slate-800">{showDetail.final_solution || '-'}</span></div>
                    <div><span className="text-slate-500">闭环结果�?/span><span className="text-slate-800">{showDetail.closure_result || '-'}</span></div>
                    <div><span className="text-slate-500">责任归属�?/span>
                      <span className={showDetail.responsibility === 'staff_mistake' ? 'text-red-600 font-medium' : 'text-slate-800'}>
                        {showDetail.responsibility ? (RESPONSIBILITY_OPTIONS.find(r => r.value === showDetail.responsibility)?.label || showDetail.responsibility) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 进度�?*/}
              {showDetail.order_type && PROGRESS_FLOW[showDetail.order_type] && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium text-slate-700 mb-2">处理进度</div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {PROGRESS_FLOW[showDetail.order_type].map((step, idx) => {
                      const currentIdx = PROGRESS_FLOW[showDetail.order_type].indexOf(showDetail.progress);
                      const isActive = idx === currentIdx;
                      const isDone = idx < currentIdx;
                      return (
                        <div key={step} className="flex items-center gap-1 shrink-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {isDone ? '�? : idx + 1}
                          </div>
                          <span className={`text-xs whitespace-nowrap ${isActive ? 'text-blue-600 font-medium' : isDone ? 'text-green-600' : 'text-slate-400'}`}>{step}</span>
                          {idx < PROGRESS_FLOW[showDetail.order_type].length - 1 && <div className={`w-4 h-0.5 ${isDone ? 'bg-green-500' : 'bg-slate-200'}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
