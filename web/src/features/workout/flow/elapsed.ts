const pad = (n: number) => String(n).padStart(2, '0');

/** Сколько целых секунд прошло от метки старта (мс); не меньше нуля, даже если часы ушли назад. */
export function elapsedSec(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** Общее время тренировки в секундах: идёт до финиша, после него замирает на `finishedAt`. */
export function totalSec(startedAt: number, finishedAt: number | null | undefined, now: number): number {
  return elapsedSec(startedAt, finishedAt ?? now);
}

/** Общее время тренировки: мм:сс до часа, ч:мм:сс от часа */
export function formatElapsed(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
