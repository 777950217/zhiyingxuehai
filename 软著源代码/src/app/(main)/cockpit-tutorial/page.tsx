'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingDown,
  ArrowLeftRight,
  AlertTriangle,
  Filter,
  CheckSquare,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
} from 'lucide-react';

interface TutorialModule {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  useCases: string[];
  keyMetrics: string[];
  tips: string[];
  color: string;
  bgColor: string;
}

const COCKPIT_MODULES: TutorialModule[] = [
  {
    id: 'loss-insight',
    title: '亏损透视',
    icon: <TrendingDown className="w-6 h-6" />,
    description: '一眼看穿哪个品类、哪个售后环节在亏钱。把「感觉亏了」变成「精确知道亏在哪」�?,
    useCases: [
      '月末复盘：快速定位亏损最严重�?个品�?,
      '决策依据：砍掉还是优化？看数据说�?,
      '对比分析：这个月vs上个月，亏损收窄了还是扩大了',
    ],
    keyMetrics: ['品类亏损排行', '售后赔付�?, '退货损失金�?, '亏损趋势�?],
    tips: [
      '每周至少看一次亏损透视，不要等到月末才发现问题',
      '重点关注连续2个月亏损扩大的品�?,
      '亏损透视的数据源来自工单台账和成本预警，确保数据录入及时',
    ],
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'cost-compare',
    title: '降本对比',
    icon: <ArrowLeftRight className="w-6 h-6" />,
    description: '使用前vs使用后的成本对比，量化管理带来的真实省钱效果。ROI不再是拍脑袋�?,
    useCases: [
      '汇报场景：向老板/股东展示管理工具带来的实际降本效�?,
      '验证决策：上月调整排班后，人力成本是否真的降了？',
      '预算规划：根据趋势预测下个季度成�?,
    ],
    keyMetrics: ['售后赔付对比', '人力成本对比', '质检拦截挽回金额', '综合ROI'],
    tips: [
      '降本对比需要至�?个月的对比数据才有效',
      '重点看「使用后」的环比趋势，而非单月数据',
      '把降本数据截图保存，年终述职直接�?,
    ],
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'anomaly-alert',
    title: '异常红警',
    icon: <AlertTriangle className="w-6 h-6" />,
    description: '关键指标异动自动预警。不用天天盯数据，系统帮你盯，出问题第一时间通知你�?,
    useCases: [
      '售后赔付突然飙升→立即介入调�?,
      '某品类退货率异常→排查产品质量问�?,
      '客服响应时间骤增→检查是否人手不�?,
    ],
    keyMetrics: ['赔付率异�?, '退货率异动', '响应时间异动', '客诉量异�?],
    tips: [
      '红警触发后，建议24小时内响应处�?,
      '把红警处理结果记录在工单里，形成闭环',
      '连续3次红警的品类建议专项治理',
    ],
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'product-funnel',
    title: '单品盈利漏斗',
    icon: <Filter className="w-6 h-6" />,
    description: '从销售到售后的全链路漏斗，看清每个环节的损耗。找出利润流失的关键节点�?,
    useCases: [
      '新品上架：预估售后成本，定价时心里有�?,
      '爆品分析：销量高但利润低？漏斗帮你看哪里漏了',
      '品类优化：哪些品值得推，哪些该放�?,
    ],
    keyMetrics: ['销售额→退货率→赔付率→净利率', '环节转化�?, '损耗集中点'],
    tips: [
      '重点关注退货率→赔付率这段，这是利润流失的核心环节',
      '漏斗数据建议按周看趋势，单天波动参考价值有�?,
      '把漏斗数据分享给采购团队，优化选品策略',
    ],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'approval-flow',
    title: '赔付审批�?,
    icon: <CheckSquare className="w-6 h-6" />,
    description: '大额赔付必须老板审批。防止一线随意赔钱，把每一笔支出都管起来�?,
    useCases: [
      '日常审批：超过阈值的赔付单自动进入审批流�?,
      '异常拦截：同一客户反复索赔→系统标记可�?,
      '成本追溯：每月审批通过/拒绝的赔付统计分�?,
    ],
    keyMetrics: ['待审批数�?, '审批通过�?, '拦截挽回金额', '平均审批时长'],
    tips: [
      '建议设置赔付阈值：单笔�?00元需审批',
      '审批时关注客户历史赔付记录，警惕重复索赔',
      '每周回顾审批数据，优化审批阈�?,
    ],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'fund-weekly',
    title: '资金周报',
    icon: <DollarSign className="w-6 h-6" />,
    description: '每周自动生成资金周报，包含收支、赔付、成本等核心数据。不用再手工汇总报表�?,
    useCases: [
      '周会汇报：直接用周报数据，不用手工整�?,
      '趋势跟踪：连续几周数据对比，发现经营趋势',
      '决策支撑：资金周�?亏损透视=完整的经营判断依�?,
    ],
    keyMetrics: ['周收�?, '周赔付支�?, '周净�?, '环比变化'],
    tips: [
      '每周一早上�?分钟看周报，掌握上周经营情况',
      '把周报导出存档，季度复盘时直接用',
      '关注「环比变化」列，变化超�?0%的需重点关注',
    ],
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
];

export default function CockpitTutorialPage() {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModule(expandedModule === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">驾驶舱教�?/h1>
        <p className="text-slate-500 mt-1">6大模块使用指南，帮您快速掌握驾驶舱的每个功�?/p>
      </div>

      {/* 概览提示 */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-900">驾驶舱是什么？</p>
              <p className="text-sm text-blue-700 mt-1">
                驾驶舱是老板专属的数据指挥中心，包含6个核心模块。它把散落在各部门的数据汇聚到一个界面，
                让您不用找主管问数据，不用手工汇总报表，打开驾驶舱就能掌握经营全貌�?
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 使用建议 */}
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-green-900">建议使用节奏</p>
              <div className="mt-2 space-y-1 text-sm text-green-800">
                <p><strong>每日�?/strong>查看异常红警，有问题立即处理</p>
                <p><strong>每周�?/strong>看资金周�?+ 亏损透视，掌握经营趋�?/p>
                <p><strong>每月�?/strong>降本对比 + 单品漏斗，复盘月度经营效�?/p>
                <p><strong>随时�?/strong>赔付审批流，大额支出把好�?/p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6大模块教�?*/}
      <div className="space-y-3">
        {COCKPIT_MODULES.map((mod, index) => (
          <Card key={mod.id} className="overflow-hidden">
            {/* 模块标题栏（可点击展开�?*/}
            <button
              onClick={() => toggleModule(mod.id)}
              className="w-full text-left"
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${mod.bgColor} flex items-center justify-center ${mod.color}`}>
                      {mod.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-slate-400">
                          模块{index + 1}
                        </Badge>
                        <h3 className="font-semibold text-slate-900">{mod.title}</h3>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                  {expandedModule === mod.id ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </CardContent>
            </button>

            {/* 展开详情 */}
            {expandedModule === mod.id && (
              <div className="border-t border-slate-100">
                <CardContent className="pt-4 pb-4 space-y-4">
                  {/* 适用场景 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">适用场景</h4>
                    <ul className="space-y-1.5">
                      {mod.useCases.map((uc, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-slate-300 mt-0.5">�?/span>
                          {uc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 关键指标 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">关键指标</h4>
                    <div className="flex flex-wrap gap-2">
                      {mod.keyMetrics.map((metric, i) => (
                        <Badge key={i} variant="secondary" className={`${mod.bgColor} ${mod.color} border-0`}>
                          {metric}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 使用建议 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">使用建议</h4>
                    <ul className="space-y-1.5">
                      {mod.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* 底部提示 */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 pb-4 text-center">
          <p className="text-slate-500 text-sm">
            驾驶舱数据来源于各管理模块的录入数据，确保团队及时录入数据，驾驶舱的分析才会更精准�?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
