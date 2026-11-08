import type { Signal } from './signals';

/** Длинный сигнал перед записью: запись стартует после него, чтобы писк не попал в видео */
export const LONG_BEEP_MS = 500;
/** Запас: сигнал берётся опросом раз в 100 мс и может начаться чуть позже секунды */
export const POLL_MARGIN_MS = 150;

export type RecordStartView = {
  /** Число на экране: сколько секунд до длинного сигнала */
  left: number;
  /** Пора включать запись */
  record: boolean;
};

/** Отсчёт перед записью: `leadSec` секунд, длинный сигнал, затем запись. `elapsedMs` — с нажатия «Начать запись». */
export function recordStartView(leadSec: number, elapsedMs: number): RecordStartView {
  const second = Math.floor(elapsedMs / 1000);
  return {
    left: Math.max(0, leadSec - second),
    record: leadSec <= 0 || elapsedMs >= leadSec * 1000 + LONG_BEEP_MS + POLL_MARGIN_MS,
  };
}

/** Сигнал, который звучит ровно в секунду `second` отсчёта, или null. */
export function startSignalAt(leadSec: number, second: number): Signal | null {
  if (leadSec <= 0) return null;
  if (second < leadSec) return 'short';
  return second === leadSec ? 'long' : null;
}
