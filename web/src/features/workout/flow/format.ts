import type { ExerciseKind, Range, SetPlan } from '../../../../../shared/types';
import type { Step } from './buildSteps';

const pad = (n: number) => String(n).padStart(2, '0');

/** Секунды → мм:сс */
export function formatTime(totalSec: number): string {
  return `${pad(Math.floor(totalSec / 60))}:${pad(totalSec % 60)}`;
}

const range = (min: number, max: number, fmt: (n: number) => string = String) =>
  min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;

const decimal = (n: number) => String(n).replace('.', ',');

/** Цель без единицы: «18–20», «00:45–01:00». Для подсказки «План: …». */
export function formatTarget(kind: ExerciseKind, target: Range): string {
  return kind === 'time' ? range(target.min, target.max, formatTime) : range(target.min, target.max);
}

/** Строка цели: «18–20 повт», «60 кг × 10», «00:45–01:00» */
export function formatPlan(kind: ExerciseKind, plan: SetPlan): string {
  const { min, max } = plan.target;
  switch (kind) {
    case 'reps':
      return `${range(min, max)} повт`;
    case 'weight':
      return `${decimal(plan.weight ?? 0)} кг × ${range(min, max)}`;
    case 'time':
      return range(min, max, formatTime);
  }
}

/** Сколько секунд отсчитывает таймер: верх диапазона. */
export function timerSeconds(plan: SetPlan): number {
  return plan.target.max;
}

/** Строка данных в облачке: «Обратные отжимания · 18–20 повт». У таймерных блоков только название: время показывает кольцо. */
export function stepLine(step: Step): string {
  return step.mode === 'timed' ? step.exerciseName : `${step.exerciseName} · ${formatPlan(step.kind, step.plan)}`;
}

/** Надстрочник облачка: «Подход 4 из 9 · снимаем на видео», «Разминка · 1 из 6» */
export function eyebrow(step: Step): string {
  if (step.mode === 'timed') return `${step.blockTitle} · ${step.indexInBlock} из ${step.blockSize}`;
  const base = `Подход ${step.indexInBlock} из ${step.blockSize}`;
  return step.record ? `${base} · снимаем на видео` : base;
}

/** Надстрочник на отдыхе: про следующий подход */
export function restEyebrow(next: Step): string {
  return `Отдых · далее подход ${next.indexInBlock} из ${next.blockSize}`;
}

/** Надстрочник экрана записи: «Круг 2 · подход 4 из 9» */
export function recordingEyebrow(step: Step): string {
  const n = `${step.indexInBlock} из ${step.blockSize}`;
  return step.mode === 'circuit' ? `Круг ${step.round} · подход ${n}` : `Подход ${n}`;
}

/** Надстрочник панели «Изменить»: «Подход 1 из 9 · круг 1» */
export function editEyebrow(step: Step): string {
  const set = `Подход ${step.indexInBlock} из ${step.blockSize}`;
  return step.mode === 'circuit' ? `${set} · круг ${step.round}` : set;
}

/** Название блока в шапке */
export function blockLabel(step: Step): string {
  switch (step.mode) {
    case 'circuit':
      return `Круг ${step.round} из ${step.rounds}`;
    case 'sets':
      return 'Подходами';
    case 'timed':
      return step.blockTitle;
  }
}
