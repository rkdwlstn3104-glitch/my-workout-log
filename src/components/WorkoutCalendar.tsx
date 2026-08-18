import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Flame, Droplets } from 'lucide-react';
import { WorkoutLogEntry } from '../types';

interface WorkoutCalendarProps {
  currentDate: Date; // date for month view
  selectedDateStr: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onChangeMonth: (offset: number) => void;
  onGoToToday: () => void;
  logs: Record<string, WorkoutLogEntry>;
}

export const WorkoutCalendar: React.FC<WorkoutCalendarProps> = ({
  currentDate,
  selectedDateStr,
  onSelectDate,
  onChangeMonth,
  onGoToToday,
  logs,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // First day of current month and total days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Today string
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build grid days
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      dayOfWeek: (firstDayIndex - 1 - i) % 7,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cellDate = new Date(year, month, d);
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      dayOfWeek: cellDate.getDay(),
    });
  }

  // Next month leading days to complete grid
  const remainingCells = 42 - calendarCells.length; // 6 rows * 7
  for (let d = 1; d <= remainingCells && calendarCells.length % 7 !== 0; d++) {
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      dayOfWeek: (calendarCells.length) % 7,
    });
  }

  // Calculate monthly stats
  let totalLoggedDays = 0;
  let perfectDays = 0;
  let totalCaloriesMonth = 0;

  calendarCells.forEach((c) => {
    if (c.isCurrentMonth && logs[c.dateStr]) {
      const entry = logs[c.dateStr];
      if (entry.completionRate > 0 || entry.savedAt) {
        totalLoggedDays++;
        if (entry.completionRate === 100) perfectDays++;
        if (entry.calories) totalCaloriesMonth += Number(entry.calories) || 0;
      }
    }
  });

  return (
    <div id="workout-calendar-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Calendar Top Navigation */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
              {year}년 {monthNames[month]}
              <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                운동 달력
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 hidden sm:block">날짜를 클릭하여 루틴과 건강 데이터를 기록하세요</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="btn-goto-today"
            onClick={onGoToToday}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
          >
            오늘
          </button>
          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
            <button
              id="btn-prev-month"
              onClick={() => onChangeMonth(-1)}
              aria-label="이전 달"
              className="p-1 sm:p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="h-3.5 sm:h-4 w-px bg-slate-200" />
            <button
              id="btn-next-month"
              onClick={() => onChangeMonth(1)}
              aria-label="다음 달"
              className="p-1 sm:p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Mini Status Indicator Bar */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-white text-center py-1.5 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs">
        <div className="flex items-center justify-center gap-1 text-slate-600 truncate px-1">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">완료: <strong className="text-slate-900">{totalLoggedDays}일</strong> ({perfectDays}회 100%)</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-slate-600 truncate px-1">
          <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 shrink-0" />
          <span className="truncate">소모: <strong className="text-slate-900">{totalCaloriesMonth.toLocaleString()} kcal</strong></span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[9px] sm:text-xs">
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-emerald-500"></span> 100%</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-amber-400"></span> 50%+</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-orange-500"></span> 1~49%</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-rose-500"></span> 0%</span>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 text-center text-[11px] sm:text-xs font-bold py-1.5 bg-slate-50 text-slate-600">
        {dayNames.map((d, i) => (
          <div key={d} className={i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : ''}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/20">
        {calendarCells.map((cell) => {
          const entry = logs[cell.dateStr];
          const isSelected = cell.dateStr === selectedDateStr;
          const isToday = cell.dateStr === todayStr;

          // Real-time calculation of completion rate from exercises if available
          let calculatedRate = 0;
          if (entry) {
            if (Array.isArray(entry.exercises) && entry.exercises.length > 0) {
              const completedCount = entry.exercises.filter((e) => e.completed).length;
              calculatedRate = Math.round((completedCount / entry.exercises.length) * 100);
            } else if (typeof entry.completionRate === 'number') {
              calculatedRate = entry.completionRate;
            }
          }

          const hasRecord = !!entry && (calculatedRate > 0 || !!entry.savedAt || !!entry.waistCondition || (entry.exercises && entry.exercises.length > 0));

          // Color classification based on specifications:
          // 100% -> Emerald Green
          // 50% ~ 99% -> Amber/Yellow
          // 1% ~ 49% -> Orange
          // 0% or No Record -> Red
          let badgeColorClass = 'bg-rose-500 text-white font-bold';
          if (calculatedRate === 100) {
            badgeColorClass = 'bg-emerald-500 text-white font-bold';
          } else if (calculatedRate >= 50) {
            badgeColorClass = 'bg-amber-400 text-amber-950 font-bold';
          } else if (calculatedRate > 0) {
            badgeColorClass = 'bg-orange-500 text-white font-bold';
          } else {
            // 0% or No Record
            badgeColorClass = 'bg-rose-500 text-white font-bold';
          }

          const isSunday = cell.dayOfWeek === 0;
          const isSaturday = cell.dayOfWeek === 6;

          return (
            <button
              key={cell.dateStr}
              id={`calendar-cell-${cell.dateStr}`}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[58px] sm:min-h-[84px] p-1 sm:p-2 text-left relative transition-all duration-150 flex flex-col justify-between group
                ${cell.isCurrentMonth ? 'bg-white hover:bg-blue-50/30' : 'bg-slate-50/60 text-slate-400 hover:bg-slate-100/50'}
                ${isSelected ? 'ring-2 ring-blue-600 bg-blue-50/50 z-10' : ''}
                ${isToday ? 'border-2 border-blue-600 shadow-xs z-10' : ''}
              `}
            >
              <div className="flex items-start justify-between w-full">
                <span
                  className={`text-[11px] sm:text-sm font-semibold rounded-md w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center
                    ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                    ${!isSelected && isToday ? 'text-blue-700 font-bold bg-blue-100' : ''}
                    ${!isSelected && !isToday && isSunday ? 'text-rose-500' : ''}
                    ${!isSelected && !isToday && isSaturday ? 'text-blue-500' : ''}
                    ${!isSelected && !isToday && !isSunday && !isSaturday ? 'text-slate-700' : ''}
                  `}
                >
                  {cell.dayNumber}
                </span>

                {/* Waist condition traffic light dot */}
                {entry?.waistCondition && (
                  <span
                    title={`허리상태: ${entry.waistCondition === 'good' ? '좋음' : entry.waistCondition === 'normal' ? '보통' : '주의'}`}
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-1.5 ring-white
                      ${entry.waistCondition === 'good' ? 'bg-emerald-500' : ''}
                      ${entry.waistCondition === 'normal' ? 'bg-amber-400' : ''}
                      ${entry.waistCondition === 'caution' ? 'bg-rose-500' : ''}
                    `}
                  />
                )}
              </div>

              {/* Rate Badge and Routine Tag */}
              <div className="mt-0.5 sm:mt-1 space-y-0.5 w-full">
                {cell.isCurrentMonth && (
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-sm sm:rounded-md shadow-2xs ${badgeColorClass}`}
                    >
                      {calculatedRate}%
                    </span>
                    {entry?.savedAt && (
                      <span title="시트에 저장됨" className="text-emerald-600 text-[9px] sm:text-[10px] hidden sm:inline">
                        <CheckCircle2 className="w-3 h-3 inline" />
                      </span>
                    )}
                  </div>
                )}

                {/* Routine Part Mini Label */}
                {entry?.workoutPart && cell.isCurrentMonth && (
                  <p className="text-[8px] sm:text-[10px] text-slate-500 truncate leading-tight font-medium">
                    {entry.workoutPart.split('/')[0].split('(')[0]}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
