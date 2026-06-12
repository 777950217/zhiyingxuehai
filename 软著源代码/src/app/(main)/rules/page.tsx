'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Search, Scale, ChevronDown, ChevronRight, Filter, BookOpen, Plus, Trash2, Lock } from 'lucide-react';
import { PageHint } from '@/components/page-hint';
import { PermissionLocked } from '@/components/permission-locked';
import { getPlanLimits, isOverLimit, formatLimit } from '@/lib/plan-limits';
import Link from 'next/link';

interface Rule {
  id: number;
  title: string;
  category: string;
  summary: string;
  responsibleParty: string;
  isCustom?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  '售前': 'bg-blue-100 text-blue-700',
  '签收': 'bg-slate-100 text-blue-900',
  '安装': 'bg-green-100 text-green-700',
  '故障': 'bg-red-100 text-red-700',
  '投诉': 'bg-purple-100 text-purple-700',
  '保修': 'bg-teal-100 text-teal-700',
  '自定�?: 'bg-amber-100 text-amber-700',
};

const CATEGORY_ICONS: Record<string, string> = {
  '售前': '🛒',
  '签收': '📦',
  '安装': '🔧',
  '故障': '⚠️',
  '投诉': '📢',
  '保修': '🛡�?,
  '自定�?: '✏️',
};

const CUSTOM_RULES_KEY = 'custom-rules';

export default function RulesPage() {

  const { profile, authFetch } = useAuth();

  // Permission guard
  const role = profile?.role || 'staff';
  const lockedMsg = (role === 'staff' || role === 'personal_user') ? '升级至专业版即可解锁72条行业判断规�? : null;
  if (lockedMsg) {
    return <PermissionLocked title="行业规则�? description={lockedMsg} />;
  }

  const limits = getPlanLimits(role, profile?.companyPlan);

  const [rules, setRules] = useState<Rule[]>([]);
  const [customRules, setCustomRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // 新增规则弹窗
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('自定�?);
  const [newSummary, setNewSummary] = useState('');
  const [newResponsible, setNewResponsible] = useState('');

  // 升级提示弹窗
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  useEffect(() => {
    fetchRules();
    loadCustomRules();
  }, []);

  const loadCustomRules = () => {
    try {
      const saved = localStorage.getItem(CUSTOM_RULES_KEY);
      if (saved) {
        setCustomRules(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  };

  const saveCustomRules = (rules: Rule[]) => {
    localStorage.setItem(CUSTOM_RULES_KEY, JSON.stringify(rules));
    setCustomRules(rules);
  };

  const fetchRules = async () => {
    try {
      const res = await authFetch('/api/rules');
      const data = await res.json();
      if (data.rules) {
        setRules(data.rules);
        setCategories(data.categories || []);
      }
    } catch {
      // fallback to empty
    } finally {
      setLoading(false);
    }
  };

  // 合并预设 + 自定义规�?
  const allRules = [...rules, ...customRules];
  const allCategories = [...new Set([...categories, ...customRules.map(r => r.category)])];

  const filtered = allRules.filter(r => {
    const matchCategory = activeCategory === '全部' || r.category === activeCategory;
    const matchSearch = !search || r.title.includes(search) || r.summary.includes(search) || String(r.id).includes(search);
    return matchCategory && matchSearch;
  });

  // Group by category
  const grouped = allCategories
    .filter(c => activeCategory === '全部' || c === activeCategory)
    .map(cat => ({
      category: cat,
      rules: filtered.filter(r => r.category === cat),
    }))
    .filter(g => g.rules.length > 0);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenAddDialog = () => {
    if (isOverLimit(customRules.length, limits.maxRules)) {
      setShowUpgradeDialog(true);
      return;
    }
    setShowAddDialog(true);
  };

  const handleAddRule = () => {
    if (!newTitle.trim() || !newSummary.trim()) return;

    const newRule: Rule = {
      id: 9001 + customRules.length,
      title: newTitle.trim(),
      category: newCategory,
      summary: newSummary.trim(),
      responsibleParty: newResponsible.trim() || '自定�?,
      isCustom: true,
    };
    const updated = [...customRules, newRule];
    saveCustomRules(updated);
    setShowAddDialog(false);
    setNewTitle('');
    setNewCategory('自定�?);
    setNewSummary('');
    setNewResponsible('');
  };

  const handleDeleteCustomRule = (id: number) => {
    const updated = customRules.filter(r => r.id !== id);
    saveCustomRules(updated);
  };

  // Stats
  const categoryStats = allCategories.map(cat => ({
    category: cat,
    count: allRules.filter(r => r.category === cat).length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">行业规则�?/h1>
            <p className="text-sm text-gray-500">
              �?{allRules.length} 条判断链规则
              {limits.maxRules !== Infinity && customRules.length > 0 && (
                <span className="text-amber-600 ml-1">
                  (自定�?{customRules.length}/{formatLimit(limits.maxRules)})
                </span>
              )}
            </p>
            <PageHint text="客服行为红线：什么能说、什么不能说、遇到问题怎么处理，照做不出错�? />
          </div>
        </div>
        <button
          onClick={handleOpenAddDialog}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增规则
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {categoryStats.map(cs => (
          <button
            key={cs.category}
            onClick={() => setActiveCategory(activeCategory === cs.category ? '全部' : cs.category)}
            className={`p-3 rounded-xl border text-center transition-all ${
              activeCategory === cs.category
                ? 'border-sky-200 bg-sky-50 shadow-sm'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="text-lg mb-0.5">{CATEGORY_ICONS[cs.category]}</div>
            <div className="text-xs font-medium text-gray-700">{cs.category}</div>
            <div className="text-lg font-bold text-gray-900">{cs.count}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索规则编号、标题或关键�?.."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm"
        />
      </div>

      {/* Filter tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        <button
          onClick={() => setActiveCategory('全部')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeCategory === '全部' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部 ({allRules.length})
        </button>
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? '全部' : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {CATEGORY_ICONS[cat]} {cat} ({allRules.filter(r => r.category === cat).length})
          </button>
        ))}
      </div>

      {/* Rules List */}
      <div className="space-y-6 animate-fade-in-up">
        {grouped.map(group => (
          <div key={group.category}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{CATEGORY_ICONS[group.category]}</span>
              <h2 className="text-sm font-semibold text-gray-700">{group.category}规则</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[group.category] || 'bg-gray-100 text-gray-700'}`}>
                {group.rules.length} �?
              </span>
            </div>

            {/* Rule cards */}
            <div className="space-y-2">
              {group.rules.map(rule => (
                <div
                  key={rule.id}
                  className={`bg-white rounded-xl border overflow-hidden hover:border-gray-200 transition-colors ${
                    rule.isCustom ? 'border-amber-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3 text-left">
                    <button
                      onClick={() => toggleExpand(rule.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        rule.isCustom ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {rule.isCustom ? '✏️' : rule.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {rule.title}
                          {rule.isCustom && <span className="ml-2 text-xs text-amber-500 font-normal">自定�?/span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{rule.summary}</div>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[rule.category] || 'bg-gray-100 text-gray-700'}`}>
                        {rule.category}
                      </span>
                      {expandedIds.has(rule.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {rule.isCustom && (
                      <button
                        onClick={() => handleDeleteCustomRule(rule.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="删除自定义规�?
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {expandedIds.has(rule.id) && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">规则编号</div>
                          <div className="text-sm text-gray-900">规则{rule.id}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">分类</div>
                          <div className="text-sm text-gray-900">{rule.category}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">责任�?/div>
                          <div className="text-sm text-gray-900">{rule.responsibleParty}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">判断摘要</div>
                          <div className="text-sm text-gray-900">{rule.summary}</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BookOpen className="w-3.5 h-3.5 text-blue-800" />
                          <span className="text-xs font-medium text-blue-900">话术提示</span>
                        </div>
                        <div className="text-xs text-blue-900">
                          遇到此场景时，请参考规则{rule.id}的判断逻辑，先确认条件再给出方案。如不确定，请转交{rule.responsibleParty}处理�?
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">没有匹配的规�?/p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('全部'); }}
            className="mt-2 text-sm text-sky-400 hover:text-blue-900"
          >
            清除筛�?
          </button>
        </div>
      )}

      {/* 新增规则弹窗 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">新增自定义规�?/h3>
              <p className="text-sm text-gray-500 mt-0.5">
                自定义规�?{customRules.length}/{formatLimit(limits.maxRules)}
              </p>
            </div>
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">规则标题 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="如：客户咨询定制产品判断"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">分类</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm"
                >
                  <option value="自定�?>自定�?/option>
                  <option value="售前">售前</option>
                  <option value="签收">签收</option>
                  <option value="安装">安装</option>
                  <option value="故障">故障</option>
                  <option value="投诉">投诉</option>
                  <option value="保修">保修</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">判断摘要 *</label>
                <textarea
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  placeholder="描述判断逻辑和处置建�?
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">责任�?/label>
                <input
                  type="text"
                  value={newResponsible}
                  onChange={e => setNewResponsible(e.target.value)}
                  placeholder="如：售后客服"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddRule}
                disabled={!newTitle.trim() || !newSummary.trim()}
                className="px-4 py-2 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加规则
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 升级提示弹窗 */}
      {showUpgradeDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowUpgradeDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">已达自定义规则上�?/h3>
              <p className="text-sm text-gray-500">
                当前版本最多支�?<span className="font-semibold text-amber-600">{formatLimit(limits.maxRules)} �?/span> 自定义质检规则，开通旗舰版可无限添�?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowUpgradeDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                知道�?
              </button>
              <Link
                href="/contact"
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors text-center"
              >
                咨询开通旗舰版
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
