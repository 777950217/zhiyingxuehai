'use client';

import dynamic from 'next/dynamic';

const LazyLineChart = dynamic(
  () => import('./line-chart-inner'),
  {
    loading: () => (
      <div className="w-full h-[200px] flex items-center justify-center bg-blue-50 rounded-lg animate-pulse">
        <span className="text-blue-400 text-sm">加载图表中...</span>
      </div>
    ),
    ssr: false,
  }
);

export default LazyLineChart;
