'use client';

import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Line } from 'recharts';

interface LineChartInnerProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  stroke?: string;
  xKey?: string;
}

export default function LineChartInner({ data, dataKey, stroke = '#0ea5e9', xKey = 'name' }: LineChartInnerProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
