'use client';

import { useAuth } from '@/lib/auth-context';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  industry: string;
  team_size: number;
  contact_name: string | null;
  contact_phone: string | null;
  plan: string;
  service_level: string;
  status: string;
  created_at: string;
}

const planLabels: Record<string, string> = { free: '免费', monthly: '月付', quarterly: '季付', semiannual: '半年�? };
const statusLabels: Record<string, string> = { active: '活跃', expired: '过期', paused: '暂停' };
const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', expired: 'bg-red-100 text-red-800', paused: 'bg-yellow-100 text-yellow-800' };

export default function CompaniesPage() {
  const { profile, authFetch } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', industry: '卫浴', team_size: 1, contact_name: '', contact_phone: '', plan: 'free', service_level: 'self', status: 'active' });

  const fetchCompanies = useCallback(async () => {
    const res = await authFetch('/api/companies');
    const json = await res.json();
    setCompanies(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const filtered = companies.filter((c) =>
    c.name.includes(search) || (c.contact_name || '').includes(search) || (c.contact_phone || '').includes(search)
  );

  const handleSubmit = async () => {
    if (editing) {
      await authFetch(`/api/companies/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await authFetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setDialogOpen(false);
    setEditing(null);
    resetForm();
    fetchCompanies();
  };

  const handleEdit = (company: Company) => {
    setEditing(company);
    setForm({ name: company.name, industry: company.industry, team_size: company.team_size, contact_name: company.contact_name || '', contact_phone: company.contact_phone || '', plan: company.plan, service_level: company.service_level, status: company.status });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该企业？')) return;
    await authFetch(`/api/companies/${id}`, { method: 'DELETE' });
    fetchCompanies();
  };

  const resetForm = () => setForm({ name: '', industry: '卫浴', team_size: 1, contact_name: '', contact_phone: '', plan: 'free', service_level: 'self', status: 'active' });

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">企业管理</h2>
            <p className="text-muted-foreground">管理所有企业信息与套餐</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />新增企业</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editing ? '编辑企业' : '新增企业'}</DialogTitle>
              </DialogHeader>
              <DialogBody>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">企业名称 *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入企业名�? />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">行业</label>
                    <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">团队规模</label>
                    <Input type="number" value={form.team_size} onChange={(e) => setForm({ ...form, team_size: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">联系�?/label>
                    <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">联系电话</label>
                    <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">套餐</label>
                    <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">免费</SelectItem>
                        <SelectItem value="monthly">月付</SelectItem>
                        <SelectItem value="quarterly">季付</SelectItem>
                        <SelectItem value="semiannual">半年�?/SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">服务等级</label>
                    <Select value={form.service_level} onValueChange={(v) => setForm({ ...form, service_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">自助</SelectItem>
                        <SelectItem value="standard">标准</SelectItem>
                        <SelectItem value="premium">尊享</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">状�?/label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">活跃</SelectItem>
                        <SelectItem value="expired">过期</SelectItem>
                        <SelectItem value="paused">暂停</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              </DialogBody>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); resetForm(); }}>取消</Button>
                <Button onClick={handleSubmit} disabled={!form.name}>{editing ? '保存' : '创建'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索企业名称、联系人..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>企业名称</TableHead>
                  <TableHead>行业</TableHead>
                  <TableHead>团队规模</TableHead>
                  <TableHead>联系�?/TableHead>
                  <TableHead>套餐</TableHead>
                  <TableHead>服务等级</TableHead>
                  <TableHead>状�?/TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无企业数据</TableCell></TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.industry}</TableCell>
                      <TableCell>{c.team_size}</TableCell>
                      <TableCell>{c.contact_name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{planLabels[c.plan] || c.plan}</Badge></TableCell>
                      <TableCell>{c.service_level === 'self' ? '自助' : c.service_level === 'standard' ? '标准' : '尊享'}</TableCell>
                      <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.status] || ''}`}>{statusLabels[c.status] || c.status}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
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
    </>
  );
}
