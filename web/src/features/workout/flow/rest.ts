/**
 * Отдых считает вверх на временных метках: в фоне и при лагах вкладки время не уплывает.
 * `now` передаётся снаружи (Date.now()), поэтому функции чистые. Цель живёт только в этом отдыхе и не хранится.
 */
export interface Rest {
  /** Цель в секундах; «+15» её увеличивает */
  goalSec: number;
  /** Когда отдых начался, мс */
  startedAt: number;
}

/** Предел фактического отдыха, секунд (сутки): столько принимает сервер; забытый на ночь экран не ломает сохранение итога */
export const MAX_REST_SEC = 86_400;

export const startRest = (goalSec: number, now: number): Rest => ({ goalSec, startedAt: now });

/** Сколько секунд прошло, округляя вниз: «00:59» держится до самой цели. Растёт и после цели. */
export const restElapsedSec = (r: Rest, now: number): number => Math.min(MAX_REST_SEC, Math.max(0, Math.floor((now - r.startedAt) / 1000)));

export const isGoalReached = (r: Rest, now: number): boolean => restElapsedSec(r, now) >= r.goalSec;

/** «+15 с»: двигает цель этого отдыха, начало не трогает. */
export const addRestGoal = (r: Rest, sec: number): Rest => ({ ...r, goalSec: r.goalSec + sec });

/** Доля кольца от 0 до 1; сверх цели кольцо остаётся полным. */
export function restProgress(r: Rest, now: number): number {
  if (r.goalSec <= 0) return 1;
  return Math.min(1, Math.max(0, (now - r.startedAt) / (r.goalSec * 1000)));
}
