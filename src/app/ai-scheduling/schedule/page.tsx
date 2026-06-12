'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ScheduleConfig {
  id: string;
  agent_count: number;
  daily_workload: number;
  peak_hours: string[];
  created_at: string;
}

interface ScheduleDay {
  day: string;
  date: string;
}

interface ScheduleCell {
  agentId: string;
  dayIndex: number;
  shift: string;
  isConflict: boolean;
  isOverwork: boolean;
}

const shiftConfig: Record<string, { label: string; color: string; bg: string; time: string }> = {
  morning: { label: '早班', color: 'text-blue-700', bg: 'bg-blue-100', time: '09:00-18:00' },
  evening: { label: '晚班', color: 'text-purple-700', bg: 'bg-purple-100', time: '14:00-22:00' },
  weekend: { label: '周末班', color: 'text-orange-700', bg: 'bg-orange-100', time: '10:00-20:00' },
  rest: { label: '休息', color: 'text-slate-400', bg: 'bg-slate-100', time: '-' },
};

const daysOfWeek = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const peakHourOptions = [
  { value: 'morning', label: '09:00-11:00' },
  { value: 'afternoon', label: '14:00-16:00' },
  { value: 'evening', label: '19:00-21:00' },
];

export default function AiSchedulingPage() {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [agents, setAgents] = useState<string[]>(['张三', '李四', '王五', '赵六', '钱七']);
  const [schedule, setSchedule] = useState<ScheduleCell[][]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generationConfig, setGenerationConfig] = useState({
    agentCount: 5,
    dailyWorkload: 200,
    peakHours: ['morning', 'afternoon'],
  });
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [historicalWeeks, setHistoricalWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase.from('ai_schedules').select('*');
        const weeks = ['2024-01-15', '2024-01-08', '2024-01-01'];
        setHistoricalWeeks(weeks);
        setSelectedWeek(weeks[0]);
      } catch (err) {
        console.error('获取排班数据失败:', err);
        const weeks = ['2024-01-15', '2024-01-08', '2024-01-01'];
        setHistoricalWeeks(weeks);
        setSelectedWeek(weeks[0]);
      }

      initSchedule();
      setLoading(false);
    };

    fetchSchedule();
  }, []);

  const initSchedule = () => {
    const initialSchedule: ScheduleCell[][] = [];
    for (let i = 0; i < agents.length; i++) {
      const row: ScheduleCell[] = [];
      for (let j = 0; j < 7; j++) {
        let shift = 'rest';
        if (j < 5) {
          const rand = Math.random();
          if (rand < 0.4) shift = 'morning';
          else if (rand < 0.7) shift = 'evening';
          else shift = 'rest';
        } else {
          shift = Math.random() < 0.5 ? 'weekend' : 'rest';
        }
        row.push({ agentId: agents[i], dayIndex: j, shift, isConflict: false, isOverwork: false });
      }
      initialSchedule.push(row);
    }
    detectConflicts(initialSchedule);
  };

  const detectConflicts = (scheduleData: ScheduleCell[][]) => {
    const newSchedule = scheduleData.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        if (cell.shift === 'rest') {
          return { ...cell, isConflict: false, isOverwork: false };
        }

        let workingDays = 0;
        row.forEach(c => {
          if (c.shift !== 'rest') workingDays++;
        });

        let sameShiftCount = 0;
        scheduleData.forEach(r => {
          if (r[colIndex].shift === cell.shift && r[colIndex].shift !== 'rest') {
            sameShiftCount++;
          }
        });

        return {
          ...cell,
          isConflict: sameShiftCount < 2,
          isOverwork: workingDays > 7,
        };
      });
    });
    setSchedule(newSchedule);
  };

  const generateSchedule = () => {
    const { agentCount, dailyWorkload } = generationConfig;
    const newAgents = Array.from({ length: agentCount }, (_, i) => `客服${i + 1}`);
    setAgents(newAgents);

    const newSchedule: ScheduleCell[][] = [];
    const coverage = Math.ceil(dailyWorkload / 50);

    for (let i = 0; i < agentCount; i++) {
      const row: ScheduleCell[] = [];
      for (let j = 0; j < 7; j++) {
        let shift = 'rest';
        const agentIndex = i % coverage;
        const dayType = j < 5 ? 'weekday' : 'weekend';

        if (dayType === 'weekday') {
          if (agentIndex === 0) shift = 'morning';
          else if (agentIndex === 1) shift = 'evening';
          else if (j < 5 && i < Math.ceil(agentCount / 2)) shift = 'morning';
        } else {
          if (i < Math.ceil(agentCount / 3)) shift = 'weekend';
        }

        if (Math.random() < 0.15) shift = 'rest';

        row.push({ agentId: newAgents[i], dayIndex: j, shift, isConflict: false, isOverwork: false });
      }
      newSchedule.push(row);
    }

    detectConflicts(newSchedule);
    setShowGenerateModal(false);
    setGenerationConfig({ agentCount, dailyWorkload, peakHours: generationConfig.peakHours });
  };

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setShowShiftModal(true);
  };

  const handleShiftChange = (newShift: string) => {
    if (!selectedCell) return;
    const newSchedule = schedule.map((r, ri) =>
      r.map((c, ci) =>
        ri === selectedCell.row && ci === selectedCell.col
          ? { ...c, shift: newShift }
          : c
      )
    );
    detectConflicts(newSchedule);
    setShowShiftModal(false);
    setSelectedCell(null);
  };

  const getWeekDates = () => {
    const dates: ScheduleDay[] = [];
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push({
        day: daysOfWeek[i],
        date: `${date.getMonth() + 1}/${date.getDate()}`,
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">AI智能排班</h1>
            <p className="text-slate-500 text-sm mt-1">AI自动生成最优排班方案，支持手动调整</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {historicalWeeks.map(week => (
                <option key={week} value={week}>{week}</option>
              ))}
            </select>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI生成排班
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出Excel
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            周视图
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            日视图
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-24">客服</th>
                  {weekDates.map((d, i) => (
                    <th key={i} className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase min-w-[120px]">
                      <div className="font-semibold">{d.day}</div>
                      <div className="text-slate-400">{d.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                    </td>
                  </tr>
                ) : schedule.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-500">暂无排班数据，请点击「AI生成排班」</p>
                    </td>
                  </tr>
                ) : (
                  schedule.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-sm">{agents[rowIndex][0]}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-700">{agents[rowIndex]}</span>
                        </div>
                      </td>
                      {row.map((cell, colIndex) => {
                        const shift = shiftConfig[cell.shift];
                        return (
                          <td
                            key={colIndex}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            className={`px-3 py-3 text-center cursor-pointer transition-all hover:ring-2 hover:ring-blue-300 ${
                              cell.isConflict ? 'bg-yellow-50' : ''
                            } ${cell.isOverwork ? 'bg-red-50' : ''}`}
                          >
                            <div
                              className={`inline-flex flex-col items-center px-3 py-2 rounded-lg ${shift.bg} ${shift.color} ${
                                cell.isConflict ? 'ring-2 ring-yellow-400' : ''
                              } ${cell.isOverwork ? 'ring-2 ring-red-400' : ''}`}
                            >
                              <span className="text-sm font-medium">{shift.label}</span>
                              <span className="text-xs opacity-70">{shift.time}</span>
                            </div>
                            {cell.isConflict && (
                              <div className="mt-1 text-xs text-yellow-600 flex items-center justify-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                人员不足
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100"></div>
            <span className="text-sm text-slate-600">早班 (09:00-18:00)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-100"></div>
            <span className="text-sm text-slate-600">晚班 (14:00-22:00)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100"></div>
            <span className="text-sm text-slate-600">周末班 (10:00-20:00)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-100"></div>
            <span className="text-sm text-slate-600">休息</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-yellow-400"></div>
            <span className="text-sm text-yellow-600">人员不足预警</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-red-400"></div>
            <span className="text-sm text-red-600">连续工作超7天</span>
          </div>
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">AI生成排班</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">客服人数</label>
                <input
                  type="number"
                  value={generationConfig.agentCount}
                  onChange={(e) => setGenerationConfig(prev => ({ ...prev, agentCount: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="20"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">预计日均工单量</label>
                <input
                  type="number"
                  value={generationConfig.dailyWorkload}
                  onChange={(e) => setGenerationConfig(prev => ({ ...prev, dailyWorkload: parseInt(e.target.value) || 50 }))}
                  min="10"
                  max="1000"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">高峰时段分布</label>
                <div className="flex flex-wrap gap-2">
                  {peakHourOptions.map(option => (
                    <label
                      key={option.value}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        generationConfig.peakHours.includes(option.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={generationConfig.peakHours.includes(option.value)}
                        onChange={(e) => {
                          const newPeakHours = e.target.checked
                            ? [...generationConfig.peakHours, option.value]
                            : generationConfig.peakHours.filter(h => h !== option.value);
                          setGenerationConfig(prev => ({ ...prev, peakHours: newPeakHours }));
                        }}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={generateSchedule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  AI生成排班
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShiftModal && selectedCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">选择班次</h3>
              <p className="text-sm text-slate-500 mt-1">{agents[selectedCell.row]} - {daysOfWeek[selectedCell.col]}</p>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(shiftConfig).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleShiftChange(key)}
                  className={`w-full px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                    schedule[selectedCell.row]?.[selectedCell.col]?.shift === key
                      ? `${value.bg} ${value.color} ring-2 ring-blue-500`
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <span className="font-medium">{value.label}</span>
                  <span className="text-sm opacity-70">{value.time}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setShowShiftModal(false);
                  setSelectedCell(null);
                }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}