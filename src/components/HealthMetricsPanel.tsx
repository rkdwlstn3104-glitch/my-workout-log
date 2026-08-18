import React from 'react';
import {
  Heart,
  Flame,
  Droplets,
  Save,
  Watch,
  CheckCircle2,
  UtensilsCrossed,
  ActivitySquare,
  Sparkles,
  Dumbbell,
  FileText,
} from 'lucide-react';
import { WaistCondition, ExerciseItem } from '../types';

interface HealthMetricsPanelProps {
  dateStr: string;
  waistCondition: WaistCondition;
  onChangeWaistCondition: (cond: WaistCondition) => void;
  heartRate: string | number;
  onChangeHeartRate: (val: string) => void;
  calories: string | number;
  onChangeCalories: (val: string) => void;
  exercises?: ExerciseItem[];
  weightMemo: string;
  onChangeWeightMemo: (val: string) => void;
  waterCups: number;
  onChangeWaterCups: (val: number) => void;
  fastingSuccess: boolean;
  onChangeFastingSuccess: (val: boolean) => void;
  completionRate: number;
  onSaveToSheet: () => void;
  isSavedToday: boolean;
  webAppUrl?: string;
  autoSync?: boolean;
  onOpenGasModal?: () => void;
}

export const HealthMetricsPanel: React.FC<HealthMetricsPanelProps> = ({
  dateStr,
  waistCondition,
  onChangeWaistCondition,
  heartRate,
  onChangeHeartRate,
  calories,
  onChangeCalories,
  exercises = [],
  weightMemo,
  onChangeWeightMemo,
  waterCups,
  onChangeWaterCups,
  fastingSuccess,
  onChangeFastingSuccess,
  completionRate,
  onSaveToSheet,
  isSavedToday,
  webAppUrl = '',
  autoSync = true,
  onOpenGasModal,
}) => {
  // Handle water drop toggle logic:
  const handleWaterClick = (index: number) => {
    if (waterCups === index) {
      onChangeWaterCups(index - 1);
    } else {
      onChangeWaterCups(index);
    }
  };

  const totalWaterMl = waterCups * 500;
  const weightedExercises = exercises.filter((e) => e.weight && e.weight.trim() !== '');

  return (
    <div id="health-metrics-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/40 via-emerald-50/30 to-indigo-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ActivitySquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">건강 & 컨디션 기록</h3>
              <p className="text-xs text-slate-500">허리 신호등, 수분, 스마트워치 데이터를 기록하세요</p>
            </div>
          </div>
          {isSavedToday && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              시트 저장완료
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5 flex-1 overflow-y-auto">
        {/* 1. Waist Condition Traffic Light (운동 전 신호등) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>🚦 1. 운동 전 허리 컨디션 신호등</span>
              <span className="text-[11px] font-normal text-slate-500">(터치하여 선택)</span>
            </label>
            {waistCondition && (
              <span className="text-xs font-bold text-slate-700">
                {waistCondition === 'good' && '🟢 좋음 (정상 중량 가능)'}
                {waistCondition === 'normal' && '🟡 보통 (중량 70% 조절)'}
                {waistCondition === 'caution' && '🔴 주의 (무리한 꺾임 금지)'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="btn-waist-good"
              onClick={() => onChangeWaistCondition(waistCondition === 'good' ? null : 'good')}
              className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                waistCondition === 'good'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-[1.02]'
                  : 'bg-emerald-50/60 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/70'
              }`}
            >
              <span className="text-xl">🟢</span>
              <span className="text-xs font-bold">좋음</span>
              <span className={`text-[10px] ${waistCondition === 'good' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                통증 없음
              </span>
            </button>

            <button
              type="button"
              id="btn-waist-normal"
              onClick={() => onChangeWaistCondition(waistCondition === 'normal' ? null : 'normal')}
              className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                waistCondition === 'normal'
                  ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-[1.02]'
                  : 'bg-amber-50/60 text-amber-800 border-amber-200/80 hover:bg-amber-100/70'
              }`}
            >
              <span className="text-xl">🟡</span>
              <span className="text-xs font-bold">보통</span>
              <span className={`text-[10px] ${waistCondition === 'normal' ? 'text-amber-900' : 'text-amber-600'}`}>
                약간 뻐근함
              </span>
            </button>

            <button
              type="button"
              id="btn-waist-caution"
              onClick={() => onChangeWaistCondition(waistCondition === 'caution' ? null : 'caution')}
              className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                waistCondition === 'caution'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md scale-[1.02]'
                  : 'bg-rose-50/60 text-rose-800 border-rose-200/80 hover:bg-rose-100/70'
              }`}
            >
              <span className="text-xl">🔴</span>
              <span className="text-xs font-bold">주의</span>
              <span className={`text-[10px] ${waistCondition === 'caution' ? 'text-rose-100' : 'text-rose-600'}`}>
                통증/무리금지
              </span>
            </button>
          </div>
        </div>

        {/* 2. Water Intake (물방울 💧 4개, 각 500ml = 총 2L) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-cyan-600" />
              <span>2. 수분 섭취 (물방울 터치당 500ml)</span>
            </label>
            <span className="text-xs font-extrabold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
              {waterCups}잔 ({totalWaterMl}ml / 2,000ml)
              {waterCups === 4 && ' 🎉 2L 달성!'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((idx) => {
              const isActive = waterCups >= idx;
              return (
                <button
                  key={idx}
                  type="button"
                  id={`btn-water-${idx}`}
                  onClick={() => handleWaterClick(idx)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    isActive
                      ? 'bg-gradient-to-b from-cyan-400 to-blue-500 text-white border-blue-500 shadow-sm scale-[1.02]'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-cyan-50 hover:text-cyan-600'
                  }`}
                  title={`${idx * 500}ml 섭취 기록`}
                >
                  <span className={`text-2xl transition-transform ${isActive ? 'scale-110' : 'opacity-40 grayscale'}`}>
                    💧
                  </span>
                  <span className="text-[11px] font-bold">
                    {idx * 500}ml
                  </span>
                  <span className={`text-[9px] ${isActive ? 'text-cyan-100' : 'text-slate-400'}`}>
                    {idx}컵째
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            * 4개를 모두 터치하면 하루 권장 2L가 달성됩니다. 다시 누르면 취소됩니다.
          </p>
        </div>

        {/* 3. Smart Watch Metrics (Galaxy Watch 9 - Heart rate & Calories) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Watch className="w-4 h-4 text-indigo-600" />
              <span>3. 스마트워치 측정값 (갤럭시 워치9 연동)</span>
            </label>
            <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
              유산소 직후 입력
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Heart Rate */}
            <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  심박수
                </span>
                <span className="text-[10px] text-rose-500 font-normal">bpm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  id="input-heart-rate"
                  value={heartRate}
                  onChange={(e) => onChangeHeartRate(e.target.value)}
                  placeholder="예: 135"
                  className="w-full text-base font-bold text-slate-900 bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">bpm</span>
              </div>
            </div>

            {/* Calories */}
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  소모 칼로리
                </span>
                <span className="text-[10px] text-amber-500 font-normal">kcal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  id="input-calories"
                  value={calories}
                  onChange={(e) => onChangeCalories(e.target.value)}
                  placeholder="예: 520"
                  className="w-full text-base font-bold text-slate-900 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">kcal</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Per-Exercise Weight Summary & Intermittent Fasting */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-blue-600" />
                <span>4. 각 종목별 중량 요약 현황</span>
              </label>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                자동 요약 반영됨
              </span>
            </div>

            {/* Live weight badges for recorded exercises */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 min-h-[56px] space-y-2">
              {weightedExercises.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {weightedExercises.map((ex) => (
                    <span
                      key={ex.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        ex.completed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      <span className="font-semibold">{ex.name.split('(')[0].replace(/\[.*?\]/g, '').trim()}:</span>
                      <strong className="font-extrabold">{ex.weight}</strong>
                      {ex.completed && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  💡 좌측 운동 목록에서 각 웨이트 운동별 중량을 입력하면 여기에 모여 시트 H열(중량메모)에 기록됩니다.
                </p>
              )}

              {/* Optional extra note */}
              <div className="pt-1 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  id="input-weight-memo"
                  value={weightMemo}
                  onChange={(e) => onChangeWeightMemo(e.target.value)}
                  placeholder="추가 특이사항 / 컨디션 메모 (선택)"
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Intermittent Fasting Toggle */}
          <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">간헐적 단식 (12:12)</span>
                <span className="text-[10px] text-slate-500">공복 12시간 유지 여부</span>
              </div>
            </div>

            <button
              type="button"
              id="btn-fasting-toggle"
              onClick={() => onChangeFastingSuccess(!fastingSuccess)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                fastingSuccess
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{fastingSuccess ? '⭕ 단식 성공' : '❌ 미실시/실패'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Sheet Record Action Button (시트 자동 기록) as specified in Screenshot 3: [💾 오늘 성과 시트에 기록하기] */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2">
        <button
          type="button"
          id="btn-save-to-sheet"
          onClick={onSaveToSheet}
          className="w-full py-3.5 px-4 bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
        >
          <Save className="w-4 h-4" />
          <span>💾 {dateStr} 성과 시트에 기록하기</span>
          {completionRate === 100 && <Sparkles className="w-4 h-4 text-amber-300" />}
        </button>

        <div className="flex items-center justify-between text-[11px] pt-1">
          {webAppUrl ? (
            <button
              type="button"
              onClick={onOpenGasModal}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>구글 시트 실시간 자동 동기화 ON</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenGasModal}
              className="text-slate-500 hover:text-emerald-600 font-medium flex items-center gap-1 transition-colors underline"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>구글 시트 자동 저장(Apps Script) 연동하기</span>
            </button>
          )}

          <span className="text-slate-400">10개 항목 자동 집계</span>
        </div>
      </div>
    </div>
  );
};
