'use client';

import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';

interface User {
  id: string;
  company_id: string;
  email: string;
  display_name: string | null;
  role: string;
  user_type: string;
  ai_credits_remaining: number;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  admin: '超级管理�?,
  enterprise_admin: '企业管理�?,
  enterprise_manager: '客服主管',
  staff: '员工',
};
const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  enterprise_admin: 'bg-sky-100 text-blue-900',
  enterprise_manager: 'bg-blue-100 text-blue-800',
  staff: 'bg-gray-100 text-gray-700',
};
const userTypeLabels: Record<string, string> = {
  small: '小规�?,
  manager: '管理�?,
  premium: '尊享',
};
const userTypeColors: Record<string, string> = {
  small: 'bg-gray-100 text-gray-800',
  manager: 'bg-blue-100 text-blue-800',
  premium: 'bg-slate-100 text-blue-900',
};
const statusLabels: Record<string, string> = {
  active: '正常',
  suspended: '停用',
  deleted: '已删�?,
};
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  deleted: 'bg-red-100 text-red-800',
};

const emptyForm = {
  company_id: '',
  email: '',
  password_hash: '',
  display_name: '',
  role: 'staff',
  user_type: 'small',
  ai_credits_remaining: 3,
  status: 'active',
};

export default function UsersPage() {
  const { profile, authFetch } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 新增/编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  // 删除确认弹窗
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [seatLimitOpen, setSeatLimitOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, companiesRes] = await Promise.all([
        authFetch('/api/users').then((r) => r.json()),
        authFetch('/api/companies').then((r) => r.json()),
      ]);
      setUsers(usersRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (err) {
      console.error('获取数据失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = users.filter(
    (u) =>
      u.email.includes(search) || (u.display_name || '').includes(search)
  );

  // 打开新增弹窗
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      company_id: user.company_id,
      email: user.email,
      password_hash: '',
      display_name: user.display_name || '',
      role: user.role,
      user_type: user.user_type,
      ai_credits_remaining: user.ai_credits_remaining,
      status: user.status,
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
        // 编辑时不�?company_id �?password_hash
        const { company_id: _cid, password_hash: _ph, ...updateData } = form; // eslint-disable-line @typescript-eslint/no-unused-vars
        const res = await authFetch(`/api/users/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        if (!res.ok) throw new Error('更新失败');
      } else {
        // 新增时必须填写密�?
        const res = await authFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (errData.seatLimit) {
            toast.error(errData.error || '已达到当前版本座位上�?);
            setSeatLimitOpen(true);
            setSubmitting(false);
            return;
          }
          throw new Error(errData.error || '创建失败');
        }
      }
      closeDialog();
      fetchData();
    } catch (err) {
      console.error('提交失败', err);
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 打开删除确认
  const openDelete = (user: User) => {
    setDeleteTarget(user);
    setDeleteOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
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

  // 校验：新增时邮箱+密码+企业必填；编辑时邮箱必填
  const canSubmit = editing
    ? !!form.email
    : !!form.email && !!form.company_id && !!form.password_hash;

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
            <p className="text-muted-foreground">管理系统用户与权�?/p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新增用户
          </Button>
        </div>

        {/* 搜索 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索邮箱、姓�?.."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            �?{filtered.length} 条记�?
          </p>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl shadow-md border border-blue-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>人群类型</TableHead>
                  <TableHead>剩余次数</TableHead>
                  <TableHead>状�?/TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {search
                        ? '没有匹配的用户记�?
                        : '暂无用户数据，点击「新增用户」添�?}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.display_name || '-'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[u.role] || ''}`}
                        >
                          {roleLabels[u.role] || u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${userTypeColors[u.user_type] || ''}`}
                        >
                          {userTypeLabels[u.user_type] || u.user_type}
                        </span>
                      </TableCell>
                      <TableCell>{u.ai_credits_remaining}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[u.status] || ''}`}
                        >
                          {statusLabels[u.status] || u.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="编辑"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="删除"
                            onClick={() => openDelete(u)}
                          >
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

      {/* 新增/编辑弹窗 */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑用户' : '新增用户'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
          <div className="grid gap-4 py-4">
            {/* 新增时显示：所属企�?+ 密码 */}
            {!editing && (
              <>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">所属企�?*</label>
                  <Select
                    value={form.company_id}
                    onValueChange={(v) =>
                      setForm({ ...form, company_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择企业" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">密码 *</label>
                  <Input
                    type="password"
                    value={form.password_hash}
                    onChange={(e) =>
                      setForm({ ...form, password_hash: e.target.value })
                    }
                    placeholder="请输入密�?
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <label className="text-sm font-medium">邮箱 *</label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="请输入邮�?
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">姓名</label>
                <Input
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                  placeholder="请输入姓�?
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">角色</label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">员工</SelectItem>
                    <SelectItem value="enterprise_manager">客服主管</SelectItem>
                    <SelectItem value="enterprise_admin">企业管理�?/SelectItem>
                    <SelectItem value="admin">超级管理�?/SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">人群类型</label>
                <Select
                  value={form.user_type}
                  onValueChange={(v) => setForm({ ...form, user_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">small</SelectItem>
                    <SelectItem value="manager">manager</SelectItem>
                    <SelectItem value="premium">premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">剩余次数</label>
                <Input
                  type="number"
                  value={form.ai_credits_remaining}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ai_credits_remaining: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">状�?/label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="suspended">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
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
              确定要删除用户「{deleteTarget?.email}」吗？此操作不可撤销�?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 座位超限升级弹窗 */}
      <AlertDialog open={seatLimitOpen} onOpenChange={setSeatLimitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>座位数已达上�?/AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>当前版本最多支持该数量的团队成员，无法继续添加�?/span>
              <span className="block text-slate-700">咨询开通旗舰版可扩展至15人，解锁更多名额与深度管控功能�?/span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>稍后再说</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/contact" className="bg-[#0F2B46] text-white hover:bg-[#1a3a5c]">
                咨询开�?
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
