import React from 'react';
import { Trophy, Flame, Droplets, Target, ShieldCheck, TrendingUp, Calendar } from 'lucide-react';
import { WorkoutLogEntry } from '../types';

interface StatsDashboardProps {
  logs: Record<string, WorkoutLogEntry>;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ logs }) => {
  const entries: WorkoutLogEntry[] = Object.values(logs) as WorkoutLogEntry[];
  const totalDays = entries.length;

  const perfectDays = entries.filter((e) => e.completionRate === 100).length;
  const avgCompletion =
    totalDays > 0 ? Math.round(entries.reduce((acc, cur) => acc + (cur.completionRate || 0), 0) / totalDays) : 0;
  const totalCalories = entries.reduce((acc, cur) => acc + (Number(cur.calories) || 0), 0);
  const totalWaterCups = entries.reduce((acc, cur) => acc + (Number(cur.waterCups) || 0), 0);
  const goodWaistCount = entries.filter((e) => e.waistCondition === 'good').length;
  const fastingCount = entries.filter((e) => Boolean(e.fastingSuccess)).length;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {/* 1. Perfect Streak / Days */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold truncate">100% 완벽</span>
          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
        </div>
        <div>
          <span className="text-base sm:text-xl font-black text-slate-900">{perfectDays}</span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-0.5">일</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-emerald-600 font-medium mt-0.5 truncate">
          {totalDays}일 중 달성
        </div>
      </div>

      {/* 2. Average Completion */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold truncate">평균 달성률</span>
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
        </div>
        <div>
          <span className="text-base sm:text-xl font-black text-blue-600">{avgCompletion}%</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-blue-600 font-medium mt-0.5 truncate">
          목표 완수율
        </div>
      </div>

      {/* 3. Total Calories */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold truncate">누적 칼로리</span>
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
        </div>
        <div>
          <span className="text-base sm:text-xl font-black text-amber-600">{totalCalories > 9999 ? `${Math.round(totalCalories / 1000)}k` : totalCalories.toLocaleString()}</span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-0.5">kcal</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-amber-700 font-medium mt-0.5 truncate">
          워치9 측정합
        </div>
      </div>

      {/* 4. Total Water */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold truncate">총 수분섭취</span>
          <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500 shrink-0" />
        </div>
        <div>
          <span className="text-base sm:text-xl font-black text-cyan-600">{(totalWaterCups * 0.5).toFixed(1)}</span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-0.5">L</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-cyan-700 font-medium mt-0.5 truncate">
          {totalWaterCups}잔 (500ml)
        </div>
      </div>

      {/* 5. Waist Condition Stability */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold truncate">허리 쾌청율</span>
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
        </div>
        <div>
          <span className="text-base sm:text-xl font-black text-emerald-700">
            {totalDays > 0 ? Math.round((goodWaistCount / totalDays) * 100) : 0}%
          </span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-emerald-600 font-medium mt-0.5 truncate">
          🟢 좋음 {goodWaistCount}회
        </div>
      </div>

      {/* 6. Intermittent Fasting */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold truncate">단식 성공</span>
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
        </div>
        <div>
          <span className="text-base sm:text-xl font-black text-indigo-600">{fastingCount}</span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-0.5">일</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-indigo-600 font-medium mt-0.5 truncate">
          12:12 단식
        </div>
      </div>
    </div>
  );
};
