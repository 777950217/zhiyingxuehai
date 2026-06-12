'use client';

import { useAuth } from '@/lib/auth-context';
import { markOnboardingDay } from '@/lib/onboarding-helpers';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogBody,
} from '@/components/ui/alert-dialog';
import { PageHint } from '@/components/page-hint';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Loader2, Award } from 'lucide-react';

interface Agent {
  id: string;
  company_id: string;
  name: string;
  employee_id: string | null;
  hire_date: string | null;
  position: string;
  training_stage: string;
  status: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

const positionLabels: Record<string, string> = { '售中客服': '售中客服', '售后客服': '售后客服', '组长': '组长', '主管': '主管' };
const trainingLabels: Record<string, string> = { '基础': '基础', '售中': '售中', '售后': '售后', '进阶': '进阶', '独立上岗': '独立上岗' };
const trainingColors: Record<string, string> = { '基础': 'bg-gray-100 text-gray-800', '售中': 'bg-blue-100 text-blue-800', '售后': 'bg-indigo-100 text-indigo-800', '进阶': 'bg-green-100 text-green-800', '独立上岗': 'bg-emerald-100 text-emerald-800' };
const statusLabels: Record<string, string> = { '在职': '在职', '离职': '离职', '试用': '试用' };
const statusColors: Record<string, string> = { '在职': 'bg-green-100 text-green-800', '离职': 'bg-red-100 text-red-800', '试用': 'bg-yellow-100 text-yellow-800' };

const emptyForm = { company_id: '', name: '', employee_id: '', hire_date: '', position: '售中客服', training_stage: '基础', status: '在职' };

export default function AgentsPage() {
  const router = useRouter();
  const { profile, authFetch } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 新增/编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  // 删除确认弹窗
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [seatLimitOpen, setSeatLimitOpen] = useState(false);
  const [seatLimitMsg, setSeatLimitMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, companiesRes] = await Promise.all([
        authFetch('/api/agents').then((r) => r.json()),
        authFetch('/api/companies').then((r) => r.json()),
      ]);
      setAgents(agentsRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (err) {
      console.error('获取数据失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const companyNameMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  const filtered = agents.filter((a) =>
    a.name.includes(search) || (a.employee_id || '').includes(search)
  );

  // 打开新增弹窗
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      company_id: agent.company_id,
      name: agent.name,
      employee_id: agent.employee_id || '',
      hire_date: agent.hire_date ? agent.hire_date.split('T')[0] : '',
      position: agent.position,
      training_stage: agent.training_stage,
      status: agent.status,
    });
    setDialogOpen(true);
  };

  // 关闭弹窗
  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
  };

  // 提交表单
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editing) {
        const { company_id: _cid, ...updateData } = form; // eslint-disable-line @typescript-eslint/no-unused-vars
        const res = await authFetch(`/api/agents/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        if (!res.ok) throw new Error('更新失败');
      } else {
        const res = await authFetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          if (errData?.code === 'SEAT_LIMIT_EXCEEDED') {
            setSeatLimitMsg(errData.message);
            setSeatLimitOpen(true);
            return;
          }
          throw new Error('创建失败');
        }
        // Day1: 配置团队人员权限 �?完成
        markOnboardingDay(authFetch, 1);
      }
      closeDialog();
      fetchData();
    } catch (err) {
      console.error('提交失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 打开删除确认
  const openDelete = (agent: Agent) => {
    setDeleteTarget(agent);
    setDeleteOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/agents/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('删除失败', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">客服管理</h2>
            <PageHint text="管好你的人——客服档案、在岗状态、培训进度，团队状况全掌握�? />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />新增客服
          </Button>
        </div>

        {/* 搜索 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索姓名、工�?.." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <p className="text-sm text-muted-foreground">�?{filtered.length} 条记�?/p>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>工号</TableHead>
                  <TableHead>所属企�?/TableHead>
                  <TableHead>岗位</TableHead>
                  <TableHead>培训阶段</TableHead>
                  <TableHead>入职日期</TableHead>
                  <TableHead>状�?/TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {search ? '没有匹配的客服记�? : '暂无客服数据，点击「新增客服」添�?}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.employee_id || '-'}</TableCell>
                      <TableCell>{companyNameMap[a.company_id] || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{positionLabels[a.position] || a.position}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${trainingColors[a.training_stage] || ''}`}>
                          {trainingLabels[a.training_stage] || a.training_stage}
                        </span>
                      </TableCell>
                      <TableCell>{a.hire_date ? new Date(a.hire_date).toLocaleDateString('zh-CN') : '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status] || ''}`}>
                          {statusLabels[a.status] || a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="考核历史" onClick={() => router.push(`/kpi-assessment/agent/${a.id}`)}>
                            <Award className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="编辑" onClick={() => openEdit(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="删除" onClick={() => openDelete(a)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 - 受控 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑客服' : '新增客服'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
          <div className="grid gap-4 py-4">
            {!editing && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">所属企�?*</label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="选择企业" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">姓名 *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入姓�? />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">工号</label>
                <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="�?WY001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">入职日期</label>
                <Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">岗位</label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="售中客服">售中客服</SelectItem>
                    <SelectItem value="售后客服">售后客服</SelectItem>
                    <SelectItem value="组长">组长</SelectItem>
                    <SelectItem value="主管">主管</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">培训阶段</label>
                <Select value={form.training_stage} onValueChange={(v) => setForm({ ...form, training_stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="基础">基础</SelectItem>
                    <SelectItem value="售中">售中</SelectItem>
                    <SelectItem value="售后">售后</SelectItem>
                    <SelectItem value="进阶">进阶</SelectItem>
                    <SelectItem value="独立上岗">独立上岗</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">状�?/label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="在职">在职</SelectItem>
                    <SelectItem value="试用">试用</SelectItem>
                    <SelectItem value="离职">离职</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.name || (!editing && !form.company_id)}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除客服「{deleteTarget?.name}」吗？此操作不可撤销�?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seatLimitOpen} onOpenChange={setSeatLimitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>座位数已达上�?/AlertDialogTitle>
            <AlertDialogDescription>{seatLimitMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>关闭</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href="/contact" className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white">咨询开�?/a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
