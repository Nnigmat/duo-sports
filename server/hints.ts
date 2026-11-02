import type { CommitBlock, Role } from '../shared/types';
import type { Db } from './db';
import { canAccessAthlete } from './trainerLinks';

type Clock = () => Date;
const now: Clock = () => new Date();

export const MAX_HINT_LENGTH = 1000;

export interface NewHint {
  /** Тренировка спортсмена, к занятию по которой относится подсказка */
  workoutId: number;
  /** slug упражнения из библиотеки */
  exerciseId: string;
  text: string;
}

export type ValidHint = { ok: true; hint: NewHint } | { ok: false; error: string };

export function validateHint(body: unknown): ValidHint {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'Ждём объект' };
  const b = body as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text || text.length > MAX_HINT_LENGTH) return { ok: false, error: `text: от 1 до ${MAX_HINT_LENGTH} символов` };
  if (!(Number.isInteger(b.workoutId) && (b.workoutId as number) > 0)) return { ok: false, error: 'workoutId: положительное целое' };
  if (typeof b.exerciseId !== 'string' || !b.exerciseId || b.exerciseId.length > 100) return { ok: false, error: 'exerciseId: непустая строка до 100 символов' };
  return { ok: true, hint: { workoutId: b.workoutId as number, exerciseId: b.exerciseId, text } };
}

export type HintResult = { ok: true; id: number } | { ok: false; error: 'not_found' | 'forbidden' | 'unknown_workout' | 'unknown_exercise' };

/** Подсказка тренера к упражнению ближайшего занятия по тренировке. Пишут тренер ученика и админ. */
export function addHint(db: Db, author: { id: number; role: Role }, athleteId: number, h: NewHint, clock: Clock = now): HintResult {
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(athleteId)) return { ok: false, error: 'not_found' };
  if (author.role === 'athlete' || !canAccessAthlete(db, author, athleteId)) return { ok: false, error: 'forbidden' };
  if (!db.prepare('SELECT 1 FROM workouts WHERE id = ? AND user_id = ?').get(h.workoutId, athleteId)) return { ok: false, error: 'unknown_workout' };
  const lib = db.prepare('SELECT name FROM exercises WHERE slug = ?').get(h.exerciseId) as { name: string } | undefined;
  if (!lib) return { ok: false, error: 'unknown_exercise' };
  const info = db
    .prepare('INSERT INTO workout_hints (athlete_id, author_id, workout_id, exercise_slug, exercise_name, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(athleteId, author.id, h.workoutId, h.exerciseId, lib.name, h.text, clock().toISOString());
  return { ok: true, id: Number(info.lastInsertRowid) };
}

export interface NextHints {
  date: string;
  workoutId: number;
  title: string;
  hints: Array<{ exerciseName: string; /** «4 × 5 · 82,5 кг» из плана, если упражнение там есть */ detail?: string; text: string }>;
}

/**
 * Подсказки к ближайшему занятию (с `today` включительно), которое ещё не выполнено. Подсказка действует до
 * первого выполнения тренировки после того, как она написана; после этого она отработана. Нет подсказок — null.
 */
export function nextWorkoutHints(db: Db, athleteId: number, today: string): NextHints | null {
  const rows = db
    .prepare(
      `SELECT e.date, e.workout_id, w.title, w.blocks FROM plan_entries e JOIN workouts w ON w.id = e.workout_id
       WHERE e.user_id = ? AND e.date >= ?
         AND NOT EXISTS (SELECT 1 FROM sessions_done s WHERE s.user_id = e.user_id AND s.workout_id = e.workout_id AND s.date = e.date)
       ORDER BY e.date, e.workout_id`,
    )
    .all(athleteId, today) as Array<{ date: string; workout_id: number; title: string; blocks: string }>;
  const active = db.prepare(
    `SELECT h.exercise_name, h.text FROM workout_hints h
     WHERE h.athlete_id = ? AND h.workout_id = ?
       AND NOT EXISTS (SELECT 1 FROM sessions_done s WHERE s.user_id = h.athlete_id AND s.workout_id = h.workout_id AND s.finished_at > h.created_at)
     ORDER BY h.id`,
  );
  for (const r of rows) {
    const hints = active.all(athleteId, r.workout_id) as Array<{ exercise_name: string; text: string }>;
    if (!hints.length) continue;
    const items = (JSON.parse(r.blocks) as CommitBlock[]).flatMap((b) => b.items);
    return {
      date: r.date,
      workoutId: r.workout_id,
      title: r.title,
      hints: hints.map((h) => {
        const item = items.find((i) => i.name.trim().toLowerCase() === h.exercise_name.trim().toLowerCase());
        return { exerciseName: h.exercise_name, ...(item && { detail: item.value }), text: h.text };
      }),
    };
  }
  return null;
}
