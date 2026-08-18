import { WorkoutLogEntry, ExerciseItem } from '../types';
import { defaultTemplates, DAY_NAMES } from '../data/defaultTemplates';

const STORAGE_KEY = 'my_workout_log_entries_v1';

export function getStoredLogs(): Record<string, WorkoutLogEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = generateInitialSeedData();
      saveStoredLogs(seeded);
      return seeded;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load workout logs from storage:', err);
    return {};
  }
}

export function saveStoredLogs(logs: Record<string, WorkoutLogEntry>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save workout logs to storage:', err);
  }
}

export function createInitialEntryForDate(dateStr: string): WorkoutLogEntry {
  const date = new Date(dateStr + 'T00:00:00');
  const dayIndex = date.getDay();
  const dayName = DAY_NAMES[dayIndex];
  const template = defaultTemplates[dayIndex] || defaultTemplates[1];

  const exercises: ExerciseItem[] = template.items.map((item, idx) => ({
    id: `${dateStr}-ex-${idx}-${Date.now()}`,
    name: item.name,
    desc: item.desc,
    tip: item.tip,
    completed: false,
    weight: item.weight || '',
  }));

  return {
    date: dateStr,
    dayOfWeek: dayName,
    dayIndex,
    workoutPart: template.workoutPart,
    exercises,
    completionRate: 0,
    waistCondition: null,
    heartRate: '',
    calories: '',
    weightMemo: '',
    waterCups: 0,
    fastingSuccess: false,
  };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Generate realistic seeded records for recent days so the user immediately sees a working, populated calendar & spreadsheet
function generateInitialSeedData(): Record<string, WorkoutLogEntry> {
  const logs: Record<string, WorkoutLogEntry> = {};
  const today = new Date();

  // Seed last 10 days
  for (let i = 10; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const dayIndex = d.getDay();
    const dayName = DAY_NAMES[dayIndex];
    const template = defaultTemplates[dayIndex];

    const exercises: ExerciseItem[] = template.items.map((item, idx) => ({
      id: `${dateStr}-seed-${idx}`,
      name: item.name,
      desc: item.desc,
      tip: item.tip,
      weight: item.weight || '',
      completed: i % 3 === 0 ? idx < template.items.length - 1 : true,
    }));

    const completedCount = exercises.filter((e) => e.completed).length;
    const rate = Math.round((completedCount / exercises.length) * 100);

    const waistOptions: ('good' | 'normal' | 'caution')[] = ['good', 'good', 'normal', 'good', 'normal'];
    const waist = waistOptions[i % waistOptions.length];

    logs[dateStr] = {
      date: dateStr,
      dayOfWeek: dayName,
      dayIndex,
      workoutPart: template.workoutPart.replace(' (100분 루틴)', ''),
      exercises,
      completionRate: rate,
      waistCondition: waist,
      heartRate: dayIndex === 0 ? 95 : 125 + (i * 3) % 25,
      calories: dayIndex === 0 ? 120 : 450 + (i * 20) % 180,
      weightMemo: dayIndex === 1 ? '체스트 35kg 15회, 인클라인 30kg' : dayIndex === 3 ? '랫풀다운 40kg, 케이블로우 35kg' : dayIndex === 5 ? '레그프레스 90kg 성공!' : '컨디션 양호',
      waterCups: Math.min(4, Math.max(2, (i % 4) + 1)),
      fastingSuccess: i % 2 === 0,
      savedAt: new Date(d.getTime() + 18 * 3600 * 1000).toISOString(),
    };
  }

  return logs;
}

export function formatWaistConditionText(cond: WorkoutLogEntry['waistCondition']): string {
  if (cond === 'good') return '🟢 좋음';
  if (cond === 'normal') return '🟡 보통';
  if (cond === 'caution') return '🔴 주의';
  return '-';
}

// Convert log entries into TSV (tab-separated values) suitable for direct clipboard paste into Google Sheets
export function generateGoogleSheetsTSV(logs: WorkoutLogEntry[]): string {
  const header = ['날짜', '요일', '운동 부위', '달성율(%)', '허리상태', '심박수', '칼로리', '중량메모', '물(컵)', '단식성공'];
  const rows = logs.map((log) => [
    log.date,
    log.dayOfWeek,
    log.workoutPart,
    `${log.completionRate}%`,
    formatWaistConditionText(log.waistCondition),
    log.heartRate ? `${log.heartRate}` : '',
    log.calories ? `${log.calories}` : '',
    log.weightMemo ? `"${log.weightMemo.replace(/"/g, '""')}"` : '',
    `${log.waterCups}잔 (${log.waterCups * 500}ml)`,
    log.fastingSuccess ? 'O' : 'X',
  ]);

  return [header.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
}

// Generate CSV string for export
export function generateCSV(logs: WorkoutLogEntry[]): string {
  const header = ['날짜', '요일', '운동 부위', '달성율(%)', '허리상태', '심박수', '칼로리', '중량메모', '물(컵)', '단식성공'];
  const rows = logs.map((log) => [
    `"${log.date}"`,
    `"${log.dayOfWeek}"`,
    `"${log.workoutPart}"`,
    `"${log.completionRate}%"`,
    `"${formatWaistConditionText(log.waistCondition)}"`,
    `"${log.heartRate || ''}"`,
    `"${log.calories || ''}"`,
    `"${(log.weightMemo || '').replace(/"/g, '""')}"`,
    `"${log.waterCups} (${log.waterCups * 500}ml)"`,
    `"${log.fastingSuccess ? 'O' : 'X'}"`,
  ]);

  return '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
