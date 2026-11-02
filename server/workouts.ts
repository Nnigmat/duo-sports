import type { Block, ExerciseKind, SessionResult, Workout, WorkoutResponse } from '../shared/types';
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
export function workoutResponse(db: Db, userId: number, id: number): WorkoutResponse | null {
  const workout = workoutOf(db, userId, id);
  if (!workout) return null;
  const library = libraryOf(db);
  const rows = commentRowsOf(db, userId);
  const comments = commentsFor(workout.blocks, library, rows);
  markSeen(db, comments.filter((c) => c.isNew).map((c) => Number(c.id)));
  return { workout, comments, techniques: techniquesFor(workout.blocks, library) };
}

const KINDS: ExerciseKind[] = ['reps', 'weight', 'time'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nonNeg = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export const MAX_STEPS = 2000;
export const MAX_DURATION_SEC = 86_400;

export type ValidSession = { ok: true; result: SessionResult } | { ok: false; error: string };

export function validateSession(body: unknown): ValidSession {
  if (!isObj(body) || !isDate(body.date)) return { ok: false, error: 'Ждём date вида 2026-11-03' };
  if (!Number.isInteger(body.videos) || (body.videos as number) < 0 || (body.videos as number) > 1000) return { ok: false, error: 'videos: число записанных видео' };
  if (body.durationSec !== undefined && !(Number.isInteger(body.durationSec) && (body.durationSec as number) >= 0 && (body.durationSec as number) <= MAX_DURATION_SEC)) return { ok: false, error: 'durationSec: секунды от 0 до 86400' };
  if (!Array.isArray(body.steps) || body.steps.length === 0 || body.steps.length > MAX_STEPS) return { ok: false, error: 'steps: список от 1 до 2000' };
  for (const [i, s] of body.steps.entries()) {
    const plan = isObj(s) ? s.plan : null;
    const ok =
      isObj(s) && typeof s.exerciseId === 'string' && s.exerciseId.length <= 100 && typeof s.exerciseName === 'string' && s.exerciseName.length <= 200 &&
      Number.isInteger(s.blockIndex) && Number.isInteger(s.round) && Number.isInteger(s.rounds) && KINDS.includes(s.kind as ExerciseKind) &&
      typeof s.completed === 'boolean' && isObj(plan) && isObj(plan.target) && nonNeg(plan.target.min) && nonNeg(plan.target.max) &&
      (plan.weight === undefined || nonNeg(plan.weight));
    if (!ok) return { ok: false, error: `steps[${i}]: неверные поля` };
  }
  return { ok: true, result: body as unknown as SessionResult };
}

export type SaveResult = { ok: true; id: number } | { ok: false; error: 'not_found' };

/** Записывает итог тренировки. День плана после этого считается выполненным. */
export function saveSession(db: Db, userId: number, workoutId: number, result: SessionResult, clock: Clock = now): SaveResult {
  const w = db.prepare('SELECT title FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, userId) as { title: string } | undefined;
  if (!w) return { ok: false, error: 'not_found' };
  const info = db
    .prepare('INSERT INTO sessions_done (user_id, workout_id, title, date, finished_at, steps, videos, duration_sec) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(userId, workoutId, w.title, result.date, clock().toISOString(), JSON.stringify(result.steps), result.videos, result.durationSec ?? null);
  return { ok: true, id: Number(info.lastInsertRowid) };
}
