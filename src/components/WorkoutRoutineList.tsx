import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertTriangle,
  RotateCcw,
  Dumbbell,
} from 'lucide-react';
import { ExerciseItem } from '../types';

interface WorkoutRoutineListProps {
  dateStr: string;
  dayOfWeek: string;
  workoutPart: string;
  onChangeWorkoutPart: (part: string) => void;
  exercises: ExerciseItem[];
  onToggleExercise: (id: string) => void;
  onUpdateExerciseName: (id: string, newName: string) => void;
  onUpdateExerciseWeight: (id: string, weight: string) => void;
  onUpdateExerciseDetails: (id: string, desc: string, tip: string) => void;
  onDeleteExercise: (id: string) => void;
  onAddExercise: (name: string, desc?: string, tip?: string, weight?: string) => void;
  onResetTemplate: () => void;
}

export const WorkoutRoutineList: React.FC<WorkoutRoutineListProps> = ({
  dateStr,
  dayOfWeek,
  workoutPart,
  onChangeWorkoutPart,
  exercises,
  onToggleExercise,
  onUpdateExerciseName,
  onUpdateExerciseWeight,
  onUpdateExerciseDetails,
  onDeleteExercise,
  onAddExercise,
  onResetTemplate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New exercise modal/input state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTip, setNewTip] = useState('');
  const [newWeight, setNewWeight] = useState('');

  // Editing workout part header
  const [isEditingPart, setIsEditingPart] = useState(false);
  const [partInput, setPartInput] = useState(workoutPart);

  const completedCount = exercises.filter((e) => e.completed).length;
  const totalCount = exercises.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingText(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) {
      onUpdateExerciseName(id, editingText.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddExercise(newName.trim(), newDesc.trim(), newTip.trim(), newWeight.trim());
    setNewName('');
    setNewDesc('');
    setNewTip('');
    setNewWeight('');
    setIsAddingNew(false);
  };

  const handleSavePart = () => {
    if (partInput.trim()) {
      onChangeWorkoutPart(partInput.trim());
    }
    setIsEditingPart(false);
  };

  // Helper to adjust numeric weight by offset (e.g. +5kg, -5kg)
  const handleQuickWeightAdjust = (id: string, currentWeight: string | undefined, delta: number) => {
    const numMatch = (currentWeight || '').match(/\d+/);
    if (numMatch) {
      const currentNum = parseInt(numMatch[0], 10);
      const newNum = Math.max(0, currentNum + delta);
      const suffix = (currentWeight || '').replace(/\d+/, '') || 'kg';
      onUpdateExerciseWeight(id, `${newNum}${suffix.trim() ? suffix : 'kg'}`);
    } else {
      const initial = Math.max(0, 20 + delta);
      onUpdateExerciseWeight(id, `${initial}kg`);
    }
  };

  return (
    <div id="workout-routine-card" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header with Title and Progress */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-lg bg-blue-600 text-white">
              {dayOfWeek}요일
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-700">{dateStr}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onResetTemplate}
              title="이 요일의 기본 루틴 템플릿으로 초기화"
              className="px-2 py-1 text-[11px] sm:text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>초기화</span>
            </button>
          </div>
        </div>

        {/* Workout Part Editable Bar */}
        <div className="mb-2.5 sm:mb-4">
          {isEditingPart ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={partInput}
                onChange={(e) => setPartInput(e.target.value)}
                className="w-full text-sm sm:text-base font-bold text-slate-900 bg-white border border-blue-400 rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 가슴 / 코어 / 유산소"
                autoFocus
              />
              <button
                onClick={handleSavePart}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h3
                onClick={() => {
                  setPartInput(workoutPart);
                  setIsEditingPart(true);
                }}
                className="text-base sm:text-lg font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1.5 sm:gap-2"
                title="클릭하여 운동 부위 명칭 수정"
              >
                <span>{workoutPart || '운동 부위 미지정'}</span>
                <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </h3>
            </div>
          )}
        </div>

        {/* Live Progress Bar */}
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 text-[11px] sm:text-xs">
              완료 현황: <strong className="text-blue-600 font-bold">{completedCount}</strong> / {totalCount}개
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                percentage === 100
                  ? 'bg-emerald-100 text-emerald-700'
                  : percentage >= 50
                  ? 'bg-amber-100 text-amber-700'
                  : percentage > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {percentage}% 달성
            </span>
          </div>

          <div className="w-full h-2 sm:h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                percentage === 100
                  ? 'bg-emerald-500'
                  : percentage >= 50
                  ? 'bg-amber-400'
                  : percentage > 0
                  ? 'bg-rose-500'
                  : 'bg-transparent'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Routine Items List */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
        {exercises.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            등록된 운동 항목이 없습니다. 아래 버튼으로 추가하거나 기본 루틴을 불러오세요.
          </div>
        ) : (
          exercises.map((item, index) => {
            const isEditing = editingId === item.id;
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                id={`exercise-item-${item.id}`}
                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                  item.completed
                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                    : 'bg-white border-slate-200/90 hover:border-blue-200 shadow-2xs'
                }`}
              >
                <div className="p-3 sm:p-3.5 space-y-2.5">
                  {/* Row 1: Checkbox + Exercise Title + Delete Button */}
                  <div className="flex items-start gap-3">
                    {/* Custom Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleExercise(item.id)}
                      aria-label={item.completed ? '완료 취소' : '운동 완료'}
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                        item.completed
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'border-2 border-slate-300 hover:border-blue-500 bg-white'
                      }`}
                    >
                      {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    {/* Exercise Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id)}
                              onKeyDown={(e) => handleKeyDown(e, item.id)}
                              autoFocus
                              className="w-full px-2.5 py-1 text-sm font-semibold text-slate-900 border border-blue-500 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                            <button
                              type="button"
                              onMouseDown={() => handleSaveEdit(item.id)}
                              className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
                            >
                              확인
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(item.id, item.name)}
                            className="flex-1 cursor-pointer group/title flex items-center gap-1.5"
                            title="텍스트를 터치/클릭하여 이름 수정"
                          >
                            <span className="text-xs font-bold text-slate-400 w-5">{index + 1}.</span>
                            <span
                              className={`text-sm font-semibold transition-colors ${
                                item.completed
                                  ? 'line-through text-slate-400 font-normal'
                                  : 'text-slate-800 hover:text-blue-600'
                              }`}
                            >
                              {item.name}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                          </div>
                        )}

                        {/* Delete [X] Button as specified */}
                        <button
                          type="button"
                          onClick={() => onDeleteExercise(item.id)}
                          title="이 운동 항목 삭제"
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                          aria-label="항목 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Per-Exercise Weight Input & Quick Adjusters */}
                  <div className="pl-9 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                        <Dumbbell className="w-3.5 h-3.5 text-blue-600" />
                        중량:
                      </span>
                      <input
                        type="text"
                        value={item.weight || ''}
                        onChange={(e) => onUpdateExerciseWeight(item.id, e.target.value)}
                        placeholder="예: 35kg"
                        className={`w-28 px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          item.weight
                            ? 'bg-blue-50/80 text-blue-800 border-blue-200 font-extrabold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 focus:bg-white'
                        }`}
                      />
                    </div>

                    {/* Quick Weight Adjuster Steppers */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleQuickWeightAdjust(item.id, item.weight, -5)}
                        className="px-1.5 py-0.5 font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                        title="-5kg 감소"
                      >
                        -5kg
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickWeightAdjust(item.id, item.weight, 5)}
                        className="px-1.5 py-0.5 font-bold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                        title="+5kg 증가"
                      >
                        +5kg
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateExerciseWeight(item.id, '맨몸')}
                        className="px-1.5 py-0.5 font-medium rounded bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200"
                      >
                        맨몸
                      </button>
                    </div>
                  </div>

                  {/* Row 3: Toggle button for details & waist tips */}
                  {(item.desc || item.tip) && (
                    <div className="pl-9">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 border border-amber-200/60 w-full"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>💡 운동 설명 및 허리 안전 팁</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 ml-auto text-amber-600" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-auto text-amber-600" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Details / Accordion */}
                {isExpanded && (item.desc || item.tip) && (
                  <div className="px-4 pb-3.5 pt-1 border-t border-amber-100 bg-amber-50/40 text-xs space-y-2">
                    {item.desc && (
                      <div>
                        <span className="font-semibold text-slate-700">📖 운동 방법: </span>
                        <span className="text-slate-600">{item.desc}</span>
                      </div>
                    )}
                    {item.tip && (
                      <div className="flex items-start gap-1.5 bg-white/80 p-2 rounded-lg border border-amber-200/80 text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-bold text-amber-800">허리 안전 팁: </span>
                          <span>{item.tip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Add New Exercise Inline Form or Trigger Button */}
        {isAddingNew ? (
          <form onSubmit={handleAddNewSubmit} className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2.5">
            <h4 className="text-xs font-bold text-blue-900">새로운 운동 항목 추가하기</h4>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="운동 이름 (예: 덤벨 숄더 프레스 3세트 x 15회)"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="중량 (선택: 예: 30kg, 맨몸)"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="운동 설명 (선택: 머신 세팅 및 타격 부위)"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newTip}
              onChange={(e) => setNewTip(e.target.value)}
              placeholder="허리 안전 팁 (선택: ⚠️ 복압 유지, 과도한 꺾임 주의)"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-xs"
              >
                추가 완료
              </button>
            </div>
          </form>
        ) : (
          <button
            id="btn-add-exercise"
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="w-full py-2.5 px-3 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ 새로운 운동 항목 추가하기</span>
          </button>
        )}
      </div>
    </div>
  );
};
