'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Plus,
  Trash2,
  Pencil,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface SeatInfo {
  used: number;
  limit: number;
  companyName: string;
}

interface SeatItem {
  id: string;
  email: string;
  name: string;
  position: string;
  role: string;
  status: string;
  created_at: string;
  agent: { id: string; training_stage: string } | null;
}

const POSITION_OPTIONS = [
  { value: '主管', label: '主管' },
  { value: '售前', label: '售前' },
  { value: '售后', label: '售后' },
  { value: '质检', label: '质检' },
  { value: '文员', label: '文员' },
];

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export default function SeatsPage() {
  const { authFetch } = useAuth();
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [seatInfo, setSeatInfo] = useState<SeatInfo>({ used: 0, limit: 1, companyName: '' });
  const [loading, setLoading] = useState(true);

  // 弹窗状�?
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingSeat, setEditingSeat] = useState<SeatItem | null>(null);
  const [deletingSeat, setDeletingSeat] = useState<SeatItem | null>(null);

  // 表单
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPosition, setFormPosition] = useState('售前');
  const [formPassword, setFormPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 提示
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/team/seats');
      const json = await res.json();
      if (json.error) {
        showToast('error', json.error);
      } else {
        setSeats(json.seats || []);
        setSeatInfo(json.seatInfo || { used: 0, limit: 1, companyName: '' });
      }
    } catch {
      showToast('error', '获取坐席列表失败');
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isFull = seatInfo.used >= seatInfo.limit;

  // 添加坐席
  const handleAdd = async () => {
    if (!formName || !formEmail) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/team/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          position: formPosition,
          password: formPassword || generatePassword(),
        }),
      });
      const json = await res.json();
      if (json.error) {
        showToast('error', json.error);
      } else {
        showToast('success', '坐席添加成功');
        setShowAdd(false);
        resetForm();
        fetchData();
      }
    } catch {
      showToast('error', '添加坐席失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 编辑坐席
  const handleEdit = async () => {
    if (!editingSeat) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/team/seats/${editingSeat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          position: formPosition,
        }),
      });
      const json = await res.json();
      if (json.error) {
        showToast('error', json.error);
      } else {
        showToast('success', '坐席信息已更�?);
        setShowEdit(false);
        setEditingSeat(null);
        resetForm();
        fetchData();
      }
    } catch {
      showToast('error', '更新坐席失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除坐席
  const handleDelete = async () => {
    if (!deletingSeat) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/team/seats/${deletingSeat.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.error) {
        showToast('error', json.error);
      } else {
        showToast('success', '坐席已删�?);
        setShowDelete(false);
        setDeletingSeat(null);
        fetchData();
      }
    } catch {
      showToast('error', '删除坐席失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换状态（启用/停用�?
  const handleToggleStatus = async (seat: SeatItem) => {
    const newStatus = seat.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await authFetch(`/api/team/seats/${seat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.error) {
        showToast('error', json.error);
      } else {
        showToast('success', newStatus === 'active' ? '已启�? : '已停�?);
        fetchData();
      }
    } catch {
      showToast('error', '操作失败');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPosition('售前');
    setFormPassword('');
  };

  const openAddDialog = () => {
    resetForm();
    setFormPassword(generatePassword());
    setShowAdd(true);
  };

  const openEditDialog = (seat: SeatItem) => {
    setFormName(seat.name);
    setFormEmail(seat.email);
    setFormPosition(seat.position || '售前');
    setFormPassword('');
    setEditingSeat(seat);
    setShowEdit(true);
  };

  const openDeleteDialog = (seat: SeatItem) => {
    setDeletingSeat(seat);
    setShowDelete(true);
  };

  const positionLabel = (pos: string) => {
    const found = POSITION_OPTIONS.find((p) => p.value === pos);
    return found ? found.label : pos || '未设�?;
  };

  return (
    <div className="min-h-screen bg-blue-50/30">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">坐席管理</h1>
            <p className="text-sm text-gray-500 mt-1">{seatInfo.companyName}</p>
          </div>
          <Button
            onClick={openAddDialog}
            disabled={isFull}
            className="bg-blue-800 hover:bg-blue-900 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            添加坐席
          </Button>
        </div>

        {/* 座位余量卡片 */}
        <div className="bg-white rounded-xl border border-blue-100 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-800" />
              </div>
              <div>
                <p className="text-sm text-gray-500">座位使用情况</p>
                <p className="text-2xl font-bold text-gray-900">
                  已用 <span className="text-blue-800">{seatInfo.used}</span> / {seatInfo.limit} 个坐�?
                </p>
              </div>
            </div>
            <div className="text-right">
              {isFull ? (
                <div className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">座位已满</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">剩余 {seatInfo.limit - seatInfo.used} �?/span>
                </div>
              )}
              {/* 进度�?*/}
              <div className="w-40 h-2 bg-gray-100 rounded-full mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${isFull ? 'bg-red-500' : seatInfo.used / Math.max(seatInfo.limit, 1) > 0.8 ? 'bg-amber-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min((seatInfo.used / Math.max(seatInfo.limit, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {isFull && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              座位已满，无法添加更多坐席。如需增加，请解锁更高版本增加坐席�?
            </div>
          )}
        </div>

        {/* 坐席列表 */}
        <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="ml-2 text-gray-500">加载�?..</span>
            </div>
          ) : seats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Users className="w-12 h-12 mb-3" />
              <p>暂无坐席，点击右上角添加</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {seats.map((seat) => (
                <div
                  key={seat.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* 头像 */}
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-blue-800 font-bold text-sm">
                        {(seat.name || seat.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">{seat.name || '未设置姓�?}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            seat.position === '主管'
                              ? 'bg-purple-100 text-purple-700'
                              : seat.position === '售后'
                                ? 'bg-orange-100 text-orange-700'
                                : seat.position === '质检'
                                  ? 'bg-green-100 text-green-700'
                                  : seat.position === '文员'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {positionLabel(seat.position)}
                        </span>
                        {seat.status === 'suspended' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            已停�?
                          </span>
                        )}
                        {seat.role !== 'staff' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700">
                            {seat.role === 'enterprise_admin' ? '管理�? : seat.role === 'enterprise_manager' ? '主管' : seat.role}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{seat.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* 启用/停用 */}
                    {seat.role === 'staff' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(seat)}
                        className={
                          seat.status === 'active'
                            ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                            : 'text-green-600 border-green-200 hover:bg-green-50'
                        }
                      >
                        {seat.status === 'active' ? '停用' : '启用'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(seat)}
                      className="text-gray-500 hover:text-blue-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {seat.role === 'staff' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(seat)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 添加坐席弹窗 */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加坐席</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="输入坐席姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="用于登录系统"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
                <Select value={formPosition} onValueChange={setFormPosition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  初始密码 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="8位随机密�?
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormPassword(generatePassword())}
                    className="shrink-0"
                  >
                    换一�?
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">请将密码告知坐席，用于首次登�?/p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={submitting}>
              取消
            </Button>
            <Button
              onClick={handleAdd}
              disabled={submitting || !formName || !formEmail}
              className="bg-blue-800 hover:bg-blue-900 text-white"
            >
              {submitting ? '添加�?..' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑坐席弹窗 */}
      <Dialog open={showEdit} onOpenChange={(v) => { setShowEdit(v); if (!v) setEditingSeat(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑坐席</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
                <Select value={formPosition} onValueChange={setFormPosition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEdit(false); setEditingSeat(null); }} disabled={submitting}>
              取消
            </Button>
            <Button
              onClick={handleEdit}
              disabled={submitting}
              className="bg-blue-800 hover:bg-blue-900 text-white"
            >
              {submitting ? '保存�?..' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDelete} onOpenChange={(v) => { setShowDelete(v); if (!v) setDeletingSeat(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除坐席</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            <AlertDialogDescription>
              确定要删除坐席「{deletingSeat?.name || deletingSeat?.email}」吗？删除后该账号将无法登录系统，关联的客服档案也将标记为离职�?
            </AlertDialogDescription>
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? '删除�?..' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
