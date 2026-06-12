'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface CostItem {
  id: string;
  cost_type: string;
  amount: number;
}

interface BaselineConfig {
  cost_type: string;
  baseline_value: number;
  warning_threshold: number;
}

const costTypeConfig: Record<string, { label: string; defaultBaseline: number }> = {
  commission: { label: '佣金', defaultBaseline: 5 },
  platform_payout: { label: '平台抽成', defaultBaseline: 3 },
  shipping_fee: { label: '运费', defaultBaseline: 4 },
  insurance_fee: { label: '运费险', defaultBaseline: 0.8 },
  damage_cost: { label: '运损', defaultBaseline: 2.8 },
  install_fee: { label: '安装费', defaultBaseline: 2 },
  repair_fee: { label: '维修扣费', defaultBaseline: 1.2 },
  parts_fee_sold: { label: '配件售出', defaultBaseline: 3 },
  parts_fee_gift: { label: '配件赠品', defaultBaseline: 12 },
  parts_fee_warranty: { label: '配件质保', defaultBaseline: 0.8 },
  after_sales_fee: { label: '售后费', defaultBaseline: 4.5 },
  warranty_shipping: { label: '质保运费', defaultBaseline: 0.6 },
  ad_spend: { label: '广告费', defaultBaseline: 5 },
  warehouse_fee: { label: '仓储费', defaultBaseline: 2 },
};

const mockCostItems = [
  { id: '1', cost_type: 'commission', amount: 18750 },
  { id: '2', cost_type: 'platform_payout', amount: 11250 },
  { id: '3', cost_type: 'shipping_fee', amount: 15000 },
  { id: '4', cost_type: 'insurance_fee', amount: 3000 },
  { id: '5', cost_type: 'damage_cost', amount: 10500 },
  { id: '6', cost_type: 'install_fee', amount: 7500 },
  { id: '7', cost_type: 'repair_fee', amount: 4500 },
  { id: '8', cost_type: 'parts_fee_sold', amount: 11250 },
  { id: '9', cost_type: 'parts_fee_gift', amount: 45000 },
  { id: '10', cost_type: 'parts_fee_warranty', amount: 3000 },
  { id: '11', cost_type: 'after_sales_fee', amount: 16875 },
  { id: '12', cost_type: 'warranty_shipping', amount: 2250 },
  { id: '13', cost_type: 'ad_spend', amount: 18750 },
  { id: '14', cost_type: 'warehouse_fee', amount: 7500 },
];

const totalRevenue: number = 375000;

interface EditModalProps {
  costType: string;
  label: string;
  currentBaseline: number;
  currentThreshold: number;
  onSave: (costType: string, baseline: number, threshold: number) => void;
  onClose: () => void;
}

function EditModal({ costType, label, currentBaseline, currentThreshold, onSave, onClose }: EditModalProps) {
  const [baseline, setBaseline] = useState(currentBaseline);
  const [threshold, setThreshold] = useState(currentThreshold);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(costType, baseline, threshold);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">设置基准线</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">成本项</label>
            <input
              type="text"
              value={label}
              disabled
              className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">基准值 (%)</label>
            <input
              type="number"
              value={baseline}
              onChange={(e) => setBaseline(parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              max="100"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入基准百分比"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">预警阈值 (%)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              max="100"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="超出基准值的百分比触发预警"
            />
            <p className="text-xs text-slate-500 mt-1">实际值 &gt; 基准值 × (1 + 阈值) 时标红预警</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CostBaselinePage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [baselineConfigs, setBaselineConfigs] = useState<Record<string, BaselineConfig>>({});
  const [editingCostType, setEditingCostType] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('cost_baseline_config')
          .select('cost_type, baseline_value, warning_threshold');

        if (error) throw error;

        const configs: Record<string, BaselineConfig> = {};
        (data as BaselineConfig[]).forEach(item => {
          configs[item.cost_type] = item;
        });

        setBaselineConfigs(configs);
      } catch (err) {
        console.error('获取配置失败:', err);
        const defaultConfigs: Record<string, BaselineConfig> = {};
        Object.keys(costTypeConfig).forEach(key => {
          defaultConfigs[key] = {
            cost_type: key,
            baseline_value: costTypeConfig[key].defaultBaseline,
            warning_threshold: 20,
          };
        });
        setBaselineConfigs(defaultConfigs);
      }
    };

    fetchConfigs();
  }, []);

  const handleSaveBaseline = async (costType: string, baseline: number, threshold: number) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase
        .from('cost_baseline_config')
        .upsert({
          cost_type: costType,
          baseline_value: baseline,
          warning_threshold: threshold,
          company_id: 'company_001',
        }, { onConflict: 'company_id,cost_type' });

      if (error) throw error;

      setBaselineConfigs(prev => ({
        ...prev,
        [costType]: { cost_type: costType, baseline_value: baseline, warning_threshold: threshold },
      }));
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const getCostRate = (amount: number): string => {
    if (totalRevenue === 0) return '0';
    return ((amount / totalRevenue) * 100).toFixed(1);
  };

  const getBaseline = (costType: string) => {
    return baselineConfigs[costType]?.baseline_value || costTypeConfig[costType].defaultBaseline;
  };

  const getThreshold = (costType: string) => {
    return baselineConfigs[costType]?.warning_threshold || 20;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">成本基线</h1>
            <p className="text-slate-500 text-sm mt-1">14项成本科目月度基线监控（基准值可自定义）</p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">成本科目明细</h2>
            <p className="text-sm text-slate-500 mt-1">点击编辑按钮可自定义基准值和预警阈值</p>
          </div>
          <div className="divide-y divide-slate-100">
            {Object.entries(costTypeConfig).map(([key, config]) => {
              const item = mockCostItems.find(i => i.cost_type === key);
              const amount = item?.amount || 0;
              const rate = parseFloat(getCostRate(amount));
              const baseline = getBaseline(key);
              const threshold = getThreshold(key);
              const warningValue = baseline * (1 + threshold / 100);
              const isWarning = rate > warningValue;
              const exceedsBaseline = rate > baseline;
              const exceedsPercent = exceedsBaseline ? ((rate - baseline) / baseline * 100).toFixed(0) : '0';

              return (
                <div key={key} className={`px-6 py-4 ${isWarning ? 'bg-red-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800 w-20">{config.label}</span>
                      <span className="text-sm text-slate-500">¥{amount.toLocaleString()}</span>
                      <span className={`text-sm font-medium ${isWarning ? 'text-red-600' : 'text-slate-600'}`}>
                        {rate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">基准</span>
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${Math.min(baseline / 15 * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-blue-600 w-12">{baseline}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">预警线</span>
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-500" 
                            style={{ width: `${Math.min(warningValue / 15 * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-yellow-600 w-12">{warningValue.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">实际</span>
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isWarning ? 'bg-red-500' : exceedsBaseline ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(rate / 15 * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs w-12 ${isWarning ? 'text-red-600' : 'text-slate-600'}`}>{rate}%</span>
                      </div>
                      {isWarning && (
                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                          超预警 {exceedsPercent}%
                        </span>
                      )}
                      <button
                        onClick={() => setEditingCostType(key)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        编辑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">行业对标参考</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 运损率基准: 2.8%（卫浴行业平均）</li>
              <li>• 配件赠品率基准: 12%</li>
              <li>• 售后费率基准: 4.5%</li>
              <li>• 维修扣费基准: ¥180/次</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">预警规则</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 实际成本率 &gt; 基准值 × (1 + 阈值) 触发预警</li>
              <li>• 预警项目标红显示</li>
              <li>• 预警阈值默认20%，可自定义</li>
            </ul>
          </div>
        </div>

        {editingCostType && (
          <EditModal
            costType={editingCostType}
            label={costTypeConfig[editingCostType].label}
            currentBaseline={getBaseline(editingCostType)}
            currentThreshold={getThreshold(editingCostType)}
            onSave={handleSaveBaseline}
            onClose={() => setEditingCostType(null)}
          />
        )}
      </div>
    </div>
  );
}