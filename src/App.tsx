import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Activity,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  HeartPulse,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { WorkoutLogEntry, ExerciseItem, WaistCondition } from './types';
import { defaultTemplates, DAY_NAMES } from './data/defaultTemplates';
import {
  getStoredLogs,
  saveStoredLogs,
  createInitialEntryForDate,
} from './lib/storage';
import {
  getGasWebAppUrl,
  isGasAutoSyncEnabled,
  syncToGoogleAppsScript,
  fetchLogsFromGoogleAppsScript,
  deleteFromGoogleAppsScript,
} from './lib/googleAppsScript';
import { WorkoutCalendar } from './components/WorkoutCalendar';
import { WorkoutRoutineList } from './components/WorkoutRoutineList';
import { HealthMetricsPanel } from './components/HealthMetricsPanel';
import { GoogleSheetView } from './components/GoogleSheetView';
import { StatsDashboard } from './components/StatsDashboard';
import { GoogleAppsScriptModal } from './components/GoogleAppsScriptModal';

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function App() {
  const [logs, setLogs] = useState<Record<string, WorkoutLogEntry>>({});
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayString());
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'tracker' | 'sheet' | 'both'>('tracker');
  const [mobileSubTab, setMobileSubTab] = useState<'routine' | 'health' | 'calendar'>('routine');
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  // Google Apps Script Auto Sync States
  const [webAppUrl, setWebAppUrl] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [isGasModalOpen, setIsGasModalOpen] = useState<boolean>(false);
  const [isFetchingFromSheet, setIsFetchingFromSheet] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Show temporary toast message
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    const duration = type === 'error' ? 6000 : 3500;
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  // Realtime Fetch from Google Sheet (Makes Google Sheet the Primary Source of Truth)
  const refreshLogsFromGoogleSheet = useCallback(
    async (urlToUse?: string, notify: boolean = true) => {
      const targetUrl = (urlToUse || webAppUrl).trim();
      if (!targetUrl) return;

      setIsFetchingFromSheet(true);
      const res = await fetchLogsFromGoogleAppsScript(targetUrl);
      setIsFetchingFromSheet(false);

      if (res.success && res.logs) {
        // Google Sheet is authoritative: replace state and local cache with exact Sheet records
        setLogs(res.logs);
        saveStoredLogs(res.logs);
        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedTime(nowStr);

        if (notify) {
          showToast(`🎉 구글 시트에서 최신 데이터 ${res.count || Object.keys(res.logs).length}건을 성공적으로 불러왔습니다!`, 'success');
        }
      } else if (notify && !res.success) {
        showToast(`구글 시트 데이터 조회 실패: ${res.message}`, 'error');
      }
    },
    [webAppUrl]
  );

  // Initialize logs & GAS settings on load, then auto-fetch from Google Sheet
  useEffect(() => {
    const loaded = getStoredLogs();
    setLogs(loaded);
    const savedUrl = getGasWebAppUrl();
    setWebAppUrl(savedUrl);
    setAutoSync(isGasAutoSyncEnabled());

    // If Google Sheet Web App URL exists, prioritize fetching fresh data from Google Sheet
    if (savedUrl) {
      refreshLogsFromGoogleSheet(savedUrl, false);
    }
  }, [refreshLogsFromGoogleSheet]);

  // Auto-sync when window regains focus / visibility (PC ↔ Mobile seamless sync)
  useEffect(() => {
    const handleFocusOrVisible = () => {
      const savedUrl = getGasWebAppUrl();
      if (savedUrl && document.visibilityState === 'visible') {
        refreshLogsFromGoogleSheet(savedUrl, false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [refreshLogsFromGoogleSheet]);

  // Get current active entry or generate template draft
  const currentEntry: WorkoutLogEntry =
    logs[selectedDateStr] || createInitialEntryForDate(selectedDateStr);

  // Helper to update current entry
  const updateCurrentEntry = (updated: WorkoutLogEntry) => {
    const newLogs = { ...logs, [selectedDateStr]: updated };
    setLogs(newLogs);
    saveStoredLogs(newLogs);
  };

  // Exercise handlers
  const handleToggleExercise = (id: string) => {
    const newExercises = currentEntry.exercises.map((ex) =>
      ex.id === id ? { ...ex, completed: !ex.completed } : ex
    );
    const completedCount = newExercises.filter((e) => e.completed).length;
    const rate = newExercises.length > 0 ? Math.round((completedCount / newExercises.length) * 100) : 0;

    const updated: WorkoutLogEntry = {
      ...currentEntry,
      exercises: newExercises,
      completionRate: rate,
    };
    updateCurrentEntry(updated);

    if (rate === 100 && currentEntry.completionRate < 100) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
      showToast('🎉 오늘 운동 루틴 100% 달성! 대단합니다!', 'success');
    }
  };

  const handleUpdateExerciseName = (id: string, newName: string) => {
    const newExercises = currentEntry.exercises.map((ex) =>
      ex.id === id ? { ...ex, name: newName } : ex
    );
    updateCurrentEntry({ ...currentEntry, exercises: newExercises });
    showToast('운동 항목 명칭이 수정되었습니다.', 'info');
  };

  const handleUpdateExerciseWeight = (id: string, weight: string) => {
    const newExercises = currentEntry.exercises.map((ex) =>
      ex.id === id ? { ...ex, weight } : ex
    );
    // Automatically synthesize summary for the Google Sheet H-column
    const weightedItems = newExercises
      .filter((e) => e.weight && e.weight.trim() !== '')
      .map((e) => `${e.name.split('(')[0].replace(/\[.*?\]/g, '').trim()} ${e.weight}`);
    
    const summary = weightedItems.join(', ');

    updateCurrentEntry({
      ...currentEntry,
      exercises: newExercises,
      weightMemo: summary || currentEntry.weightMemo,
    });
  };

  const handleUpdateExerciseDetails = (id: string, desc: string, tip: string) => {
    const newExercises = currentEntry.exercises.map((ex) =>
      ex.id === id ? { ...ex, desc, tip } : ex
    );
    updateCurrentEntry({ ...currentEntry, exercises: newExercises });
  };

  const handleDeleteExercise = (id: string) => {
    const newExercises = currentEntry.exercises.filter((ex) => ex.id !== id);
    const completedCount = newExercises.filter((e) => e.completed).length;
    const rate = newExercises.length > 0 ? Math.round((completedCount / newExercises.length) * 100) : 0;

    // Recalculate weight memo
    const weightedItems = newExercises
      .filter((e) => e.weight && e.weight.trim() !== '')
      .map((e) => `${e.name.split('(')[0].replace(/\[.*?\]/g, '').trim()} ${e.weight}`);

    updateCurrentEntry({
      ...currentEntry,
      exercises: newExercises,
      completionRate: rate,
      weightMemo: weightedItems.join(', ') || currentEntry.weightMemo,
    });
    showToast('운동 항목이 삭제되었습니다.', 'info');
  };

  const handleAddExercise = (name: string, desc = '', tip = '', weight = '') => {
    const newItem: ExerciseItem = {
      id: `${selectedDateStr}-ex-custom-${Date.now()}`,
      name,
      desc,
      tip,
      weight: weight || '',
      completed: false,
    };
    const newExercises = [...currentEntry.exercises, newItem];
    const completedCount = newExercises.filter((e) => e.completed).length;
    const rate = Math.round((completedCount / newExercises.length) * 100);

    const weightedItems = newExercises
      .filter((e) => e.weight && e.weight.trim() !== '')
      .map((e) => `${e.name.split('(')[0].replace(/\[.*?\]/g, '').trim()} ${e.weight}`);

    updateCurrentEntry({
      ...currentEntry,
      exercises: newExercises,
      completionRate: rate,
      weightMemo: weightedItems.join(', ') || currentEntry.weightMemo,
    });
    showToast(`'${name}' 운동이 추가되었습니다!`, 'success');
  };

  const handleResetTemplate = () => {
    const fresh = createInitialEntryForDate(selectedDateStr);
    const updated: WorkoutLogEntry = {
      ...currentEntry,
      workoutPart: fresh.workoutPart,
      exercises: fresh.exercises,
      completionRate: 0,
    };
    updateCurrentEntry(updated);
    showToast(`${currentEntry.dayOfWeek}요일 기본 루틴으로 초기화되었습니다.`, 'info');
  };

  const handleChangeWorkoutPart = (part: string) => {
    updateCurrentEntry({ ...currentEntry, workoutPart: part });
  };

  // Health metric handlers
  const handleChangeWaistCondition = (cond: WaistCondition) => {
    updateCurrentEntry({ ...currentEntry, waistCondition: cond });
    if (cond === 'good') showToast('허리 상태: 🟢 좋음 선택됨', 'success');
    if (cond === 'normal') showToast('허리 상태: 🟡 보통 선택됨 (중량 70% 권장)', 'info');
    if (cond === 'caution') showToast('허리 상태: 🔴 주의 선택됨 (과도한 꺾임 주의)', 'info');
  };

  const handleChangeHeartRate = (val: string) => {
    updateCurrentEntry({ ...currentEntry, heartRate: val });
  };

  const handleChangeCalories = (val: string) => {
    updateCurrentEntry({ ...currentEntry, calories: val });
  };

  const handleChangeWeightMemo = (val: string) => {
    updateCurrentEntry({ ...currentEntry, weightMemo: val });
  };

  const handleChangeWaterCups = (val: number) => {
    updateCurrentEntry({ ...currentEntry, waterCups: val });
  };

  const handleChangeFastingSuccess = (val: boolean) => {
    updateCurrentEntry({ ...currentEntry, fastingSuccess: val });
    showToast(val ? '간헐적 단식 성공으로 체크되었습니다!' : '단식 체크가 해제되었습니다.', 'info');
  };

  // Save to sheet button
  const handleSaveToSheet = async () => {
    const completedCount = (currentEntry.exercises || []).filter((e) => e.completed).length;
    const totalCount = (currentEntry.exercises || []).length;
    const exactRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const entryToSave: WorkoutLogEntry = {
      ...currentEntry,
      completionRate: exactRate,
      savedAt: new Date().toISOString(),
    };
    updateCurrentEntry(entryToSave);

    if (exactRate === 100) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // If Google Apps Script Web App URL is configured and autoSync is enabled, send data automatically
    if (webAppUrl && autoSync) {
      showToast(`💾 [${selectedDateStr}] 기록 저장 중 및 구글 시트로 자동 전송 중...`, 'info');
      const res = await syncToGoogleAppsScript(webAppUrl, entryToSave);
      if (res.success) {
        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedTime(nowStr);
        showToast(`🎉 [${selectedDateStr}] 기록 저장 및 구글 시트 실시간 동기화 완료!`, 'success');
      } else {
        showToast(`⚠️ 로컬에는 저장되었으나 구글 시트 전송 오류: ${res.message}`, 'error');
      }
    } else {
      showToast(`💾 [${selectedDateStr}] 운동 기록이 로컬에 저장되었습니다!`, 'success');
    }
  };

  const handleDeleteRow = async (dateStr: string) => {
    if (window.confirm(`${dateStr} 운동 기록을 삭제하시겠습니까?`)) {
      const newLogs = { ...logs };
      delete newLogs[dateStr];
      setLogs(newLogs);
      saveStoredLogs(newLogs);
      showToast(`${dateStr} 기록이 삭제되었습니다.`, 'info');

      if (webAppUrl) {
        const res = await deleteFromGoogleAppsScript(webAppUrl, dateStr);
        if (res.success) {
          showToast(`구글 시트에서도 [${dateStr}] 기록이 삭제되었습니다.`, 'info');
        }
      }
    }
  };

  const handleChangeMonth = (offset: number) => {
    const next = new Date(calendarMonthDate);
    next.setMonth(next.getMonth() + offset);
    setCalendarMonthDate(next);
  };

  const handleGoToToday = () => {
    const today = getTodayString();
    setSelectedDateStr(today);
    setCalendarMonthDate(new Date());
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-blue-200">
      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className={`fixed top-4 right-4 z-50 max-w-md px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-700 text-white border-rose-600'
              : toast.type === 'info'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-emerald-600 text-white border-emerald-500'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          )}
          <span className="leading-snug">{toast.message}</span>
        </div>
      )}

      {/* Top Main Navigation Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  나만의 운동 기록부
                </h1>
                <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                  {currentEntry.dayOfWeek}요일
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                요일별 100분 루틴 · 허리 부상방지 안전 팁 · 갤럭시 워치9 연동 기록부
              </p>
            </div>
          </div>

          {/* View Mode Switcher & GAS Auto Sync Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {webAppUrl && (
              <button
                type="button"
                id="btn-header-quick-refresh"
                onClick={() => refreshLogsFromGoogleSheet(webAppUrl, true)}
                disabled={isFetchingFromSheet}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow-2xs transition-all disabled:opacity-50"
                title="구글 시트에서 최신 데이터 즉시 새로고침 (실시간 양방향 동기화)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFromSheet ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden sm:inline">{isFetchingFromSheet ? '동기화 중...' : '시트 동기화'}</span>
              </button>
            )}

            <button
              type="button"
              id="btn-header-gas-sync"
              onClick={() => setIsGasModalOpen(true)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-2xs transition-all ${
                webAppUrl
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title="구글 스프레드시트 자동 연동 설정"
            >
              {webAppUrl ? (
                <>
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden sm:inline">시트 연동됨</span>
                  <span className="sm:hidden">시트ON</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">⚡ 구글 시트 자동 저장</span>
                  <span className="sm:hidden">시트 연동</span>
                </>
              )}
            </button>

            {/* Desktop Navigation Switcher */}
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                id="tab-tracker"
                onClick={() => setActiveTab('tracker')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'tracker'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>루틴 & 건강일지</span>
              </button>
              <button
                id="tab-sheet"
                onClick={() => setActiveTab('sheet')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'sheet'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>구글 시트 뷰 (10개 열)</span>
              </button>
              <button
                id="tab-both"
                onClick={() => setActiveTab('both')}
                className="px-3 py-1.5 rounded-lg hidden lg:flex items-center gap-1.5 transition-all text-slate-600 hover:text-slate-900"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>전체 보기</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Quick Segment Bar (Visible only on mobile vertical screens) */}
        {activeTab === 'tracker' && (
          <div className="md:hidden px-3 pb-2 pt-1 border-t border-slate-100 flex items-center bg-slate-50/80">
            <div className="grid grid-cols-3 gap-1 w-full bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                id="mobile-tab-routine"
                onClick={() => setMobileSubTab('routine')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  mobileSubTab === 'routine'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>1. 운동 루틴</span>
              </button>
              <button
                type="button"
                id="mobile-tab-health"
                onClick={() => setMobileSubTab('health')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  mobileSubTab === 'health'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>2. 건강 기록</span>
              </button>
              <button
                type="button"
                id="mobile-tab-calendar"
                onClick={() => setMobileSubTab('calendar')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  mobileSubTab === 'calendar'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>3. 월간 달력</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 flex-1 space-y-4 sm:space-y-6 w-full pb-20 md:pb-6">
        {/* Top Summary Stats */}
        <StatsDashboard logs={logs} />

        {/* Dynamic View Containers */}
        {activeTab === 'tracker' && (
          <div>
            {/* Desktop Layout (Standard 2-Column Grid) */}
            <div className="hidden md:grid md:grid-cols-12 gap-6">
              {/* Left Column: Calendar */}
              <div className="md:col-span-5 space-y-6">
                <WorkoutCalendar
                  currentDate={calendarMonthDate}
                  selectedDateStr={selectedDateStr}
                  onSelectDate={(d) => setSelectedDateStr(d)}
                  onChangeMonth={handleChangeMonth}
                  onGoToToday={handleGoToToday}
                  logs={logs}
                />

                {/* Quick Google Sheet Mini Preview in Left Column */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      구글 시트 연동 안내
                    </span>
                    <button
                      onClick={() => setActiveTab('sheet')}
                      className="text-emerald-700 hover:underline font-semibold text-[11px]"
                    >
                      스프레드시트 전체 열기 →
                    </button>
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    우측의 운동과 건강 데이터를 입력 후 <strong>[💾 성과 시트에 기록하기]</strong>를 누르면 10개 열(날짜, 요일, 운동부위, 달성율, 허리, 심박, 칼로리, 중량, 물, 단식)에 자동으로 정리됩니다.
                  </p>
                </div>
              </div>

              {/* Right Column: Routine Checklist & Health Tracker */}
              <div className="md:col-span-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WorkoutRoutineList
                  dateStr={selectedDateStr}
                  dayOfWeek={currentEntry.dayOfWeek}
                  workoutPart={currentEntry.workoutPart}
                  onChangeWorkoutPart={handleChangeWorkoutPart}
                  exercises={currentEntry.exercises}
                  onToggleExercise={handleToggleExercise}
                  onUpdateExerciseName={handleUpdateExerciseName}
                  onUpdateExerciseWeight={handleUpdateExerciseWeight}
                  onUpdateExerciseDetails={handleUpdateExerciseDetails}
                  onDeleteExercise={handleDeleteExercise}
                  onAddExercise={handleAddExercise}
                  onResetTemplate={handleResetTemplate}
                />

                <HealthMetricsPanel
                  dateStr={selectedDateStr}
                  waistCondition={currentEntry.waistCondition}
                  onChangeWaistCondition={handleChangeWaistCondition}
                  heartRate={currentEntry.heartRate}
                  onChangeHeartRate={handleChangeHeartRate}
                  calories={currentEntry.calories}
                  onChangeCalories={handleChangeCalories}
                  exercises={currentEntry.exercises}
                  weightMemo={currentEntry.weightMemo}
                  onChangeWeightMemo={handleChangeWeightMemo}
                  waterCups={currentEntry.waterCups}
                  onChangeWaterCups={handleChangeWaterCups}
                  fastingSuccess={currentEntry.fastingSuccess}
                  onChangeFastingSuccess={handleChangeFastingSuccess}
                  completionRate={currentEntry.completionRate}
                  onSaveToSheet={handleSaveToSheet}
                  isSavedToday={!!currentEntry.savedAt}
                  webAppUrl={webAppUrl}
                  autoSync={autoSync}
                  onOpenGasModal={() => setIsGasModalOpen(true)}
                />
              </div>
            </div>

            {/* Mobile Smartphone View (Focused Single Panel Layout with Subtabs) */}
            <div className="md:hidden space-y-4">
              {/* Active date header indicator on mobile */}
              <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">선택된 날짜:</span>
                  <span className="text-xs font-extrabold text-blue-700">{selectedDateStr} ({currentEntry.dayOfWeek})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSubTab('calendar')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg"
                >
                  날짜 변경
                </button>
              </div>

              {/* Subtab 1: Workout Routine List */}
              {mobileSubTab === 'routine' && (
                <div className="space-y-4">
                  <WorkoutRoutineList
                    dateStr={selectedDateStr}
                    dayOfWeek={currentEntry.dayOfWeek}
                    workoutPart={currentEntry.workoutPart}
                    onChangeWorkoutPart={handleChangeWorkoutPart}
                    exercises={currentEntry.exercises}
                    onToggleExercise={handleToggleExercise}
                    onUpdateExerciseName={handleUpdateExerciseName}
                    onUpdateExerciseWeight={handleUpdateExerciseWeight}
                    onUpdateExerciseDetails={handleUpdateExerciseDetails}
                    onDeleteExercise={handleDeleteExercise}
                    onAddExercise={handleAddExercise}
                    onResetTemplate={handleResetTemplate}
                  />

                  {/* Mobile Quick Jump to Next Step (Health Metrics) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">운동 완료 후 건강 지표를 입력하세요</span>
                    <button
                      type="button"
                      onClick={() => setMobileSubTab('health')}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg shadow-xs hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <span>건강 기록 입력 →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Subtab 2: Health Metrics Panel */}
              {mobileSubTab === 'health' && (
                <div className="space-y-4">
                  <HealthMetricsPanel
                    dateStr={selectedDateStr}
                    waistCondition={currentEntry.waistCondition}
                    onChangeWaistCondition={handleChangeWaistCondition}
                    heartRate={currentEntry.heartRate}
                    onChangeHeartRate={handleChangeHeartRate}
                    calories={currentEntry.calories}
                    onChangeCalories={handleChangeCalories}
                    exercises={currentEntry.exercises}
                    weightMemo={currentEntry.weightMemo}
                    onChangeWeightMemo={handleChangeWeightMemo}
                    waterCups={currentEntry.waterCups}
                    onChangeWaterCups={handleChangeWaterCups}
                    fastingSuccess={currentEntry.fastingSuccess}
                    onChangeFastingSuccess={handleChangeFastingSuccess}
                    completionRate={currentEntry.completionRate}
                    onSaveToSheet={handleSaveToSheet}
                    isSavedToday={!!currentEntry.savedAt}
                    webAppUrl={webAppUrl}
                    autoSync={autoSync}
                    onOpenGasModal={() => setIsGasModalOpen(true)}
                  />

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMobileSubTab('routine')}
                      className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100"
                    >
                      ← 운동 루틴 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sheet')}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
                    >
                      시트 확인하기 →
                    </button>
                  </div>
                </div>
              )}

              {/* Subtab 3: Workout Calendar */}
              {mobileSubTab === 'calendar' && (
                <div className="space-y-4">
                  <WorkoutCalendar
                    currentDate={calendarMonthDate}
                    selectedDateStr={selectedDateStr}
                    onSelectDate={(d) => {
                      setSelectedDateStr(d);
                      setMobileSubTab('routine');
                      showToast(`${d} 일지를 선택했습니다.`, 'info');
                    }}
                    onChangeMonth={handleChangeMonth}
                    onGoToToday={handleGoToToday}
                    logs={logs}
                  />
                  <p className="text-center text-xs text-slate-500">
                    💡 날짜를 터치하면 해당 일자의 운동 루틴 화면으로 바로 이동합니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sheet' && (
          <div className="space-y-6">
            <GoogleSheetView
              logs={logs}
              selectedDateStr={selectedDateStr}
              onSelectDate={(d) => {
                setSelectedDateStr(d);
                setActiveTab('tracker');
              }}
              onDeleteRow={handleDeleteRow}
              webAppUrl={webAppUrl}
              autoSync={autoSync}
              onOpenGasModal={() => setIsGasModalOpen(true)}
              onRefreshFromSheet={refreshLogsFromGoogleSheet}
              isFetching={isFetchingFromSheet}
              lastSyncedTime={lastSyncedTime}
            />
          </div>
        )}

        {activeTab === 'both' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4">
                <WorkoutCalendar
                  currentDate={calendarMonthDate}
                  selectedDateStr={selectedDateStr}
                  onSelectDate={(d) => setSelectedDateStr(d)}
                  onChangeMonth={handleChangeMonth}
                  onGoToToday={handleGoToToday}
                  logs={logs}
                />
              </div>
              <div className="lg:col-span-4">
                <WorkoutRoutineList
                  dateStr={selectedDateStr}
                  dayOfWeek={currentEntry.dayOfWeek}
                  workoutPart={currentEntry.workoutPart}
                  onChangeWorkoutPart={handleChangeWorkoutPart}
                  exercises={currentEntry.exercises}
                  onToggleExercise={handleToggleExercise}
                  onUpdateExerciseName={handleUpdateExerciseName}
                  onUpdateExerciseWeight={handleUpdateExerciseWeight}
                  onUpdateExerciseDetails={handleUpdateExerciseDetails}
                  onDeleteExercise={handleDeleteExercise}
                  onAddExercise={handleAddExercise}
                  onResetTemplate={handleResetTemplate}
                />
              </div>
              <div className="lg:col-span-4">
                <HealthMetricsPanel
                  dateStr={selectedDateStr}
                  waistCondition={currentEntry.waistCondition}
                  onChangeWaistCondition={handleChangeWaistCondition}
                  heartRate={currentEntry.heartRate}
                  onChangeHeartRate={handleChangeHeartRate}
                  calories={currentEntry.calories}
                  onChangeCalories={handleChangeCalories}
                  exercises={currentEntry.exercises}
                  weightMemo={currentEntry.weightMemo}
                  onChangeWeightMemo={handleChangeWeightMemo}
                  waterCups={currentEntry.waterCups}
                  onChangeWaterCups={handleChangeWaterCups}
                  fastingSuccess={currentEntry.fastingSuccess}
                  onChangeFastingSuccess={handleChangeFastingSuccess}
                  completionRate={currentEntry.completionRate}
                  onSaveToSheet={handleSaveToSheet}
                  isSavedToday={!!currentEntry.savedAt}
                  webAppUrl={webAppUrl}
                  autoSync={autoSync}
                  onOpenGasModal={() => setIsGasModalOpen(true)}
                />
              </div>
            </div>

            <GoogleSheetView
              logs={logs}
              selectedDateStr={selectedDateStr}
              onSelectDate={(d) => setSelectedDateStr(d)}
              onDeleteRow={handleDeleteRow}
              webAppUrl={webAppUrl}
              autoSync={autoSync}
              onOpenGasModal={() => setIsGasModalOpen(true)}
              onRefreshFromSheet={refreshLogsFromGoogleSheet}
              isFetching={isFetchingFromSheet}
              lastSyncedTime={lastSyncedTime}
            />
          </div>
        )}
      </main>

      {/* Google Apps Script Integration Modal */}
      <GoogleAppsScriptModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
        webAppUrl={webAppUrl}
        onUpdateWebAppUrl={(url) => setWebAppUrl(url)}
        autoSync={autoSync}
        onToggleAutoSync={(enabled) => setAutoSync(enabled)}
        currentEntry={currentEntry}
        allLogs={logs}
        onShowToast={showToast}
        onRefreshFromSheet={refreshLogsFromGoogleSheet}
        isFetching={isFetchingFromSheet}
        lastSyncedTime={lastSyncedTime}
      />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav aria-label="모바일 하단 내비게이션" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-lg">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tracker');
              setMobileSubTab('routine');
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'tracker' && mobileSubTab === 'routine'
                ? 'text-blue-600 bg-blue-50/80 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Dumbbell className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">운동루틴</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('tracker');
              setMobileSubTab('health');
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'tracker' && mobileSubTab === 'health'
                ? 'text-emerald-700 bg-emerald-50/80 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">건강지표</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('tracker');
              setMobileSubTab('calendar');
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'tracker' && mobileSubTab === 'calendar'
                ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">캘린더</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'sheet'
                ? 'text-emerald-700 bg-emerald-50/80 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">구글시트</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          나만의 운동 기록부 · 월~금 100분 루틴 · 토(탁구 2.5h) · 일(휴식) · 허리 건강 관리
        </div>
      </footer>
    </div>
  );
}
