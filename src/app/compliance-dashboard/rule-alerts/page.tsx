'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Rule {
  id: string;
  platform: string;
  title: string;
  publish_time: string;
  effective_time: string;
  urgency: string;
  summary: string;
  impact: string;
  suggestion: string;
  read: boolean;
}

const platformIcons: Record<string, { icon: string; label: string }> = {
  taobao: { icon: '🛒', label: '淘宝' },
  douyin: { icon: '🎵', label: '抖音' },
  pinduoduo: { icon: '📦', label: '拼多多' },
  jd: { icon: '🛍️', label: '京东' },
};

const urgencyConfig: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: '高', color: 'text-red-700', bg: 'bg-red-100' },
  medium: { label: '中', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  low: { label: '低', color: 'text-green-700', bg: 'bg-green-100' },
};

const mockRules: Rule[] = [
  { id: '1', platform: 'taobao', title: '关于售后服务规范更新的通知', publish_time: '2024-01-15 10:30:00', effective_time: '2024-01-20 00:00:00', urgency: 'high', summary: '平台将对售后服务规范进行更新，主要涉及退换货流程和时效要求。', impact: '所有客服需重新学习新的售后流程，确保符合平台要求。', suggestion: '建议组织全员培训，熟悉新规则内容，避免违规。', read: false },
  { id: '2', platform: 'douyin', title: '直播带货新规解读', publish_time: '2024-01-14 14:20:00', effective_time: '2024-01-25 00:00:00', urgency: 'medium', summary: '抖音平台发布直播带货新规则，加强内容审核和合规要求。', impact: '涉及直播销售的客服需要了解新规则，确保直播内容合规。', suggestion: '组织直播相关人员学习新规，制定合规话术。', read: false },
  { id: '3', platform: 'jd', title: '物流时效考核标准调整', publish_time: '2024-01-13 09:15:00', effective_time: '2024-02-01 00:00:00', urgency: 'low', summary: '京东平台将调整物流时效考核标准，提升配送速度要求。', impact: '需要优化发货流程，确保按时发货。', suggestion: '检查当前发货流程，必要时增加人力或优化流程。', read: true },
  { id: '4', platform: 'pinduoduo', title: '虚假宣传整治通知', publish_time: '2024-01-12 16:45:00', effective_time: '2024-01-18 00:00:00', urgency: 'high', summary: '拼多多平台将开展虚假宣传专项整治行动。', impact: '所有商品描述和客服话术必须真实准确，禁止夸大宣传。', suggestion: '全面检查商品描述和常用话术，确保合规。', read: false },
];

export default function RuleAlertsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRule, setNewRule] = useState({
    platform: 'taobao',
    title: '',
    publish_time: '',
    effective_time: '',
    urgency: 'medium',
    summary: '',
    impact: '',
    suggestion: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase.from('platform_rules').select('*');

        if (data && data.length > 0) {
          setRules(data as Rule[]);
        } else {
          setRules(mockRules);
        }
      } catch (err) {
        console.error('获取规则失败:', err);
        setRules(mockRules);
      }
      setLoading(false);
    };

    fetchRules();
  }, []);

  const markAsRead = (ruleId: string) => {
    setRules(prev => prev.map(rule => rule.id === ruleId ? { ...rule, read: true } : rule));
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const handleCreateRule = () => {
    if (!newRule.title || !newRule.summary) {
      alert('请填写完整信息');
      return;
    }
    setShowCreateModal(false);
    setNewRule({ platform: 'taobao', title: '', publish_time: '', effective_time: '', urgency: 'medium', summary: '', impact: '', suggestion: '' });
    alert('规则已添加！');
  };

  const unreadCount = rules.filter(r => !r.read).length;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">规则预警台</h1>
            <p className="text-slate-500 text-sm mt-1">监控各平台规则变更，及时应对政策调整</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增规则
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-medium text-slate-800">规则公告</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    {unreadCount} 条未读
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : rules.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">暂无规则公告</p>
                  </div>
                ) : (
                  rules.map(rule => {
                    const urgency = urgencyConfig[rule.urgency];
                    const platform = platformIcons[rule.platform];
                    return (
                      <div
                        key={rule.id}
                        onClick={() => { setSelectedRule(rule); markAsRead(rule.id); }}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          selectedRule?.id === rule.id ? 'bg-blue-50' : rule.read ? 'hover:bg-slate-50' : 'bg-amber-50/50 hover:bg-amber-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xl">{platform?.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-800 text-sm">{rule.title}</span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${urgency.bg} ${urgency.color}`}>
                                {urgency.label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {platform?.label} | {formatTime(rule.publish_time)}
                            </div>
                          </div>
                          {!rule.read && (
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedRule ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{platformIcons[selectedRule.platform]?.icon}</span>
                        <h2 className="text-xl font-semibold text-slate-800">{selectedRule.title}</h2>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{platformIcons[selectedRule.platform]?.label}</span>
                        <span>发布时间: {formatTime(selectedRule.publish_time)}</span>
                        <span>生效时间: {formatTime(selectedRule.effective_time)}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${urgencyConfig[selectedRule.urgency].bg} ${urgencyConfig[selectedRule.urgency].color}`}>
                          紧迫度: {urgencyConfig[selectedRule.urgency].label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">规则摘要</h4>
                      <p className="text-slate-700 bg-blue-50 rounded-lg p-4">
                        {selectedRule.summary}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">对客服的影响</h4>
                      <p className="text-slate-700 bg-amber-50 rounded-lg p-4">
                        {selectedRule.impact}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">建议应对措施</h4>
                      <p className="text-slate-700 bg-green-50 rounded-lg p-4">
                        {selectedRule.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">选择一个规则查看详情</h3>
                <p className="text-sm text-slate-500">从左侧列表选择规则，查看详细内容和应对建议</p>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-slate-800">新增规则</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">平台</label>
                  <select
                    value={newRule.platform}
                    onChange={(e) => setNewRule(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(platformIcons).map(([key, value]) => (
                      <option key={key} value={key}>{value.icon} {value.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">规则标题</label>
                  <input
                    type="text"
                    value={newRule.title}
                    onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="请输入规则标题"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">发布时间</label>
                    <input
                      type="datetime-local"
                      value={newRule.publish_time}
                      onChange={(e) => setNewRule(prev => ({ ...prev, publish_time: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">生效时间</label>
                    <input
                      type="datetime-local"
                      value={newRule.effective_time}
                      onChange={(e) => setNewRule(prev => ({ ...prev, effective_time: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">紧迫度</label>
                  <div className="flex gap-2">
                    {Object.entries(urgencyConfig).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setNewRule(prev => ({ ...prev, urgency: key }))}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          newRule.urgency === key
                            ? `${value.bg} ${value.color}`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">规则摘要</label>
                  <textarea
                    value={newRule.summary}
                    onChange={(e) => setNewRule(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="请输入规则摘要..."
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">对客服的影响</label>
                  <textarea
                    value={newRule.impact}
                    onChange={(e) => setNewRule(prev => ({ ...prev, impact: e.target.value }))}
                    placeholder="请描述对客服的影响..."
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">建议应对措施</label>
                  <textarea
                    value={newRule.suggestion}
                    onChange={(e) => setNewRule(prev => ({ ...prev, suggestion: e.target.value }))}
                    placeholder="请输入应对建议..."
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateRule}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}