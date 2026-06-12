'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface FinanceData {
  id: string;
  date: string;
  saving_amount: number;
  efficiency_amount: number;
  risk_avoidance: number;
}

interface QualityTrend {
  date: string;
  score: number;
}

interface GrowthCurve {
  user_name: string;
  month: string;
  score: number;
}

const mockFinanceData: FinanceData[] = [
  { id: '1', date: '2024-01', saving_amount: 45000, efficiency_amount: 32000, risk_avoidance: 18000 },
];

const mockQualityTrend: QualityTrend[] = [
  { date: '1月1日', score: 82 },
  { date: '1月5日', score: 85 },
  { date: '1月10日', score: 83 },
  { date: '1月15日', score: 88 },
  { date: '1月20日', score: 86 },
  { date: '1月25日', score: 90 },
  { date: '1月30日', score: 92 },
];

const mockGrowthData: GrowthCurve[] = [
  { user_name: '张三', month: '1月', score: 85 },
  { user_name: '李四', month: '1月', score: 78 },
  { user_name: '王五', month: '1月', score: 72 },
  { user_name: '张三', month: '2月', score: 88 },
  { user_name: '李四', month: '2月', score: 82 },
  { user_name: '王五', month: '2月', score: 78 },
  { user_name: '张三', month: '3月', score: 92 },
  { user_name: '李四', month: '3月', score: 88 },
  { user_name: '王五', month: '3月', score: 85 },
];

export default function ROIDashboardPage() {
  const [financeData, setFinanceData] = useState<FinanceData[]>([]);
  const [qualityTrend, setQualityTrend] = useState<QualityTrend[]>([]);
  const [growthData, setGrowthData] = useState<GrowthCurve[]>([]);
  const [roiCalculation, setRoiCalculation] = useState({
    agentCount: 10,
    avgDuration: 15,
    days: 30,
    supervisorHours: 8,
    newHireCycle: 30,
    newHireCount: 5,
  });
  const [roiResult, setRoiResult] = useState({
    speechSaving: 0,
    qcSaving: 0,
    trainingSaving: 0,
    total: 0,
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: kpiData } = await supabase.from('kpi_scores').select('*');
        const { data: financeData } = await supabase.from('finance_daily').select('*');

        if (financeData && financeData.length > 0) {
          setFinanceData(financeData as FinanceData[]);
        } else {
          setFinanceData(mockFinanceData);
        }
        setQualityTrend(mockQualityTrend);
        setGrowthData(mockGrowthData);
      } catch (err) {
        console.error('获取数据失败:', err);
        setFinanceData(mockFinanceData);
        setQualityTrend(mockQualityTrend);
        setGrowthData(mockGrowthData);
      }
      setLoading(false);
    };

    fetchData();
    calculateROI();
  }, []);

  const calculateROI = () => {
    const hourlyRate = 50;
    const dailyRate = hourlyRate * 8;

    const speechSaving = roiCalculation.agentCount * roiCalculation.avgDuration * roiCalculation.days * (hourlyRate / 60);
    const qcSaving = roiCalculation.supervisorHours * roiCalculation.days * hourlyRate;
    const trainingSaving = roiCalculation.newHireCycle * roiCalculation.newHireCount * dailyRate * 0.3;

    setRoiResult({
      speechSaving: Math.round(speechSaving),
      qcSaving: Math.round(qcSaving),
      trainingSaving: Math.round(trainingSaving),
      total: Math.round(speechSaving + qcSaving + trainingSaving),
    });
  };

  const handleInputChange = (field: string, value: number) => {
    setRoiCalculation(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateReport = async () => {
    setReportGenerated(false);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setReportGenerated(true);
  };

  const totalSaved = financeData.length > 0
    ? financeData.reduce((sum, item) => sum + item.saving_amount + item.efficiency_amount + item.risk_avoidance, 0)
    : 95000;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">老板ROI驾驶舱</h1>
            <p className="text-slate-500 text-sm mt-1">AI投入产出分析与团队健康度监控</p>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            生成月度报告
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-100 text-sm">AI话术节省</div>
                <div className="text-3xl font-bold mt-2">¥{totalSaved.toLocaleString()}</div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm ml-1">较上月增长 23%</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-sm">效率提升</div>
                <div className="text-3xl font-bold mt-2">45%</div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-blue-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm ml-1">处理速度提升</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-purple-100 text-sm">风险规避</div>
                <div className="text-3xl font-bold mt-2">¥18,000</div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-purple-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm ml-1">本月避免客诉罚款</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">ROI自动计算</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">客服人数</label>
                  <input
                    type="number"
                    value={roiCalculation.agentCount}
                    onChange={(e) => { handleInputChange('agentCount', parseInt(e.target.value) || 0); calculateROI(); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">人均处理时长(分钟)</label>
                  <input
                    type="number"
                    value={roiCalculation.avgDuration}
                    onChange={(e) => { handleInputChange('avgDuration', parseInt(e.target.value) || 0); calculateROI(); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">天数</label>
                  <input
                    type="number"
                    value={roiCalculation.days}
                    onChange={(e) => { handleInputChange('days', parseInt(e.target.value) || 0); calculateROI(); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">主管日均质检时长(小时)</label>
                  <input
                    type="number"
                    value={roiCalculation.supervisorHours}
                    onChange={(e) => { handleInputChange('supervisorHours', parseInt(e.target.value) || 0); calculateROI(); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">原上手周期(天)</label>
                  <input
                    type="number"
                    value={roiCalculation.newHireCycle}
                    onChange={(e) => { handleInputChange('newHireCycle', parseInt(e.target.value) || 0); calculateROI(); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">新人数量</label>
                  <input
                    type="number"
                    value={roiCalculation.newHireCount}
                    onChange={(e) => { handleInputChange('newHireCount', parseInt(e.target.value) || 0); calculateROI(); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-green-600 font-bold text-xl">¥{roiResult.speechSaving.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">话术节省</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-600 font-bold text-xl">¥{roiResult.qcSaving.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">质检节省</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-600 font-bold text-xl">¥{roiResult.trainingSaving.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">培训节省</div>
                  </div>
                  <div className="text-center border-l border-slate-200 pl-4">
                    <div className="text-slate-800 font-bold text-xl">¥{roiResult.total.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">合计节省</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">服务质量趋势</h3>
            <div className="h-48">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <svg className="w-full h-full" viewBox="0 0 400 150">
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <path
                    d={qualityTrend.map((point, i) => `${i === 0 ? 'M' : 'L'} ${(i / (qualityTrend.length - 1)) * 400} ${150 - (point.score - 70) * 5}`).join(' ')}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {qualityTrend.map((point, i) => (
                    <circle
                      key={i}
                      cx={(i / (qualityTrend.length - 1)) * 400}
                      cy={150 - (point.score - 70) * 5}
                      r="5"
                      fill="#ffffff"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  ))}
                  {qualityTrend.map((point, i) => (
                    <text
                      key={`label-${i}`}
                      x={(i / (qualityTrend.length - 1)) * 400}
                      y="145"
                      textAnchor="middle"
                      className="text-xs fill-slate-500"
                      style={{ fontSize: '10px' }}
                    >
                      {point.date}
                    </text>
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">个人能力成长曲线</h3>
            <div className="space-y-4">
              {['张三', '李四', '王五'].map((name, idx) => {
                const data = growthData.filter(d => d.user_name === name);
                const colors = ['#10b981', '#3b82f6', '#8b5cf6'];
                return (
                  <div key={name} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-slate-700">{name}</div>
                    <div className="flex-1 h-8 flex items-end gap-1">
                      {data.map((point, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: `${point.score}%`,
                            backgroundColor: colors[idx],
                            opacity: 0.8,
                          }}
                        ></div>
                      ))}
                    </div>
                    <div className="w-16 text-sm text-slate-500 text-right">
                      +{data[data.length - 1]?.score - data[0]?.score || 0}分
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">管理动作执行率</h3>
            <div className="space-y-4">
              {[
                { label: '培训任务完成率', value: 85, target: 90 },
                { label: '质检反馈响应', value: 92, target: 95 },
                { label: '工单及时处理', value: 88, target: 90 },
                { label: '周会出勤率', value: 98, target: 100 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <span className="text-sm font-medium text-slate-800">{item.value}% / {item.target}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${item.value >= item.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${item.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">月度AI解读报告</h3>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {!reportGenerated ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                    <h4 className="text-lg font-medium text-slate-800 mb-2">AI正在生成报告...</h4>
                    <p className="text-sm text-slate-500">请稍候，正在分析本月数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">📊 本月核心指标概览</h4>
                      <p className="text-sm text-blue-700">本月AI系统共帮助团队节省人工成本约 ¥95,000，效率提升45%，成功规避风险损失 ¥18,000。整体运营状况良好。</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">✅ 亮点表现</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• 张三、钱七两位客服KPI表现优秀，持续超出基线</li>
                        <li>• 服务质量趋势稳步上升，较月初提升10分</li>
                        <li>• 管理动作执行率保持在较高水平</li>
                      </ul>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 关注事项</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• 王五客服KPI低于基线，建议安排针对性培训</li>
                        <li>• 物流破损投诉呈上升趋势，建议加强包装规范</li>
                        <li>• 培训任务完成率未达目标，需加强跟进</li>
                      </ul>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-800 mb-2">📈 下月建议</h4>
                      <p className="text-sm text-slate-700">1. 针对掉队客服制定个性化提升计划；2. 优化物流包装流程；3. 加强培训任务追踪力度。预计下月可进一步提升整体绩效。</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                {reportGenerated && (
                  <>
                    <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                      导出报告
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      确认
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}