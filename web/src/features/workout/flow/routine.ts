import type { Step } from './buildSteps';
import { LEAD_SEC, type Signal, type TimedView } from './signals';

/**
 * Расписание шага разминки или заминки: отсчёт перед первым шагом набора, дальше короткие сигналы
 * на 3, 2, 1 до конца и длинный в момент смены. Секунды целые, с нажатия «Старт», как в signals.ts.
 */
export const ROUTINE_FINAL_SEC = 3;

/** Отсчёт перед стартом: только у первого шага набора, дальше упражнения идут подряд */
export function routineLeadSec(step: Step): number {
  return step.indexInBlock === 1 ? LEAD_SEC : 0;
}

/** Сигнал, который звучит ровно в секунду `elapsed`, или null. */
export function routineSignalAt(workSec: number, elapsed: number, leadSec: number): Signal | null {
  const end = leadSec + workSec;
  if (leadSec > 0) {
    if (elapsed < leadSec) return 'short';
    if (elapsed === leadSec) return 'long';
  }
  if (elapsed === end) return 'long';
  if (elapsed >= leadSec && elapsed < end && end - elapsed <= ROUTINE_FINAL_SEC) return 'short';
  return null;
}

/** За сколько секунд до смены называть следующее упражнение */
export const ROUTINE_SPEECH_LEAD_SEC = 6;
/** Короче этого шаг не озвучивается: фраза налезла бы на сигналы смены */
export const ROUTINE_SPEECH_MIN_SEC = 8;

/**
 * Что назвать вслух на секунде `elapsed`: self — упражнение этого шага (в начале отсчёта первого шага набора),
 * next — следующее упражнение набора (за 6 с до смены, если шаг не короче 8 с). После последнего шага набора фразы нет.
 */
export function routineSpeechAt(workSec: number, elapsed: number, leadSec: number, hasNext: boolean): 'self' | 'next' | null {
  if (leadSec > 0 && elapsed === 0) return 'self';
  if (hasNext && workSec >= ROUTINE_SPEECH_MIN_SEC && elapsed === leadSec + workSec - ROUTINE_SPEECH_LEAD_SEC) return 'next';
  return null;
}

/** Что показать в кольце на секунде `elapsed`: отсчёт, работа или конец; последние 3 с подписаны «смена через». */
export function routineView(workSec: number, elapsed: number, leadSec: number): TimedView {
  const end = leadSec + workSec;
  if (elapsed < leadSec) {
    return { phase: 'lead', seconds: leadSec - elapsed, total: leadSec, alert: true, caption: 'старт через' };
  }
  if (elapsed >= end) return { phase: 'done', seconds: 0, total: workSec, alert: false, caption: 'время вышло' };
  const seconds = end - elapsed;
  const alert = seconds <= ROUTINE_FINAL_SEC;
  return { phase: 'work', seconds, total: workSec, alert, caption: alert ? 'смена через' : 'осталось' };
}
