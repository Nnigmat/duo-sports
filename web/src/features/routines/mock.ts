import type { RoutineDetail, RoutineSummary } from '../../../../shared/types';

export const routineSummaries: RoutineSummary[] = [
  { id: 'legs-light', kind: 'warmup', title: 'Ноги, лёгкая', itemCount: 5, totalSec: 270, usedIn: 3 },
  { id: 'cardio', kind: 'warmup', title: 'Кардио-разогрев', itemCount: 4, totalSec: 240, usedIn: 0 },
  { id: 'legs-glutes', kind: 'cooldown', title: 'Ноги и ягодицы', itemCount: 6, totalSec: 360, usedIn: 1 },
];

export const routineDetail: RoutineDetail = {
  id: 'legs-light',
  kind: 'warmup',
  title: 'Ноги, лёгкая',
  note: 'Повторяйте за персонажем',
  totalSec: 270,
  items: [
    { exercise: 'jumping-jacks', name: 'Прыжки «звёздочка»', sec: { min: 30, max: 45 } },
    { exercise: 'lunge-stretch', name: 'Выпад с растяжкой', sec: { min: 30, max: 30 }, sides: ['Левая нога', 'Правая нога'] },
  ],
  usedIn: 3,
  usedBy: [{ workoutId: 1, title: 'Ноги и ягодицы' }],
};

export const pickerExercises = [
  { id: 'jumping-jacks', name: 'Прыжки «звёздочка»', kind: 'time' as const },
  { id: 'plank', name: 'Планка', kind: 'time' as const },
  { id: 'squat', name: 'Приседания со штангой', kind: 'weight' as const },
];
