'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CalendarDays, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, Plus, Loader2,
  Sun, Moon, Sunrise, UserCheck, UserX, Trash2, Edit2,
} from 'lucide-react';

/* ─── Types ─── */
interface ScheduleRecord {
  id: string;
  company_id: string;
  user_id: string;
  shift_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AgentRecord {
  id: string;
  name: string;
  position: string;
  status: string;
}

const SHIFT_PRESETS = [
  { name: '早班', startTime: '08:00', endTime: '16:00' },
  { name: '中班', startTime: '10:00', endTime: '18:00' },
  { name: '晚班', startTime: '14:00', endTime: '22:00' },
  { name: '休息', startTime: '00:00', endTime: '00:00' },
];

const SHIFT_DISPLAY: Record<string, { icon: typeof Sunrise; color: string }> = {
  '早班': { icon: Sunrise, color: 'bg-amber-100 text-amber-700' },
  '中班': { icon: Sun, color: 'bg-blue-100 text-blue-700' },
  '晚班': { icon: Moon, color: 'bg-indigo-100 text-indigo-700' },
  '休息': { icon: UserX, color: 'bg-gray-100 text-gray-500' },
};

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getWeekDates(refDate: Date): string[] {
  const d = new Date(refDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd.toISOString().split('T')[0];
  });
}

function shiftDisplay(shiftName: string) {
  return SHIFT_DISPLAY[shiftName] || SHIFT_DISPLAY['休息'];
}

export default function SchedulingPage() {
  const { profile, authFetch } = useAuth();
  const companyId = profile?.companyId || '';

  // Data
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // View
  const [viewMode, setViewMode] = useState<'week' | 'table'>('week');
  const [weekRef, setWeekRef] = useState(new Date());

  // Dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ScheduleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    user_id: '',
    shift_date: '',
    shift_name: '早班',
    start_time: '08:00',
    end_time: '16:00',
    notes: '',
  });

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);
  const todayStr = new Date().toISOString().split('T')[0];

  // ─── Load data ───
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [agentsRes, schedRes] = await Promise.all([
        authFetch(`/api/agents?company_id=${companyId}&status=在职`),
        authFetch(`/api/schedules?company_id=${companyId}&start_date=${weekDates[0]}&end_date=${weekDates[6]}`),
      ]);
      const agentsData = await agentsRes.json();
      const schedData = await schedRes.json();
      setAgents(agentsData.data || []);
      setSchedules(schedData.data || []);
    } catch {
      toast.error('加载排班数据失败');
    } finally {
      setLoading(false);
    }
  }, [authFetch, companyId, weekDates]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Schedules indexed by user_id + date ───
  const scheduleMap = useMemo(() => {
    const map: Record<string, ScheduleRecord> = {};
    schedules.forEach(s => {
      map[`${s.user_id}_${s.shift_date}`] = s;
    });
    return map;
  }, [schedules]);

  // ─── Stats ───
  const todayOnDuty = useMemo(() => {
    return agents.filter(a => {
      const rec = scheduleMap[`${a.id}_${todayStr}`];
      return rec && rec.shift_name !== '休息';
    }).length;
  }, [agents, scheduleMap, todayStr]);

  const weekCoverage = useMemo(() => {
    let covered = 0;
    let total = agents.length * 7;
    if (total === 0) return 0;
    agents.forEach(a => {
      weekDates.forEach(date => {
        const rec = scheduleMap[`${a.id}_${date}`];
        if (rec && rec.shift_name !== '休息') covered++;
      });
    });
    return Math.round((covered / total) * 100);
  }, [agents, scheduleMap, weekDates]);

  // ─── Navigation ───
  const goPrevWeek = () => {
    setWeekRef(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  };
  const goNextWeek = () => {
    setWeekRef(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  };
  const goThisWeek = () => setWeekRef(new Date());

  // ─── Dialog handlers ───
  const openCreate = (userId?: string, date?: string) => {
    setEditing(null);
    setForm({
      user_id: userId || (agents[0]?.id ?? ''),
      shift_date: date || todayStr,
      shift_name: '早班',
      start_time: '08:00',
      end_time: '16:00',
      notes: '',
    });
    setShowDialog(true);
  };

  const openEdit = (rec: ScheduleRecord) => {
    setEditing(rec);
    setForm({
      user_id: rec.user_id,
      shift_date: rec.shift_date,
      shift_name: rec.shift_name,
      start_time: rec.start_time,
      end_time: rec.end_time,
      notes: rec.notes || '',
    });
    setShowDialog(true);
  };

  const handlePresetChange = (presetName: string) => {
    const preset = SHIFT_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setForm(f => ({ ...f, shift_name: preset.name, start_time: preset.startTime, end_time: preset.endTime }));
    }
  };

  const handleSave = async () => {
    if (!form.user_id || !form.shift_date || !form.shift_name) {
      toast.error('请填写完整的排班信息');
      return;
    }
    // Conflict check: same user, same date, different record
    const existingKey = `${form.user_id}_${form.shift_date}`;
    const existing = scheduleMap[existingKey];
    if (existing && (!editing || editing.id !== existing.id)) {
      toast.error('该员工当天已有排班记录，请先删除后再添加');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // PATCH
        const res = await authFetch(`/api/schedules/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shift_name: form.shift_name,
            start_time: form.start_time,
            end_time: form.end_time,
            notes: form.notes || null,
            updated_at: editing.updated_at,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '修改失败' }));
          if (res.status === 409) {
            toast.error('数据已被其他操作更新，请刷新后重�?);
          } else {
            toast.error(err.error || '修改失败');
          }
          return;
        }
        toast.success('排班修改成功');
      } else {
        // POST
        const res = await authFetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            user_id: form.user_id,
            shift_name: form.shift_name,
            shift_date: form.shift_date,
            start_time: form.start_time,
            end_time: form.end_time,
            notes: form.notes || null,
            created_by: profile?.id,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '创建失败' }));
          toast.error(err.error || '创建失败');
          return;
        }
        toast.success('排班创建成功');
      }
      setShowDialog(false);
      await loadData();
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await authFetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('删除失败');
        return;
      }
      toast.success('排班已删�?);
      await loadData();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  // ─── Agent name lookup ───
  const agentNameMap = useMemo(() => {
    const map: Record<string, AgentRecord> = {};
    agents.forEach(a => { map[a.id] = a; });
    return map;
  }, [agents]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-[#2B7DE9]" />
          排班管理
        </h1>
        <p className="text-gray-500 mt-1">管理客服团队排班，确保时段覆�?/p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">今日在岗</span>
            <UserCheck className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{todayOnDuty}</span>
            <span className="text-sm text-gray-400">/ {agents.length} �?/span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${agents.length > 0 ? (todayOnDuty / agents.length) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">今日排班</span>
            <Clock className="w-4 h-4 text-[#2B7DE9]" />
          </div>
          <div className="mt-3 space-y-1.5">
            {SHIFT_PRESETS.filter(s => s.name !== '休息').map(shift => {
              const count = agents.filter(a => {
                const rec = scheduleMap[`${a.id}_${todayStr}`];
                return rec?.shift_name === shift.name;
              }).length;
              return (
                <div key={shift.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{shift.name} ({shift.startTime}-{shift.endTime})</span>
                  <span className="font-medium text-gray-900">{count}�?/span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">本周覆盖�?/span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900">{weekCoverage}</span>
            <span className="text-sm text-gray-400 ml-1">%</span>
          </div>
          {weekCoverage < 80 ? (
            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> 覆盖率偏低，建议调整排班
            </div>
          ) : (
            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 覆盖率达�?
            </div>
          )}
        </div>
      </div>

      {/* View switch + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500'}`}
          >
            日历视图
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500'}`}
          >
            表格视图
          </button>
        </div>
        <Button onClick={() => openCreate()} size="sm" className="text-xs gap-1 bg-blue-800 hover:bg-blue-900">
          <Plus className="w-3.5 h-3.5" /> 添加排班
        </Button>
      </div>

      {/* Shift legend */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="text-gray-400">班次�?/span>
        {Object.entries(SHIFT_DISPLAY).map(([name, info]) => (
          <span key={name} className={`px-2 py-0.5 rounded ${info.color}`}>
            {name}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <UserX className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>暂无客服成员，请先在「客服管理」中添加客服</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Week calendar view */}
          {viewMode === 'week' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={goPrevWeek}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={goThisWeek} className="text-xs">本周</Button>
                  <Button variant="ghost" size="sm" onClick={goNextWeek}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-gray-500 font-medium w-28">客服</th>
                      {weekDates.map((date, i) => (
                        <th key={date} className="px-3 py-3 text-center font-medium min-w-[80px]">
                          <div className={date === todayStr ? 'text-[#2B7DE9] font-bold' : 'text-gray-500'}>
                            {WEEKDAYS[i]}
                          </div>
                          <div className={`text-xs ${date === todayStr ? 'text-[#2B7DE9]' : 'text-gray-400'}`}>
                            {formatDate(date)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => (
                      <tr key={agent.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-xs text-gray-400">{agent.position}</div>
                        </td>
                        {weekDates.map(date => {
                          const rec = scheduleMap[`${agent.id}_${date}`];
                          const shiftName = rec?.shift_name || '';
                          const info = shiftDisplay(shiftName);
                          const ShiftIcon = info.icon;
                          return (
                            <td key={date} className="px-3 py-3 text-center">
                              {rec ? (
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    onClick={() => openEdit(rec)}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${info.color} ${date === todayStr ? 'ring-2 ring-[#2B7DE9]/30' : ''} hover:opacity-80 transition-opacity cursor-pointer`}
                                  >
                                    <ShiftIcon className="w-3 h-3" />
                                    {shiftName}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(rec.id)}
                                    disabled={deleting === rec.id}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                    title="删除排班"
                                  >
                                    {deleting === rec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openCreate(agent.id, date)}
                                  className="text-xs text-gray-300 hover:text-blue-600 transition-colors border border-dashed border-gray-200 rounded px-2 py-1 hover:border-blue-300"
                                >
                                  <Plus className="w-3 h-3 inline" /> 排班
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table view */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">客服</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">岗位</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-medium">本周出勤</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-medium">早班</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-medium">中班</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-medium">晚班</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-medium">休息</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => {
                      const weekShifts = weekDates.map(d => scheduleMap[`${agent.id}_${d}`]?.shift_name || '');
                      const workDays = weekShifts.filter(s => s && s !== '休息').length;
                      const morningCount = weekShifts.filter(s => s === '早班').length;
                      const middleCount = weekShifts.filter(s => s === '中班').length;
                      const eveningCount = weekShifts.filter(s => s === '晚班').length;
                      const offCount = weekShifts.filter(s => s === '休息').length;
                      return (
                        <tr key={agent.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{agent.name}</td>
                          <td className="px-4 py-3 text-gray-500">{agent.position}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary">{workDays}�?/Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-amber-600 font-medium">{morningCount}</td>
                          <td className="px-4 py-3 text-center text-blue-600 font-medium">{middleCount}</td>
                          <td className="px-4 py-3 text-center text-indigo-600 font-medium">{eveningCount}</td>
                          <td className="px-4 py-3 text-center text-gray-400">{offCount}</td>
                          <td className="px-4 py-3 text-center">
                            <Button variant="ghost" size="sm" onClick={() => openCreate(agent.id)} className="text-xs gap-1">
                              <Plus className="w-3 h-3" /> 排班
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tips */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 space-y-1">
        <p className="font-medium">排班建议</p>
        <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-600">
          <li>确保每个时段至少�?名售中客服和1名售后客服在�?/li>
          <li>周末咨询高峰期建议增加中班客服人�?/li>
          <li>连续排班不超�?天，保障客服休息质量</li>
          <li>售后组长建议安排中班，便于协调早晚班问题</li>
          <li>同一员工同一天不可重复排班，系统会自动检测冲�?/li>
        </ul>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑排班' : '添加排班'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">客服人员</Label>
              <Select
                value={form.user_id}
                onValueChange={v => setForm(f => ({ ...f, user_id: v }))}
                disabled={!!editing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择客服" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.position})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">日期</Label>
              <Input
                type="date"
                value={form.shift_date}
                onChange={e => setForm(f => ({ ...f, shift_date: e.target.value }))}
                disabled={!!editing}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">班次</Label>
              <Select
                value={form.shift_name}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_PRESETS.map(p => (
                    <SelectItem key={p.name} value={p.name}>{p.name} ({p.startTime}-{p.endTime})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">开始时�?/Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">结束时间</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">备注</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="选填"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => { await handleDelete(editing.id); setShowDialog(false); }}
                disabled={saving}
              >
                删除
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-800 hover:bg-blue-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editing ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
