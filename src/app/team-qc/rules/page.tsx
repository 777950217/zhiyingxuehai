'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface QCRule {
  id: string;
  dimension: string;
  enabled: boolean;
  sensitivity: string;
  keywords: string[];
}

const defaultDimensions = [
  { key: 'emotion', name: '情绪检测', description: '检测客户情绪波动，识别情绪激烈的对话' },
  { key: 'compliance', name: '合规检查', description: '检查对话内容是否符合合规要求' },
  { key: 'response_speed', name: '响应速度', description: '监控客服响应时间是否达标' },
  { key: 'semantic', name: '话术语义', description: '分析话术语义是否恰当、专业' },
];

const sensitivityOptions = [
  { value: 'low', label: '低', description: '检测标准宽松' },
  { value: 'medium', label: '中', description: '检测标准适中' },
  { value: 'high', label: '高', description: '检测标准严格' },
];

export default function RulesPage() {
  const [rules, setRules] = useState<QCRule[]>([]);
  const [blacklistedKeywords, setBlacklistedKeywords] = useState('');
  const [violationKeywords, setViolationKeywords] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('qc_rules').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setRules(data as QCRule[]);
        } else {
          const mockRules: QCRule[] = defaultDimensions.map(dim => ({
            id: dim.key,
            dimension: dim.key,
            enabled: true,
            sensitivity: 'medium',
            keywords: [],
          }));
          setRules(mockRules);
        }
      } catch (err) {
        console.error('获取规则失败:', err);
        const mockRules: QCRule[] = defaultDimensions.map(dim => ({
          id: dim.key,
          dimension: dim.key,
          enabled: true,
          sensitivity: 'medium',
          keywords: [],
        }));
        setRules(mockRules);
      }
      setLoading(false);
    };

    fetchRules();
  }, []);

  const toggleDimension = (dimensionKey: string) => {
    setRules(prev => prev.map(rule =>
      rule.dimension === dimensionKey
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
  };

  const updateSensitivity = (dimensionKey: string, sensitivity: string) => {
    setRules(prev => prev.map(rule =>
      rule.dimension === dimensionKey
        ? { ...rule, sensitivity }
        : rule
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      for (const rule of rules) {
        const { error } = await supabase
          .from('qc_rules')
          .upsert({
            dimension: rule.dimension,
            enabled: rule.enabled,
            sensitivity: rule.sensitivity,
            keywords: rule.keywords,
          }, { onConflict: 'dimension' });

        if (error) throw error;
      }

      alert('规则配置已保存！');
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
    setSaving(false);
  };

  const getDimensionInfo = (key: string) => {
    return defaultDimensions.find(d => d.key === key) || { name: key, description: '' };
  };

  const getCurrentRule = (key: string) => {
    return rules.find(r => r.dimension === key);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">规则配置</h1>
            <p className="text-slate-500 text-sm mt-1">配置AI质检的检测维度和灵敏度</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 flex items-center gap-2"
          >
            {saving ? (
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            保存配置
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">质检维度开关</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                defaultDimensions.map(dimension => {
                  const rule = getCurrentRule(dimension.key);
                  return (
                    <div key={dimension.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleDimension(dimension.key)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            rule?.enabled ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            rule?.enabled ? 'translate-x-7' : 'translate-x-1'
                          }`}></span>
                        </button>
                        <div>
                          <div className="font-medium text-slate-800">{dimension.name}</div>
                          <div className="text-sm text-slate-500">{dimension.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">灵敏度:</span>
                        <div className="flex gap-1">
                          {sensitivityOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => updateSensitivity(dimension.key, option.value)}
                              disabled={!rule?.enabled}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                rule?.sensitivity === option.value
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-100'
                              } ${!rule?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={option.description}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">关键词黑名单</h3>
            <p className="text-sm text-slate-500 mb-4">命中这些关键词的对话将被标记为异常，多个关键词用逗号分隔</p>
            <textarea
              value={blacklistedKeywords}
              onChange={(e) => setBlacklistedKeywords(e.target.value)}
              placeholder="输入关键词，用逗号分隔，例如：投诉,差评,退款"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">严重违规词库</h3>
            <p className="text-sm text-red-500 mb-4">
              <span className="inline-flex items-center w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              命中这些关键词的对话将直接标记为严重违规，需谨慎配置
            </p>
            <textarea
              value={violationKeywords}
              onChange={(e) => setViolationKeywords(e.target.value)}
              placeholder="输入严重违规关键词，用逗号分隔"
              className="w-full px-4 py-3 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-red-50"
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
}