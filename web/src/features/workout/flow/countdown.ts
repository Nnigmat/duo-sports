/**
 * Обратный отсчёт на временных метках, без счётчика тиков: в фоне и при лагах вкладки время не уплывает.
 * `now` везде передаётся снаружи (Date.now()), поэтому функции чистые.
 */
export interface Countdown {
  /** Общее время для доли на кольце; растёт при «+15 с» */
  totalSec: number;
  /** Остаток в миллисекундах на момент startedAt (или сейчас, если на паузе) */
  baseMs: number;
  /** Когда отсчёт пошёл; null — на паузе */
  startedAt: number | null;
}

export function startCountdown(totalSec: number, now: number, autoStart = true): Countdown {
  return { totalSec, baseMs: totalSec * 1000, startedAt: autoStart ? now : null };
}

function remainingMs(c: Countdown, now: number): number {
  const elapsed = c.startedAt === null ? 0 : now - c.startedAt;
  return Math.max(0, c.baseMs - elapsed);
}

/** Осталось секунд, округляя вверх: «00:01» держится до самого конца. */
export function remainingSec(c: Countdown, now: number): number {
  return Math.ceil(remainingMs(c, now) / 1000);
}

export const isPaused = (c: Countdown): boolean => c.startedAt === null;

export const isFinished = (c: Countdown, now: number): boolean =>
  c.startedAt !== null && remainingMs(c, now) === 0;

export function pause(c: Countdown, now: number): Countdown {
  if (isPaused(c)) return c;
  return { ...c, baseMs: remainingMs(c, now), startedAt: null };
}

export function resume(c: Countdown, now: number): Countdown {
  if (!isPaused(c)) return c;
  return { ...c, startedAt: now };
}

/** «+15 с»: добавляет время, сохраняя режим (идёт или на паузе). */
export function addTime(c: Countdown, sec: number, now: number): Countdown {
  const baseMs = remainingMs(c, now) + sec * 1000;
  return {
    totalSec: Math.max(c.totalSec, Math.ceil(baseMs / 1000)),
    baseMs,
    startedAt: c.startedAt === null ? null : now,
  };
}
