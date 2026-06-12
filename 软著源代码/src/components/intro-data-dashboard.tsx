'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingDown, Zap, Clock } from 'lucide-react';

/* ── 数字递增动画 Hook ── */
function useAnimatedNumber(target: number, duration = 1800, suffix = '') {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return `${value}${suffix}`;
}

/* ── 单个数据卡片 ── */
function DataCard({
  icon: Icon,
  number,
  suffix,
  label,
  subtitle,
  accentColor,
}: {
  icon: React.ElementType;
  number: number;
  suffix: string;
  label: string;
  subtitle: string;
  accentColor: string;
}) {
  const animated = useAnimatedNumber(number, 1800, suffix);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 md:p-6 flex flex-col items-center text-center space-y-2 hover:bg-white/10 transition-colors">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accentColor}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
        {animated}
      </div>
      <div className="text-sm md:text-base font-semibold text-sky-300">{label}</div>
      <div className="text-xs md:text-sm text-white/60 leading-relaxed">{subtitle}</div>
    </div>
  );
}

/* ── 降本数据看板 ── */
export function DataDashboard() {
  return (
    <section className="rounded-2xl bg-[#0F2B46] p-6 md:p-8 space-y-5">
      <h2 className="text-xl md:text-2xl font-bold text-white text-center">
        实战验证的降本效�?
      </h2>
      <p className="text-sky-300 text-center text-sm">用数据说话，每一分钱花得明白</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataCard
          icon={TrendingDown}
          number={75}
          suffix="%"
          label="售后赔付降低"
          subtitle="月均赔付�?0,000+降至2,500�?
          accentColor="bg-red-500/20"
        />
        <DataCard
          icon={Zap}
          number={3}
          suffix="�?
          label="新人上岗"
          subtitle="传统带教需2周，系统培训3天独立上�?
          accentColor="bg-amber-500/20"
        />
        <DataCard
          icon={Clock}
          number={2}
          suffix="小时"
          label="主管日均�?
          subtitle="AI承接高频咨询+自动质检，释放管理精�?
          accentColor="bg-sky-500/20"
        />
      </div>

      <p className="text-center text-white/40 text-xs">
        基于12年行业实战数�?
      </p>
    </section>
  );
}
