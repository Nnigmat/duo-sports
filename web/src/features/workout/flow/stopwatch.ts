import type { SetPlan } from '../../../../../shared/types';
import type { Step } from './buildSteps';
import { formatTime } from './format';

/** Время на максимум: упражнение на время с целью 0–0, как «макс.» у повторов. Секундомер вместо отсчёта. */
export const isOpenTime = (plan: SetPlan): boolean => plan.target.min === 0 && plan.target.max === 0;

/** Секундомер ведёт только упражнение подходов или круга; в разминке и заминке время 0–0 идёт старым таймером без окна результата */
export const usesStopwatch = (step: Step): boolean => step.kind === 'time' && step.mode !== 'timed' && isOpenTime(step.plan);

/** Предел секундомера, секунд (сутки): столько принимает окно результата */
export const MAX_STOPWATCH_SEC = 86_400;

/**
 * Секундомер на временных метках, без счётчика тиков: в фоне и при лагах вкладки время не уплывает.
 * `now` передаётся снаружи (Date.now()), поэтому функции чистые.
 */
export interface Stopwatch {
  /** Сколько набралось до последнего запуска, мс */
  baseMs: number;
  /** Когда секундомер пошёл; null — на паузе */
  startedAt: number | null;
}

export const startStopwatch = (now: number): Stopwatch => ({ baseMs: 0, startedAt: now });

const elapsedMs = (w: Stopwatch, now: number): number => w.baseMs + (w.startedAt === null ? 0 : Math.max(0, now - w.startedAt));

/** Сколько секунд прошло, округляя вниз */
export const stopwatchElapsedSec = (w: Stopwatch, now: number): number => Math.min(MAX_STOPWATCH_SEC, Math.floor(elapsedMs(w, now) / 1000));

export const isStopwatchPaused = (w: Stopwatch): boolean => w.startedAt === null;

export function pauseStopwatch(w: Stopwatch, now: number): Stopwatch {
  return isStopwatchPaused(w) ? w : { baseMs: elapsedMs(w, now), startedAt: null };
}

export function resumeStopwatch(w: Stopwatch, now: number): Stopwatch {
  return isStopwatchPaused(w) ? { ...w, startedAt: now } : w;
}

/** Что показать на кольце: мм:сс, как везде («01:15»); минуты растут («61:40») */
export function stopwatchView(elapsedSec: number): { label: string } {
  const sec = Math.max(0, Math.floor(elapsedSec));
  return { label: formatTime(sec) };
}
