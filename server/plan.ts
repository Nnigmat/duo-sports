import type { Block, CommitBlock, Exercise, PlanEntry, PlanMove, PlanResponse, PlanTemplate, PlanTone } from '../shared/types';
import type { Db } from './db';
import { composeDisplay, composeStructure, type RoutineLinks } from './routines';

const TONES: PlanTone[] = ['primary', 'teal', 'amber', 'slate'];

type WorkoutRow = RoutineLinks & { id: number; title: string; blocks: string; structure: string | null };
type EntryRow = { date: string; workout_id: number };

/** Оценка длительности тренировки: по десять минут на разминку и заминку (если в блоке есть пункты, сколько бы их ни было) и пять на упражнение основной части; кратно пяти, не меньше 15 */
export function estimateWorkoutMinutes(blocks: CommitBlock[]): number {
  const filled = (kind: CommitBlock['kind']) => blocks.some((b) => b.kind === kind && b.items.length > 0);
  const main = blocks.filter((b) => b.kind === 'exercises').reduce((n, b) => n + b.items.length, 0);
  const minutes = (filled('warmup') ? 10 : 0) + (filled('cooldown') ? 10 : 0) + main * 5;
  return Math.max(15, Math.round(minutes / 5) * 5);
}

const REP_SEC = 4;
const UNKNOWN_WORK_SEC = 40;
const SETUP_SEC = 20;

/** Секунды работы в одном подходе: время — как задано, повторы — по REP_SEC на повтор, «макс.» без числа — UNKNOWN_WORK_SEC; упражнение с sides идёт на обе стороны */
function workSec(e: Exercise, real?: Map<string, number>): number {
  const measured = real?.get(e.name.trim().toLowerCase());
  if (measured !== undefined) return measured; // подход целиком, обе стороны уже внутри
  const one = e.kind === 'time' ? e.target.max : e.target.max > 0 ? Math.max(15, e.target.max * REP_SEC) : UNKNOWN_WORK_SEC;
  return e.sides ? one * 2 : one;
}

const roundMinutes = (sec: number) => Math.max(15, Math.round(sec / 60 / 5) * 5);

/** Медиана реальных длительностей прошлых прохождений, секунды; без замеров — null */
function medianSec(past: number[]): number | null {
  if (!past.length) return null;
  const sorted = [...past].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Оценка по структуре экрана: подходы, круги, отдых и время разминки и заминки; кратно пяти, не меньше 15. Без структуры — по числу упражнений.
 * Если эту тренировку уже проходили (pastSec — длительности прошлых прохождений, секунды), берём их медиану: реальное время точнее расчёта.
 */
export function estimateMinutes(blocks: CommitBlock[], structure: Block[] | null, pastSec: number[] = [], realWork?: Map<string, number>): number {
  const real = medianSec(pastSec);
  if (real !== null) return roundMinutes(real);
  if (!structure) return estimateWorkoutMinutes(blocks);
  const sec = structure.reduce((total, b) => {
    if (b.mode === 'timed') return total + b.exercises.reduce((n, e) => n + workSec(e, realWork), 0);
    if (b.mode === 'sets') return total + b.exercises.reduce((n, e) => n + e.sets * (workSec(e, realWork) + b.restSec) + SETUP_SEC, 0);
    return total + b.rounds * (b.exercises.reduce((n, e) => n + workSec(e, realWork), 0) + b.exercises.length * b.restSec) + SETUP_SEC;
  }, 0);
  return roundMinutes(sec);
}

/** Длительности прошлых прохождений тренировок пользователя: id тренировки → секунды (только с замером) */
export function pastDurations(db: Db, userId: number): Map<number, number[]> {
  const byWorkout = new Map<number, number[]>();
  for (const r of db.prepare('SELECT workout_id, duration_sec FROM sessions_done WHERE user_id = ? AND workout_id IS NOT NULL AND duration_sec > 0').all(userId) as Array<{ workout_id: number; duration_sec: number }>) {
    byWorkout.set(r.workout_id, [...(byWorkout.get(r.workout_id) ?? []), r.duration_sec]);
  }
  return byWorkout;
}

/** Типичное реальное время подхода по упражнениям (медиана времени (endedAt − startedAt) выполненных подходов, секунды); ключ — название в нижнем регистре. Нужно не меньше двух замеров. */
export function exerciseWorkSec(db: Db, userId: number): Map<string, number> {
  const samples = new Map<string, number[]>();
  for (const r of db.prepare('SELECT steps FROM sessions_done WHERE user_id = ?').all(userId) as Array<{ steps: string }>) {
    for (const st of JSON.parse(r.steps) as Array<{ exerciseName: string; completed: boolean; startedAt?: number; endedAt?: number }>) {
      const sec = st.startedAt !== undefined && st.endedAt !== undefined ? Math.round((st.endedAt - st.startedAt) / 1000) : 0;
      if (!st.completed || sec <= 0) continue;
      const key = st.exerciseName.trim().toLowerCase();
      samples.set(key, [...(samples.get(key) ?? []), sec]);
    }
  }
  const out = new Map<string, number>();
  for (const [k, v] of samples) if (v.length >= 2) out.set(k, medianSec(v)!);
  return out;
}

function template(db: Db, w: WorkoutRow, pastSec: number[], realWork: Map<string, number>): PlanTemplate {
  const blocks = composeDisplay(db, w);
  // Разминка и заминка в составе не показываем: в них десятки коротких упражнений, а смысл дня — основная часть
  const exercises = blocks.filter((b) => b.kind === 'exercises').flatMap((b) => b.items.map((i) => ({ name: i.name, detail: i.value })));
  return { id: String(w.id), title: w.title, minutes: estimateMinutes(blocks, composeStructure(db, w), pastSec, realWork), tone: TONES[(w.id - 1) % TONES.length]!, exercises };
}

/** Тренировки пользователя как шаблоны и записи плана по дням. В дне с двумя тренировками первая главная, остальные — в more. */
export function planOf(db: Db, userId: number): PlanResponse {
  const workouts = db.prepare('SELECT id, title, blocks, structure, warmup_routine_id, cooldown_routine_id FROM workouts WHERE user_id = ? ORDER BY id').all(userId) as WorkoutRow[];
  const past = pastDurations(db, userId);
  const realWork = exerciseWorkSec(db, userId);
  const titles = new Map(workouts.map((w) => [w.id, w.title]));
  const rows = db.prepare('SELECT date, workout_id FROM plan_entries WHERE user_id = ? ORDER BY date, workout_id').all(userId) as EntryRow[];
  // Порядок по id: у двух занятий в один день разбор ведёт на последнее
  const done = new Map((db.prepare('SELECT id, workout_id, date FROM sessions_done WHERE user_id = ? AND workout_id IS NOT NULL ORDER BY id').all(userId) as Array<{ id: number; workout_id: number; date: string }>).map((d) => [`${d.date}:${d.workout_id}`, d.id]));
  const skipped = new Set((db.prepare('SELECT workout_id, date FROM plan_skips WHERE user_id = ?').all(userId) as Array<{ workout_id: number; date: string }>).map((d) => `${d.date}:${d.workout_id}`));
  const statusOf = (r: EntryRow): PlanEntry['status'] => (done.has(`${r.date}:${r.workout_id}`) ? 'done' : skipped.has(`${r.date}:${r.workout_id}`) ? 'skipped' : 'planned');
  const entries: Record<string, PlanEntry> = {};
  for (const r of rows) {
    const main = entries[r.date];
    if (!main) {
      const sessionId = done.get(`${r.date}:${r.workout_id}`);
      entries[r.date] = { templateId: String(r.workout_id), status: statusOf(r), custom: true, ...(sessionId !== undefined && { sessionId }) };
    }
    else {
      main.more ??= [];
      main.more.push(titles.get(r.workout_id) ?? '');
    }
  }
  const moves = (
    db
      .prepare('SELECT m.workout_id, m.from_date, m.to_date FROM plan_moves m JOIN plan_entries e ON e.user_id = m.user_id AND e.date = m.to_date AND e.workout_id = m.workout_id WHERE m.user_id = ? ORDER BY m.from_date, m.workout_id')
      .all(userId) as Array<{ workout_id: number; from_date: string; to_date: string }>
  ).map((m): PlanMove => ({ templateId: String(m.workout_id), from: m.from_date, to: m.to_date }));
  return { templates: workouts.map((w) => template(db, w, past.get(w.id) ?? [], realWork)), entries, moves };
}

export type DayResult = { ok: true } | { ok: false; error: 'not_found' };

/** В этот день остаётся одна тренировка: «Добавить» и «Копировать» заменяют то, что стояло */
export function setDay(db: Db, userId: number, date: string, workoutId: number): DayResult {
  return db.transaction((): DayResult => {
    if (!db.prepare('SELECT 1 FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, userId)) return { ok: false, error: 'not_found' };
    db.prepare('DELETE FROM plan_entries WHERE user_id = ? AND date = ?').run(userId, date);
    db.prepare('DELETE FROM plan_moves WHERE user_id = ? AND to_date = ?').run(userId, date);
    db.prepare('INSERT INTO plan_entries (user_id, date, workout_id, import_id) VALUES (?, ?, ?, NULL)').run(userId, date, workoutId);
    return { ok: true };
  })();
}

/** Копия тренировки другому ученику: ему создаётся своя тренировка с тем же составом и ставится в день, заменяя стоявшую */
export function copyWorkoutToAthlete(db: Db, fromUserId: number, workoutId: number, toUserId: number, date: string): DayResult {
  return db.transaction((): DayResult => {
    const src = db.prepare('SELECT title, blocks, structure, warmup_routine_id, cooldown_routine_id FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, fromUserId) as (RoutineLinks & { title: string; blocks: string; structure: string | null }) | undefined;
    if (!src) return { ok: false, error: 'not_found' };
    const id = Number(db.prepare('INSERT INTO workouts (user_id, slug, title, blocks, structure, warmup_routine_id, cooldown_routine_id, import_id, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, ?)').run(toUserId, src.title, src.blocks, src.structure, src.warmup_routine_id, src.cooldown_routine_id, new Date().toISOString()).lastInsertRowid);
    return setDay(db, toUserId, date, id);
  })();
}

export function clearDay(db: Db, userId: number, date: string): void {
  db.prepare('DELETE FROM plan_entries WHERE user_id = ? AND date = ?').run(userId, date);
  db.prepare('DELETE FROM plan_moves WHERE user_id = ? AND to_date = ?').run(userId, date);
}
