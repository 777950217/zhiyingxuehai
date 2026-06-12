/**
 * ERP对比模块组件
 * 用途：在五度淬判体系模块之后添加，对比ERP与职盈学海的差异
 * 设计：左ERP右职盈学海，视觉上突出右边优势
 */

interface ERPComparisonProps {
  showCockpit?: boolean;
}

export default function ERPComparison({ showCockpit = false }: ERPComparisonProps) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            装了ERP还在盯客服？
          </h2>
          <p className="text-lg text-gray-600">
            ERP管货和钱，我们管人和效率
          </p>
        </div>

        {/* 核心对比表格 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-10">
          <div className="grid md:grid-cols-2">
            {/* 左侧：ERP */}
            <div className="bg-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-300 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-500">ERP系统</h3>
                <span className="text-sm text-gray-400">(聚水潭/旺店通)</span>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/60 rounded-xl p-4">
                  <div className="text-sm text-gray-500 mb-1">管什么</div>
                  <div className="text-lg font-semibold text-gray-600">
                    货：订单、库存、仓储、物流
                  </div>
                </div>
                
                <div className="bg-white/60 rounded-xl p-4">
                  <div className="text-sm text-gray-500 mb-1">核心问题</div>
                  <div className="text-lg font-semibold text-gray-600">
                    货发对了吗？库存够吗？
                  </div>
                </div>
                
                <div className="bg-white/60 rounded-xl p-4">
                  <div className="text-sm text-gray-500 mb-1">数据来源</div>
                  <div className="text-lg font-semibold text-gray-600">
                    订单系统、仓库、物流
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：职盈学海 */}
            <div className="bg-[#0F2B46] p-6 md:p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-2xl font-bold text-white">职盈学海</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="text-sm text-blue-200 mb-1">管什么</div>
                  <div className="text-lg font-semibold text-white">
                    人：客服团队、服务质量、人效
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="text-sm text-blue-200 mb-1">核心问题</div>
                  <div className="text-lg font-semibold text-white">
                    客服管好了吗？谁在拖后腿？
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="text-sm text-blue-200 mb-1">数据来源</div>
                  <div className="text-lg font-semibold text-white">
                    {showCockpit ? '客服对话、KPI、质检、驾驶舱' : '客服对话、KPI、质检'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 差异化功能对比 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            ERP做不了的 → 职盈学海专做的
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-3xl mb-2">📚</div>
              <div className="text-sm font-medium text-gray-700">管理方法论</div>
              <div className="text-blue-600 font-bold mt-1">25课从0到1学管理</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm font-medium text-gray-700">AI质检对话</div>
              <div className="text-blue-600 font-bold mt-1">实时检查</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm font-medium text-gray-700">KPI考核执行</div>
              <div className="text-blue-600 font-bold mt-1">方案自动生成+算分</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-3xl mb-2">📈</div>
              <div className="text-sm font-medium text-gray-700">团队效率分析</div>
              <div className="text-blue-600 font-bold mt-1">
                {showCockpit ? '驾驶舱看人效' : 'KPI数据看人效'}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-3xl mb-2">🆘</div>
              <div className="text-sm font-medium text-gray-700">问题即时解决</div>
              <div className="text-blue-600 font-bold mt-1">AI急救站随时问</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
