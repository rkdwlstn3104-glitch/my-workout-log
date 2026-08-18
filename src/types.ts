export type WaistCondition = 'good' | 'normal' | 'caution' | null;

export interface ExerciseItem {
  id: string;
  name: string;
  desc: string;
  tip: string;
  completed: boolean;
  weight?: string; // e.g. '35kg', '40kg'
}

export interface DayTemplate {
  dayIndex: number; // 0 (Sun) ~ 6 (Sat)
  dayName: string; // 일, 월, 화, 수, 목, 금, 토
  workoutPart: string;
  items: (Omit<ExerciseItem, 'id' | 'completed'> & { weight?: string })[];
}

export interface WorkoutLogEntry {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // '월', '화', '수', '목', '금', '토', '일'
  dayIndex: number; // 0..6
  workoutPart: string;
  exercises: ExerciseItem[];
  completionRate: number; // 0 ~ 100
  waistCondition: WaistCondition;
  heartRate: string | number; // bpm
  calories: string | number; // kcal
  weightMemo: string;
  waterCups: number; // 0 ~ 4 (each 500ml, max 2000ml)
  fastingSuccess: boolean;
  notes?: string;
  savedAt?: string;
}
