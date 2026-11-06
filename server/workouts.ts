import type { Block, ExerciseKind, Gender, SessionResult, Workout, WorkoutResponse } from '../shared/types';
import { commentRowsOf, commentsFor, libraryOf, markSeen, techniquesFor } from './comments';
import type { Db } from './db';
import { isDate } from './imports';

type Clock = () => Date;
const now: Clock = () => new Date();

/** Тренировка для экрана выполнения. Без структуры (импортирована старой версией) запустить нельзя — null. */
export function workoutOf(db: Db, userId: number, id: number): Workout | null {
  const row = db.prepare('SELECT id, title, structure FROM workouts WHERE id = ? AND user_id = ?').get(id, userId) as
    | { id: number; title: string; structure: string | null }
    | undefined;
  if (!row?.structure) return null;
  return { id: String(row.id), title: row.title, blocks: JSON.parse(row.structure) as Block[] };
}

/** Тренировка с комментариями тренера и техникой из библиотеки. Показанные комментарии помечаются прочитанными. */
/** markRead: false — превью тренера: ученик ничего не «прочитал», комментарии остаются новыми */
export function workoutResponse(db: Db, userId: number, id: number, markRead = true): WorkoutResponse | null {
  const workout = workoutOf(db, userId, id);
  if (!workout) return null;
  const library = libraryOf(db);
  const rows = commentRowsOf(db, userId);
  const comments = commentsFor(workout.blocks, library, rows);
  // Комментарии из разбора (с привязкой к тренировке) помечает прочитанными экран разбора, иначе «новое» пропало бы раньше
  const ofReview = new Set(rows.filter((r) => r.sessionId !== null).map((r) => String(r.id)));
  if (markRead) markSeen(db, comments.filter((c) => c.isNew && !ofReview.has(c.id)).map((c) => Number(c.id)));
  // Ролик выбираем по полу владельца тренировки: тренер в превью видит то же, что увидит ученик
  const owner = db.prepare('SELECT gender FROM users WHERE id = ?').get(userId) as { gender: Gender | null } | undefined;
  const gender = owner?.gender ?? undefined;
  return { workout, comments, techniques: techniquesFor(workout.blocks, library, gender), ...(gender ? { gender } : {}) };
}

const KINDS: ExerciseKind[] = ['reps', 'weight', 'time'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nonNeg = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export const MAX_STEPS = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const MAX_DURATION_SEC = 86_400;
export const MAX_COMMENT = 1000;

/** Факт подхода: число, необязательный вес и отметка «был доп. вес» (только true). Нет поля — старый клиент или пропуск. */
const isActual = (v: unknown): boolean =>
  isObj(v) && nonNeg(v.value) && (v.weight === undefined || nonNeg(v.weight)) && (v.extraWeight === undefined || v.extraWeight === true);

export type ValidSession = { ok: true; result: SessionResult } | { ok: false; error: string };

export function validateSession(body: unknown): ValidSession {
  if (!isObj(body) || !isDate(body.date)) return { ok: false, error: 'Ждём date вида 2026-11-03' };
  if (!Number.isInteger(body.videos) || (body.videos as number) < 0 || (body.videos as number) > 1000) return { ok: false, error: 'videos: число записанных видео' };
  if (body.durationSec !== undefined && !(Number.isInteger(body.durationSec) && (body.durationSec as number) >= 0 && (body.durationSec as number) <= MAX_DURATION_SEC)) return { ok: false, error: 'durationSec: секунды от 0 до 86400' };
  if ('feeling' in body && !(Number.isInteger(body.feeling) && (body.feeling as number) >= 1 && (body.feeling as number) <= 5)) return { ok: false, error: 'feeling: оценка от 1 до 5' };
  if ('comment' in body && !(typeof body.comment === 'string' && body.comment.length <= MAX_COMMENT)) return { ok: false, error: `comment: до ${MAX_COMMENT} знаков` };
  if ('key' in body && !(typeof body.key === 'string' && UUID.test(body.key))) return { ok: false, error: 'key: uuid' };
  if (!Array.isArray(body.steps) || body.steps.length === 0 || body.steps.length > MAX_STEPS) return { ok: false, error: 'steps: список от 1 до 2000' };
  for (const [i, s] of body.steps.entries()) {
    const plan = isObj(s) ? s.plan : null;
    const ok =
      isObj(s) && typeof s.exerciseId === 'string' && s.exerciseId.length <= 100 && typeof s.exerciseName === 'string' && s.exerciseName.length <= 200 &&
      Number.isInteger(s.blockIndex) && Number.isInteger(s.round) && Number.isInteger(s.rounds) && KINDS.includes(s.kind as ExerciseKind) &&
      typeof s.completed === 'boolean' && isObj(plan) && isObj(plan.target) && nonNeg(plan.target.min) && nonNeg(plan.target.max) &&
      (plan.weight === undefined || nonNeg(plan.weight)) &&
      (s.actual === undefined || isActual(s.actual)) &&
      (s.restSec === undefined || (Number.isInteger(s.restSec) && (s.restSec as number) >= 0 && (s.restSec as number) <= MAX_DURATION_SEC)) &&
      (s.videoId === undefined || (typeof s.videoId === 'string' && UUID.test(s.videoId)));
    if (!ok) return { ok: false, error: `steps[${i}]: неверные поля` };
  }
  const ids = (body.steps as Array<{ videoId?: string }>).flatMap((s) => (s.videoId ? [s.videoId] : []));
  if (new Set(ids).size !== ids.length) return { ok: false, error: 'videoId: одно видео на один подход' };
  return { ok: true, result: body as unknown as SessionResult };
}

export type SaveResult = { ok: true; id: number; duplicate?: true } | { ok: false; error: 'not_found' | 'bad_video' };

/** Записывает итог тренировки. День плана после этого считается выполненным. */
export function saveSession(db: Db, userId: number, workoutId: number, result: SessionResult, clock: Clock = now): SaveResult {
  const w = db.prepare('SELECT title FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, userId) as { title: string } | undefined;
  if (!w) return { ok: false, error: 'not_found' };
  // Повторная отправка того же итога (после обрыва сети ответ мог не дойти): отдаём уже созданный, второго не пишем
  if (result.key) {
    const prior = db.prepare('SELECT id FROM sessions_done WHERE user_id = ? AND client_key = ?').get(userId, result.key) as { id: number } | undefined;
    if (prior) return { ok: true, id: prior.id, duplicate: true };
  }
  const claim = db.prepare('UPDATE videos SET session_id = ?, step_index = ? WHERE id = ? AND athlete_id = ? AND session_id IS NULL');
  // Одна транзакция: если видео чужое или уже занято, тренировка не записывается
  const run = db.transaction((): SaveResult => {
    const info = db
      .prepare('INSERT INTO sessions_done (user_id, workout_id, title, date, finished_at, steps, videos, duration_sec, feeling, comment, client_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(userId, workoutId, w.title, result.date, clock().toISOString(), JSON.stringify(result.steps), result.videos, result.durationSec ?? null, result.feeling ?? null, result.comment?.trim() || null, result.key ?? null);
    const id = Number(info.lastInsertRowid);
    for (const [i, s] of result.steps.entries()) {
      if (s.videoId && claim.run(id, i, s.videoId, userId).changes !== 1) throw new BadVideo();
    }
    return { ok: true, id };
  });
  try {
    return run();
  } catch (e) {
    if (e instanceof BadVideo) return { ok: false, error: 'bad_video' };
    throw e;
  }
}

class BadVideo extends Error {}
