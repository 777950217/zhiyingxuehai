'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { useAuth } from '@/lib/auth-context';
import { getPlanLimits, formatLimit, isOverLimit } from '@/lib/plan-limits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { PageHint } from '@/components/page-hint';
import { PermissionLocked } from '@/components/permission-locked';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus, Pencil, Trash2, Users, UserCheck, UserX, ShieldCheck, AlertTriangle,
  Calendar, BarChart3, Clock, Tag, X, ChevronLeft, ChevronRight, ChevronDown,
  Flame, Wifi, WifiOff, Eye, Zap, Copy, Sparkles,
} from 'lucide-react';

/* ─── Types ─── */
interface Agent {
  id: string;
  name: string;
  position: string;
  status: string;
  role_tag?: string;
  skill_tags?: string[];
  last_login_at?: string | null;
}

interface Team {
  id: string;
  name: string;
  type: string;
  leader_id: string | null;
  leader_name: string | null;
  members: Agent[];
}

interface ScheduleEntry {
  id: string;
  agent_id: string;
  agent_name: string;
  shift_date: string;
  shift_type: string;
}

type ProTab = 'members' | 'schedule' | 'promotion' | 'overview';

const ROLE_OPTIONS = ['售前', '售后', '专项'];
const SKILL_PRESETS = ['退款处�?, '投诉应对', '安装指导', '产品专家', '促销话术', '数据录入'];
const SHIFT_TYPES = ['早班', '中班', '晚班', '休息'];
const SHIFT_COLORS: Record<string, string> = {
  '早班': 'bg-sky-100 text-sky-700 border-sky-200',
  '中班': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '晚班': 'bg-purple-100 text-purple-700 border-purple-200',
  '休息': 'bg-slate-100 text-slate-500 border-slate-200',
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  presale: { label: '售前', color: 'bg-sky-100 text-sky-700' },
  aftersale: { label: '售后', color: 'bg-emerald-100 text-emerald-700' },
  general: { label: '通用', color: 'bg-slate-100 text-slate-600' },
};

/* ─── helpers ─── */
function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['一', '�?, '�?, '�?, '�?, '�?, '�?];

function isOnline(lastLogin: string | null | undefined): boolean {
  if (!lastLogin) return false;
  const diff = Date.now() - new Date(lastLogin).getTime();
  return diff < 30 * 60 * 1000; // 30 minutes
}

function timeAgo(ts: string | null): string {
  if (!ts) return '从未登录';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

/* ══════════════════════════════════════════════════════════�?
   Main Component
   ══════════════════════════════════════════════════════════�?*/
export default function TeamsPage() {
  const { profile, authFetch } = useAuth();
  const role = profile?.role;
  const isPro = role === 'enterprise_manager';
  const isEnterprise = profile?.companyPlan === 'enterprise' || role === 'admin';

  /* ─── shared state ─── */
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassigned, setUnassigned] = useState<Agent[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── flagship dialog states ─── */
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('general');
  const [formLeaderId, setFormLeaderId] = useState('');
  const [formMemberIds, setFormMemberIds] = useState<string[]>([]);
  const [editingTeamId, setEditingTeamId] = useState('');

  /* ─── pro tab state ─── */
  const [proTab, setProTab] = useState<ProTab>('members');
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingShift, setEditingShift] = useState<{ agentId: string; date: string } | null>(null);
  const [dashStats, setDashStats] = useState({ onlineCount: 0, todayOrders: 0, avgResponse: '' });

  /* ─── pro member dialog ─── */
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberName, setAddMemberName] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('售前');
  const [addMemberSkills, setAddMemberSkills] = useState<string[]>([]);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editMemberRole, setEditMemberRole] = useState('售前');
  const [editMemberSkills, setEditMemberSkills] = useState<string[]>([]);

  const limits = getPlanLimits(role, profile?.companyPlan);

  /* ─── data loading ─── */
  const loadData = useCallback(async () => {
    if (!profile?.companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/teams?company_id=${profile.companyId}`);
      if (res.ok) {
        const json = await res.json();
        setTeams(json.data || []);
        setUnassigned(json.unassigned || []);
      }
      const agentRes = await authFetch(`/api/agents?company_id=${profile.companyId}`);
      if (agentRes.ok) {
        const agentJson = await agentRes.json();
        setAllAgents((agentJson.data || []).filter((a: Agent) => a.status !== '离职'));
      }
    } catch (e) {
      console.error('加载班组数据失败', e);
    }
    setLoading(false);
  }, [profile?.companyId, authFetch]);

  const loadSchedules = useCallback(async () => {
    if (!profile?.companyId) return;
    const weekDates = getWeekDates(weekOffset);
    const start = fmtDate(weekDates[0]);
    const end = fmtDate(weekDates[6]);
    try {
      const res = await authFetch(`/api/schedules?company_id=${profile.companyId}&start=${start}&end=${end}`);
      if (res.ok) {
        const json = await res.json();
        setSchedules(json.data || []);
      }
    } catch (e) {
      console.error('加载排班数据失败', e);
    }
  }, [profile?.companyId, authFetch, weekOffset]);

  const loadDashStats = useCallback(async () => {
    if (!profile?.companyId) return;
    try {
      const res = await authFetch(`/api/dashboard?company_id=${profile.companyId}`);
      if (res.ok) {
        const json = await res.json();
        setDashStats({
          onlineCount: json.onlineCount ?? allAgents.length,
          todayOrders: json.todayOrders ?? 0,
          avgResponse: json.avgResponse ?? '--',
        });
      }
    } catch {
      // fallback
    }
  }, [profile?.companyId, authFetch, allAgents.length]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (isPro) { loadSchedules(); loadDashStats(); } }, [isPro, loadSchedules, loadDashStats]);

  /* ─── flagship CRUD ─── */
  const handleOpenCreate = () => {
    if (isOverLimit(teams.length, limits.maxTeams)) {
      setUpgradeMsg(`当前版本最多支�?{formatLimit(limits.maxTeams)}个班组，开通旗舰版可创建更多`);
      setShowUpgrade(true);
      return;
    }
    setFormName(''); setFormType('general'); setFormLeaderId(''); setFormMemberIds([]);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error('请输入班组名�?); return; }
    try {
      const res = await authFetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: profile?.companyId, name: formName.trim(), type: formType, leader_id: formLeaderId || null, member_ids: formMemberIds }),
      });
      if (res.status === 403) {
        setUpgradeMsg(`当前版本最多支�?{formatLimit(limits.maxTeams)}个班组，开通旗舰版可创建更多`);
        setShowUpgrade(true); setShowCreate(false); return;
      }
      if (!res.ok) throw new Error('创建失败');
      toast.success('班组创建成功'); setShowCreate(false); loadData();
    } catch { toast.error('创建班组失败'); }
  };

  const handleOpenEdit = (team: Team) => {
    setEditingTeamId(team.id); setFormName(team.name); setFormType(team.type);
    setFormLeaderId(team.leader_id || ''); setFormMemberIds(team.members.map((m: Agent) => m.id));
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!formName.trim()) { toast.error('请输入班组名�?); return; }
    try {
      await authFetch(`/api/teams/${editingTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), type: formType, leader_id: formLeaderId || null }),
      });
      const currentMemberIds = teams.find(t => t.id === editingTeamId)?.members.map((m: Agent) => m.id) || [];
      const addedIds = formMemberIds.filter(id => !currentMemberIds.includes(id));
      const removedIds = currentMemberIds.filter(id => !formMemberIds.includes(id));
      if (addedIds.length > 0) {
        await authFetch(`/api/teams/${editingTeamId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_ids: addedIds }) });
      }
      if (removedIds.length > 0) {
        await authFetch(`/api/teams/${editingTeamId}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_ids: removedIds }) });
      }
      toast.success('班组更新成功'); setShowEdit(false); loadData();
    } catch { toast.error('更新班组失败'); }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('删除班组后，成员将变为未分配状态，确定删除�?)) return;
    try {
      await authFetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      toast.success('班组已删�?); loadData();
    } catch { toast.error('删除班组失败'); }
  };

  const toggleMember = (agentId: string) => {
    setFormMemberIds(prev => prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]);
  };

  const getAvailableAgents = () => {
    const assignedToOtherTeams = new Set<string>();
    teams.forEach(t => { if (t.id !== editingTeamId) t.members.forEach((m: Agent) => assignedToOtherTeams.add(m.id)); });
    return allAgents.filter(a => !assignedToOtherTeams.has(a.id));
  };

  const typeBadge = (type: string) => {
    const info = TYPE_LABELS[type] || TYPE_LABELS.general;
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>;
  };

  /* ─── pro: member CRUD ─── */
  const handleAddMember = async () => {
    if (!addMemberName.trim()) { toast.error('请输入成员姓�?); return; }
    try {
      await authFetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: profile?.companyId, name: addMemberName.trim(), position: addMemberRole === '售前' ? '售中客服' : addMemberRole === '售后' ? '售后客服' : '组长', role_tag: addMemberRole, skill_tags: addMemberSkills }),
      });
      toast.success('成员添加成功'); setShowAddMember(false); setAddMemberName(''); setAddMemberRole('售前'); setAddMemberSkills([]);
      loadData();
    } catch { toast.error('添加成员失败'); }
  };

  const handleUpdateMember = async () => {
    if (!editMemberId) return;
    try {
      await authFetch(`/api/agents/${editMemberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_tag: editMemberRole, skill_tags: editMemberSkills }),
      });
      toast.success('成员信息已更�?); setEditMemberId(null); loadData();
    } catch { toast.error('更新成员失败'); }
  };

  const handleRemoveMember = async (agentId: string) => {
    if (!confirm('确定移除该成员？')) return;
    try {
      await authFetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      toast.success('成员已移�?); loadData();
    } catch { toast.error('移除成员失败'); }
  };

  /* ─── pro: schedule ─── */
  const handleShiftClick = (agentId: string, date: string) => {
    setEditingShift({ agentId, date });
  };

  const handleSetShift = async (shiftType: string) => {
    if (!editingShift) return;
    try {
      await authFetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: profile?.companyId, agent_id: editingShift.agentId, shift_date: editingShift.date, shift_type: shiftType }),
      });
      toast.success('排班已更�?);
      setEditingShift(null);
      loadSchedules();
    } catch { toast.error('排班更新失败'); }
  };

  const getShiftForCell = (agentId: string, date: string): ScheduleEntry | undefined => {
    return schedules.find(s => s.agent_id === agentId && s.shift_date === date);
  };

  /* ─── locked: staff ─── */
  if (role === 'staff') {
    return (
      <PermissionLocked
        title="班组管理需要管理员权限"
        description="请联系您的管理员开通专业版或旗舰版"
      />
    );
  }

  /* ══════════════════════════════════════════════════════════�?
     专业版视图：单班组管�?
     ══════════════════════════════════════════════════════════�?*/
  if (isPro) {
    const weekDates = getWeekDates(weekOffset);
    const proAgents = allAgents.filter(a => a.status === '在职');
    const onlineAgents = proAgents.filter(a => isOnline(a.last_login_at));

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">班组管理</h1>
        <PageHint text="管理你的团队——成员、排班、大促预案、在岗监控，一目了然�? />

        {/* Tab bar */}
        <div className="mt-5 flex gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
          {([
            { key: 'members' as ProTab, label: '成员管理', icon: Users },
            { key: 'schedule' as ProTab, label: '排班', icon: Calendar },
            { key: 'promotion' as ProTab, label: '大促预案', icon: Flame },
            { key: 'overview' as ProTab, label: '数据概览', icon: BarChart3 },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setProTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${proTab === tab.key ? 'bg-white text-[#0F2B46] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── 成员管理 Tab ─── */}
        {proTab === 'members' && (
          <div className="mt-5">
            {/* 在岗状态概�?*/}
            <div className="flex items-center gap-3 mb-4 bg-slate-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-slate-700">在线 {onlineAgents.length}</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-1.5 text-sm">
                <WifiOff className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">离线 {proAgents.length - onlineAgents.length}</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <span className="text-sm text-slate-500">�?{proAgents.length} �?/span>
              <div className="ml-auto">
                <Button onClick={() => { setAddMemberName(''); setAddMemberRole('售前'); setAddMemberSkills([]); setShowAddMember(true); }} className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> 添加成员
                </Button>
              </div>
            </div>

            {proAgents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>还没有团队成�?/p>
                <p className="text-sm mt-1">点击上方按钮添加第一位成�?/p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">姓名</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">状�?/th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">角色</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">技能标�?/th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">职位</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proAgents.map(agent => {
                      const online = isOnline(agent.last_login_at);
                      return (
                        <tr key={agent.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-medium">{agent.name.charAt(0)}</span>
                              <span className="font-medium text-slate-800">{agent.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              {online ? '在线' : '离线'}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">{timeAgo(agent.last_login_at ?? null)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              agent.role_tag === '售后' ? 'bg-emerald-100 text-emerald-700' :
                              agent.role_tag === '专项' ? 'bg-purple-100 text-purple-700' :
                              'bg-sky-100 text-sky-700'
                            }`}>{agent.role_tag || '售前'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(agent.skill_tags || []).length > 0 ? agent.skill_tags!.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{tag}</span>
                              )) : <span className="text-xs text-slate-400">--</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{agent.position}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => { setEditMemberId(agent.id); setEditMemberRole(agent.role_tag || '售前'); setEditMemberSkills(agent.skill_tags || []); }} className="text-sky-500 hover:text-sky-600 text-xs mr-3">编辑</button>
                            <button onClick={() => handleRemoveMember(agent.id)} className="text-red-400 hover:text-red-500 text-xs">移除</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── 排班 Tab ─── */}
        {proTab === 'schedule' && (
          <div className="mt-5">
            {/* Week nav */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-md hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">
                  {fmtDate(weekDates[0])} ~ {fmtDate(weekDates[6])}
                </span>
                <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-md hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setWeekOffset(0)} className="text-xs text-sky-500 hover:text-sky-600 ml-2">本周</button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {SHIFT_TYPES.map(st => (
                  <span key={st} className={`px-2 py-0.5 rounded border ${SHIFT_COLORS[st]}`}>{st}</span>
                ))}
              </div>
            </div>

            {/* 快捷批量排班 */}
            <div className="mb-4 bg-sky-50 border border-sky-100 rounded-lg p-3">
              <p className="text-xs text-sky-700 font-medium mb-2">快捷操作：点击空白单元格设置班次，点击已有班次可修改</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={async () => {
                  if (!profile?.companyId) return;
                  const today = fmtDate(new Date());
                  const onDuty = proAgents.filter(a => isOnline(a.last_login_at));
                  if (onDuty.length === 0) { toast.info('当前没有在线成员'); return; }
                  try {
                    await Promise.all(onDuty.map(a => authFetch('/api/schedules', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ company_id: profile.companyId, agent_id: a.id, shift_date: today, shift_type: '早班' }),
                    })));
                    toast.success(`已为${onDuty.length}名在线成员设置今日早班`);
                    loadSchedules();
                  } catch { toast.error('批量排班失败'); }
                }}>
                  <Zap className="w-3 h-3 mr-1" />在线成员排早�?
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={async () => {
                  if (!profile?.companyId) return;
                  const today = fmtDate(new Date());
                  try {
                    await Promise.all(proAgents.map(a => authFetch('/api/schedules', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ company_id: profile.companyId, agent_id: a.id, shift_date: today, shift_type: '休息' }),
                    })));
                    toast.success(`已将${proAgents.length}名成员设为今日休息`);
                    loadSchedules();
                  } catch { toast.error('批量操作失败'); }
                }}>
                  全员休息
                </Button>
              </div>
            </div>

            {proAgents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>请先添加团队成员</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-24 sticky left-0 bg-slate-50 z-10">成员</th>
                      {weekDates.map((d, i) => (
                        <th key={i} className="text-center px-2 py-2 font-medium text-slate-600 min-w-[80px]">
                          <div className="text-xs text-slate-400">周{WEEKDAY_NAMES[i]}</div>
                          <div className="text-xs">{d.getDate()}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {proAgents.map(agent => (
                      <tr key={agent.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline(agent.last_login_at) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-medium">{agent.name.charAt(0)}</span>
                            <span className="text-xs font-medium text-slate-700">{agent.name}</span>
                          </div>
                        </td>
                        {weekDates.map((d, i) => {
                          const dateStr = fmtDate(d);
                          const entry = getShiftForCell(agent.id, dateStr);
                          const isEditing = editingShift?.agentId === agent.id && editingShift?.date === dateStr;
                          return (
                            <td key={i} className="px-1 py-1 text-center">
                              {isEditing ? (
                                <div className="flex flex-col gap-0.5">
                                  {SHIFT_TYPES.map(st => (
                                    <button key={st} onClick={() => handleSetShift(st)} className={`text-[10px] px-1 py-0.5 rounded border ${SHIFT_COLORS[st]} hover:opacity-80`}>{st}</button>
                                  ))}
                                  <button onClick={() => setEditingShift(null)} className="text-[10px] text-slate-400 hover:text-slate-600 mt-0.5">取消</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleShiftClick(agent.id, dateStr)}
                                  className={`text-xs px-2 py-1 rounded border min-w-[48px] transition-colors ${
                                    entry ? SHIFT_COLORS[entry.shift_type] || 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-sky-300'
                                  }`}
                                >
                                  {entry ? entry.shift_type : '�?}
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
            )}
          </div>
        )}

        {/* ─── 大促预案 Tab ─── */}
        {proTab === 'promotion' && (
          <div className="mt-5">
            <PromoPlanSection userId={profile?.id || ''} agentCount={proAgents.length} />
          </div>
        )}

        {/* ─── 数据概览 Tab ─── */}
        {proTab === 'overview' && (
          <div className="mt-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 成员�?*/}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center"><Users className="w-5 h-5 text-sky-600" /></div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{proAgents.length}</div>
                    <div className="text-xs text-slate-500">团队成员�?/div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {ROLE_OPTIONS.map(r => {
                    const count = proAgents.filter(a => (a.role_tag || '售前') === r).length;
                    return count > 0 ? (
                      <span key={r} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{r}: {count}�?/span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* 在岗状�?*/}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Wifi className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{onlineAgents.length}<span className="text-sm text-slate-400 font-normal">/{proAgents.length}</span></div>
                    <div className="text-xs text-slate-500">当前在线</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">在线: {onlineAgents.length}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">离线: {proAgents.length - onlineAgents.length}</span>
                </div>
              </div>

              {/* 今日工作�?*/}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-amber-600" /></div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{dashStats.todayOrders}</div>
                    <div className="text-xs text-slate-500">今日工单�?/div>
                  </div>
                </div>
              </div>

              {/* 今日排班 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Clock className="w-5 h-5 text-purple-600" /></div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">
                      {schedules.filter(s => s.shift_date === fmtDate(new Date()) && s.shift_type !== '休息').length}
                    </div>
                    <div className="text-xs text-slate-500">今日在岗人数</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {SHIFT_TYPES.filter(st => st !== '休息').map(st => {
                    const count = schedules.filter(s => s.shift_date === fmtDate(new Date()) && s.shift_type === st).length;
                    return count > 0 ? (
                      <span key={st} className={`text-xs px-2 py-0.5 rounded border ${SHIFT_COLORS[st]}`}>{st}: {count}�?/span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            {/* 在岗状态明�?*/}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-500" /> 在岗状态监�?
              </h3>
              {proAgents.length === 0 ? (
                <p className="text-sm text-slate-400">暂无成员</p>
              ) : (
                <div className="space-y-2">
                  {proAgents.map(agent => {
                    const online = isOnline(agent.last_login_at);
                    const todaySchedule = schedules.find(s => s.agent_id === agent.id && s.shift_date === fmtDate(new Date()));
                    return (
                      <div key={agent.id} className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${online ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-medium">{agent.name.charAt(0)}</span>
                          <span className="text-sm font-medium text-slate-700">{agent.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${online ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{online ? '在线' : '离线'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {todaySchedule ? (
                            <span className={`px-2 py-0.5 rounded border ${SHIFT_COLORS[todaySchedule.shift_type]}`}>{todaySchedule.shift_type}</span>
                          ) : (
                            <span className="text-slate-400">未排�?/span>
                          )}
                          <span className="text-slate-400">最后活�? {timeAgo(agent.last_login_at ?? null)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 今日排班明细 */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-medium text-slate-800 mb-3">今日排班</h3>
              {(() => {
                const todayStr = fmtDate(new Date());
                const todaySchedules = schedules.filter(s => s.shift_date === todayStr);
                if (todaySchedules.length === 0) {
                  return <p className="text-sm text-slate-400">今日暂无排班数据</p>;
                }
                return (
                  <div className="flex flex-wrap gap-3">
                    {todaySchedules.map(s => (
                      <div key={s.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                        <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-medium">{s.agent_name.charAt(0)}</span>
                        <span className="text-sm font-medium text-slate-700">{s.agent_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${SHIFT_COLORS[s.shift_type] || ''}`}>{s.shift_type}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ─── Add Member Dialog ─── */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>添加团队成员</DialogTitle></DialogHeader>
            <DialogBody>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">姓名 <span className="text-red-500">*</span></label>
                <Input value={addMemberName} onChange={e => setAddMemberName(e.target.value)} placeholder="输入成员姓名" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">角色</label>
                <div className="flex gap-2">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r} onClick={() => setAddMemberRole(r)} className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${addMemberRole === r ? 'bg-[#0F2B46] text-white border-[#0F2B46]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">技能标�?/label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_PRESETS.map(skill => (
                    <button key={skill} onClick={() => setAddMemberSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])} className={`text-xs px-2 py-1 rounded-md border transition-colors ${addMemberSkills.includes(skill) ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{skill}</button>
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMember(false)}>取消</Button>
              <Button onClick={handleAddMember} className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white">添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Edit Member Dialog ─── */}
        <Dialog open={!!editMemberId} onOpenChange={open => { if (!open) setEditMemberId(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>编辑成员</DialogTitle></DialogHeader>
            <DialogBody>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">角色</label>
                <div className="flex gap-2">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r} onClick={() => setEditMemberRole(r)} className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${editMemberRole === r ? 'bg-[#0F2B46] text-white border-[#0F2B46]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">技能标�?/label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_PRESETS.map(skill => (
                    <button key={skill} onClick={() => setEditMemberSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])} className={`text-xs px-2 py-1 rounded-md border transition-colors ${editMemberSkills.includes(skill) ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{skill}</button>
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMemberId(null)}>取消</Button>
              <Button onClick={handleUpdateMember} className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white">保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════�?
     旗舰版视图：多班组管理（保持原逻辑�?
     ══════════════════════════════════════════════════════════�?*/
  if (!isEnterprise) {
    return (
      <PermissionLocked
        title="班组管理为旗舰版专属功能"
        description="升级旗舰版即可使用多班组跨组管控、权限分级等高级功能"
      />
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <OnboardingGuide
        guideKey="teams-guide"
        steps={[
          { title: '创建班次（早/�?晚）', description: '在排班管理中创建不同时段的班�? },
          { title: '给员工排�?, description: '将客服人员分配到对应班次' },
          { title: '发布排班�?, description: '确认排班后发布，团队即可查看' },
        ]}
      />
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-800">班组管理</h1>
        <Button onClick={handleOpenCreate} className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white">
          <Plus className="w-4 h-4 mr-1" /> 创建班组
        </Button>
      </div>
      <PageHint text="把客服分到班组——售前归售前、售后归售后，各管各的、各看各的�? />

      {limits.maxTeams !== Infinity && (
        <div className="mt-3 text-xs text-slate-400">
          班组上限：{teams.length}/{formatLimit(limits.maxTeams)}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-center text-slate-400">加载�?..</div>
      ) : teams.length === 0 ? (
        <div className="mt-12 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">还没有创建班�?/p>
          <p className="text-slate-400 text-sm mt-1">点击上方按钮创建第一个班�?/p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{team.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {typeBadge(team.type)}
                    {team.leader_name && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> {team.leader_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenEdit(team)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-sky-500 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(team.id)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="text-xs text-slate-400 mb-2">成员 ({team.members.length})</div>
                {team.members.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.slice(0, 8).map((m: Agent) => (
                      <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded-md">
                        <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-medium">{m.name.charAt(0)}</span>
                        {m.name}
                        {m.id === team.leader_id && <ShieldCheck className="w-3 h-3 text-amber-500" />}
                      </span>
                    ))}
                    {team.members.length > 8 && (
                      <span className="text-xs text-slate-400 px-2 py-1">+{team.members.length - 8}�?/span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">暂无成员</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-1">
            <UserX className="w-4 h-4" /> 未分配班组的客服 ({unassigned.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(a => (
              <span key={a.id} className="inline-flex items-center gap-1 text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-medium">{a.name.charAt(0)}</span>
                {a.name}
                <span className="text-[10px] text-amber-500">{a.position}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ===== Create Dialog ===== */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>创建班组</DialogTitle></DialogHeader>
          <DialogBody>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">班组名称 <span className="text-red-500">*</span></label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="如：售前一�? />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">班组类型</label>
              <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="general">通用</option>
                <option value="presale">售前</option>
                <option value="aftersale">售后</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">班组�?/label>
              <select value={formLeaderId} onChange={e => setFormLeaderId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">-- 选择班组�?--</option>
                {allAgents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.position})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">初始成员</label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {allAgents.filter(a => a.status !== '离职').map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={formMemberIds.includes(a.id)} onChange={() => toggleMember(a.id)} className="rounded" />
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-medium">{a.name.charAt(0)}</span>
                    {a.name}
                    <span className="text-xs text-slate-400">{a.position}</span>
                  </label>
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white">创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Dialog ===== */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>编辑班组</DialogTitle></DialogHeader>
          <DialogBody>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">班组名称 <span className="text-red-500">*</span></label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">班组类型</label>
              <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="general">通用</option>
                <option value="presale">售前</option>
                <option value="aftersale">售后</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">班组�?/label>
              <select value={formLeaderId} onChange={e => setFormLeaderId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">-- 选择班组�?--</option>
                {allAgents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.position})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">成员管理</label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {getAvailableAgents().map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={formMemberIds.includes(a.id)} onChange={() => toggleMember(a.id)} className="rounded" />
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-medium">{a.name.charAt(0)}</span>
                    {a.name}
                    <span className="text-xs text-slate-400">{a.position}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button onClick={handleEdit} className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Upgrade Dialog ===== */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-4">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
            <p className="text-slate-700 font-medium mb-1">无法创建更多班组</p>
            <p className="text-sm text-slate-500">{upgradeMsg}</p>
            <Link href="/contact" className="mt-4 inline-block">
              <Button className="bg-[#2B7DE9] hover:bg-[#1a6dd4] text-white mt-2">咨询开�?/Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════�?
   大促预案内联组件（精简版，整合�?tab-promotion-plan.tsx�?
   ══════════════════════════════════════════════════════════�?*/
function PromoPlanSection({ userId, agentCount }: { userId: string; agentCount: number }) {
  const [promoPlan, setPromoPlan] = useState({
    name: '', startDate: '', endDate: '', volumeMultiplier: '2', activityType: '大促',
    teamSize: agentCount || 3, addStaffCount: 2, maxWorkHours: 10, tempStaff: '',
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ basic: true, staff: true, shifts: true, scripts: true, emergency: true });
  const [promoHistory, setPromoHistory] = useState<{ id: string; name: string; date: string; type: string; createdAt: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [promoResult, setPromoResult] = useState('');

  // Load from localStorage
  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(`promo_plan_${userId}`);
      if (saved) setPromoPlan(JSON.parse(saved));
      const hist = localStorage.getItem(`promo_history_${userId}`);
      if (hist) setPromoHistory(JSON.parse(hist));
    } catch { /* ignore */ }
  }, [userId]);

  const savePlan = useCallback((plan: typeof promoPlan) => {
    if (!userId) return;
    try { localStorage.setItem(`promo_plan_${userId}`, JSON.stringify(plan)); } catch { /* ignore */ }
  }, [userId]);

  const updateField = (field: string, value: string | number) => {
    const newPlan = { ...promoPlan, [field]: value };
    setPromoPlan(newPlan);
    savePlan(newPlan);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!promoPlan.name.trim()) { toast.error('请先输入预案名称'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `我是一家电商卫浴公司的客服主管，需要制定大促预案。团队有${promoPlan.teamSize}人，预计流量${promoPlan.volumeMultiplier}倍，活动类型${promoPlan.activityType}，预备增�?{promoPlan.addStaffCount}人，最长工�?{promoPlan.maxWorkHours}小时。请生成完整的大促预案，包括�?.人员排班方案 2.关键话术（活动规�?断货/延迟发货/退款）3.应急预案（流量暴增/客诉暴增/系统故障�?.团队复盘要点` }],
          stream: false,
        }),
      });
      if (!res.ok) throw new Error('生成失败');
      const data = await res.json();
      const result = data.choices?.[0]?.message?.content || data.result || '生成失败，请重试';
      setPromoResult(result);
      // Save to history
      const histItem = { id: Date.now().toString(), name: promoPlan.name, date: new Date().toISOString().slice(0, 10), type: promoPlan.activityType, createdAt: new Date().toISOString() };
      const newHist = [histItem, ...promoHistory].slice(0, 10);
      setPromoHistory(newHist);
      try { localStorage.setItem(`promo_history_${userId}`, JSON.stringify(newHist)); } catch { /* ignore */ }
      toast.success('大促预案已生�?);
    } catch {
      // Fallback: provide template
      setPromoResult(`# ${promoPlan.name} - 大促预案

## 一、人员排班方�?
- 团队现有 ${promoPlan.teamSize} 人，预备增员 ${promoPlan.addStaffCount} �?
- 早班 (8:00-16:00): ${Math.ceil(promoPlan.teamSize / 3)} �?
- 晚班 (16:00-24:00): ${Math.ceil(promoPlan.teamSize / 3)} �? 
- 夜班 (0:00-8:00): ${Math.floor(promoPlan.teamSize / 3)} �?
- 最长工时控�? ${promoPlan.maxWorkHours} 小时/�?

## 二、关键话�?
### 活动规则话术
亲，本次活动满XX减XX，可以和店铺优惠券叠加使用哦~活动期间下单，预计XX天内发货，急单请联系客服备注~

### 断货话术
亲，非常抱歉该款式目前售罄，正在紧急补货中，预计XX天到货。您可以先收藏，到货后第一时间通知您~

### 延迟发货话术
亲，非常抱歉让您久等了！大促期间订单量激增，您的订单预计延迟XX天发货。我们会尽快安排~

### 退款话�?
亲，大促期间退款处理可能稍有延迟，我们会在收到退货后XX小时内为您处理退款~

## 三、应急预�?
### 流量暴增超过预估2�?
1. 启动备用客服账号，临时增开接待�?
2. 调整自动回复，引导客户自助查�?
3. 持续1小时未缓解→通知主管，启动外部临时工方案

### 客诉量暴增，差评率超�?%
1. 集中处理高优先级投诉（退�?换货�?
2. 统一口径回复，避免不同客服说法不一
3. 单日差评率超�?0%→通知老板，启动专项赔偿方�?

### 系统/平台故障
1. 立即切换到备用联系方式（电话/微信�?
2. 在店铺首页公告故障情�?预计恢复时间
3. 故障超过30分钟→通知老板，考虑活动延期

## 四、团队复盘要�?
- 活动期间出勤率目�? 95%+
- 客诉处理�? 98%+
- 差评率控�? <3%
- 活动结束�?天内完成全员复盘会议`);
      toast.success('已生成预案模板（AI服务暂不可用，已使用内置模板�?);
    } finally {
      setGenerating(false);
    }
  };

  const SectionHeader = ({ id, title }: { id: string; title: string }) => (
    <button onClick={() => toggleSection(id)} className="w-full flex items-center gap-2 py-2 text-sm font-semibold text-[#0F2B46] hover:text-[#1a3a5c]">
      {expandedSections[id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      {title}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <SectionHeader id="basic" title="活动基本信息" />
        {expandedSections.basic && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">预案名称</label>
              <Input value={promoPlan.name} onChange={e => updateField('name', e.target.value)} placeholder="如：�?1大促预案" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">活动类型</label>
              <select value={promoPlan.activityType} onChange={e => updateField('activityType', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                {['大促', '日常活动', '预售', '直播专场'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">开始日�?/label>
              <Input type="date" value={promoPlan.startDate} onChange={e => updateField('startDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">结束日期</label>
              <Input type="date" value={promoPlan.endDate} onChange={e => updateField('endDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">流量倍数</label>
              <select value={promoPlan.volumeMultiplier} onChange={e => updateField('volumeMultiplier', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                {[{ v: '1.5', l: '1.5�? }, { v: '2', l: '2�? }, { v: '3', l: '3�? }, { v: '5', l: '5�? }].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 人员配置 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <SectionHeader id="staff" title="人员配置" />
        {expandedSections.staff && (
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">团队人数</label>
              <Input type="number" value={promoPlan.teamSize} onChange={e => updateField('teamSize', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">预备增员</label>
              <Input type="number" value={promoPlan.addStaffCount} onChange={e => updateField('addStaffCount', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">最长工�?�?�?</label>
              <Input type="number" value={promoPlan.maxWorkHours} onChange={e => updateField('maxWorkHours', Number(e.target.value))} />
            </div>
          </div>
        )}
      </div>

      {/* 生成按钮 */}
      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={generating} className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white">
          {generating ? <><Clock className="w-4 h-4 mr-1 animate-spin" /> 生成�?..</> : <><Sparkles className="w-4 h-4 mr-1" /> AI生成大促预案</>}
        </Button>
        {promoResult && (
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(promoResult); toast.success('已复制到剪贴�?); }}>
            <Copy className="w-4 h-4 mr-1" /> 复制预案
          </Button>
        )}
      </div>

      {/* AI生成结果 */}
      {promoResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-[#0F2B46] mb-3">生成结果</h3>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{promoResult}</div>
        </div>
      )}

      {/* 历史记录 */}
      {promoHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader id="history" title={`历史预案 (${promoHistory.length})`} />
          {expandedSections.history && (
            <div className="space-y-2 mt-2">
              {promoHistory.map(h => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium text-slate-700">{h.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{h.type}</span>
                  </div>
                  <span className="text-xs text-slate-400">{h.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


