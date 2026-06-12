'use client';

import { GraduationCap, Target, Zap } from 'lucide-react';

/**
 * 客服管理三步法 - 展示核心方法论体系
 * 设计要求：字号大，简洁清晰，适合年龄偏大的客户群体
 */
export function ThreeStepMethod() {
  const steps = [
    {
      icon: GraduationCap,
      step: '第1步',
      title: '学方法论',
      desc: '25课系统学',
    },
    {
      icon: Target,
      step: '第2步',
      title: 'KPI落地执行',
      desc: '方案自动生成',
    },
    {
      icon: Zap,
      step: '第3步',
      title: 'AI实操急救',
      desc: '遇到问题随时问',
    },
  ];

  return (
    <section className="space-y-5">
      {/* 体系名标题 */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900">
          客服管理三步法
        </h2>
      </div>

      {/* 三步展示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-blue-600">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-blue-700">{item.step}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-base text-gray-600">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
