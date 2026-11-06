/**
 * Расписание упражнения на время: отсчёт 5 с, работа, финиш.
 * Время считается целыми секундами с нажатия «Старт», только пока таймер идёт: пауза его замораживает,
 * поэтому сигналы на паузе не звучат. Звук и часы снаружи, здесь только «что в эту секунду».
 */
export const LEAD_SEC = 5;
export const FINAL_SEC = 5;

export type Signal = 'short' | 'long';

export type TimedView = {
  phase: 'lead' | 'work' | 'done';
  /** Что показать в кольце, секунд */
  seconds: number;
  /** Сколько секунд кольцо считает в этой фазе (доля дуги) */
  total: number;
  /** Оранжевое кольцо: отсчёт и последние секунды */
  alert: boolean;
  caption: string;
};

/** Сигнал, который звучит ровно в секунду `elapsed`, или null. */
export function signalAt(workSec: number, elapsed: number): Signal | null {
  const end = LEAD_SEC + workSec;
  if (elapsed < LEAD_SEC) return 'short';
  if (elapsed === LEAD_SEC || elapsed === end) return 'long';
  if (elapsed < end && end - elapsed <= FINAL_SEC) return 'short';
  return null;
}

export function timedView(workSec: number, elapsed: number): TimedView {
  const end = LEAD_SEC + workSec;
  if (elapsed < LEAD_SEC) {
    return { phase: 'lead', seconds: LEAD_SEC - elapsed, total: LEAD_SEC, alert: true, caption: 'старт через' };
  }
  if (elapsed >= end) return { phase: 'done', seconds: 0, total: workSec, alert: false, caption: 'время вышло' };
  const seconds = end - elapsed;
  const alert = seconds <= FINAL_SEC;
  return { phase: 'work', seconds, total: workSec, alert, caption: alert ? 'финиш через' : 'осталось' };
}
