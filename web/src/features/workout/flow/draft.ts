import type { Session } from './session';

/** Прохождение, сохранённое на устройстве: сам ход и когда тренировка началась (мс) */
export interface Draft {
  session: Session;
  startedAt: number;
  /** Когда тренировка закончилась (мс): с этого момента общее время не растёт */
  finishedAt?: number;
  /** Ключ против дубликата: один на Прохождение, уходит с каждой отправкой итога */
  submitKey?: string;
  /** Когда черновик обновлялся в последний раз (мс) */
  updatedAt: number;
}

/** Через сколько без обновлений черновик считается забытым. На обратной связи срок не действует: итог ещё не отправлен. */
export const DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

export const draftKey = (userId: number, workoutId: string, date: string) => `duo-sport:draft:${userId}:${workoutId}:${date}`;

const PHASES = ['work', 'rest', 'finish', 'feedback'];
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isRange(v: unknown): boolean {
  return isObject(v) && isNum(v.min) && isNum(v.max);
}

function isStep(v: unknown): boolean {
  if (!isObject(v)) return false;
  const plan = v.plan;
  return (
    typeof v.exerciseId === 'string' &&
    typeof v.exerciseName === 'string' &&
    typeof v.blockId === 'string' &&
    typeof v.blockTitle === 'string' &&
    typeof v.mode === 'string' &&
    typeof v.kind === 'string' &&
    typeof v.record === 'boolean' &&
    isNum(v.blockIndex) &&
    isNum(v.round) &&
    isNum(v.rounds) &&
    isNum(v.indexInBlock) &&
    isNum(v.blockSize) &&
    isNum(v.restAfterSec) &&
    isObject(plan) &&
    isRange(plan.target) &&
    (plan.weight === undefined || isNum(plan.weight)) &&
    (v.replaced === undefined || (isObject(v.replaced) && typeof v.replaced.id === 'string' && typeof v.replaced.name === 'string'))
  );
}

function isActual(v: unknown): boolean {
  return (
    isObject(v) &&
    isNum(v.value) &&
    v.value >= 0 &&
    (v.weight === undefined || (isNum(v.weight) && v.weight >= 0)) &&
    (v.extraWeight === undefined || v.extraWeight === true)
  );
}

/** Факты: у черновика, сохранённого до появления фактов, поля нет — это допустимо */
function hasValidActuals(v: Record<string, unknown>, n: number): boolean {
  return v.actuals === undefined || (Array.isArray(v.actuals) && v.actuals.length === n && v.actuals.every((a) => a === null || isActual(a)));
}

/** Самочувствие и комментарий: у черновика, сохранённого до обратной связи, полей нет — это допустимо */
function hasValidFeedback(v: Record<string, unknown>): boolean {
  return (v.feeling === undefined || v.feeling === null || (Number.isInteger(v.feeling) && (v.feeling as number) >= 1 && (v.feeling as number) <= 5)) && (v.comment === undefined || typeof v.comment === 'string');
}

type StoredSession = Omit<Session, 'actuals' | 'feeling' | 'comment'> & Partial<Pick<Session, 'actuals' | 'feeling' | 'comment'>>;

function isSession(v: unknown): v is StoredSession {
  if (!isObject(v) || !Array.isArray(v.steps) || v.steps.length === 0) return false;
  const n = v.steps.length;
  return (
    v.steps.every(isStep) &&
    isNum(v.index) &&
    Number.isInteger(v.index) &&
    v.index >= 0 &&
    v.index < n &&
    typeof v.phase === 'string' &&
    PHASES.includes(v.phase) &&
    Array.isArray(v.completed) &&
    v.completed.length === n &&
    v.completed.every((c) => typeof c === 'boolean') &&
    hasValidActuals(v, n) &&
    hasValidFeedback(v) &&
    Array.isArray(v.videoIds) &&
    v.videoIds.length === n &&
    v.videoIds.every((id) => id === null || typeof id === 'string') &&
    Array.isArray(v.restSec) &&
    v.restSec.length === n &&
    v.restSec.every((sec) => sec === null || isNum(sec)) &&
    isNum(v.videos) &&
    typeof v.timerStarted === 'boolean'
  );
}

export function serializeDraft(draft: Draft): string {
  return JSON.stringify(draft);
}

/** Черновик из сохранённой строки; null — строки нет, она повреждена, не подходит по форме или устарела. */
export function parseDraft(raw: string | null, now: number): Draft | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data) || !isNum(data.startedAt) || !isNum(data.updatedAt) || (data.finishedAt !== undefined && !isNum(data.finishedAt)) || (data.submitKey !== undefined && typeof data.submitKey !== 'string') || !isSession(data.session)) return null;
  if (data.session.phase !== 'feedback' && now - data.updatedAt > DRAFT_TTL_MS) return null;
  const session: Session = {
    ...data.session,
    actuals: data.session.actuals ?? data.session.steps.map(() => null),
    feeling: data.session.feeling ?? null,
    comment: data.session.comment ?? '',
  };
  return {
    session,
    startedAt: data.startedAt,
    ...(isNum(data.finishedAt) ? { finishedAt: data.finishedAt } : {}),
    ...(typeof data.submitKey === 'string' ? { submitKey: data.submitKey } : {}),
    updatedAt: data.updatedAt,
  };
}
