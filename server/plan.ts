import type { CommitBlock, PlanEntry, PlanMove, PlanResponse, PlanTemplate, PlanTone } from '../shared/types';
import type { Db } from './db';
import { composeDisplay, type RoutineLinks } from './routines';

const TONES: PlanTone[] = ['primary', 'teal', 'amber', 'slate'];

type WorkoutRow = RoutineLinks & { id: number; title: string; blocks: string };
type EntryRow = { date: string; workout_id: number };

/** Оценка длительности тренировки: по десять минут на разминку и заминку (если в блоке есть пункты, сколько бы их ни было) и пять на упражнение основной части; кратно пяти, не меньше 15 */
export function estimateWorkoutMinutes(blocks: CommitBlock[]): number {
  const filled = (kind: CommitBlock['kind']) => blocks.some((b) => b.kind === kind && b.items.length > 0);
  const main = blocks.filter((b) => b.kind === 'exercises').reduce((n, b) => n + b.items.length, 0);
  const minutes = (filled('warmup') ? 10 : 0) + (filled('cooldown') ? 10 : 0) + main * 5;
  return Math.max(15, Math.round(minutes / 5) * 5);
}

function template(db: Db, w: WorkoutRow): PlanTemplate {
  const blocks = composeDisplay(db, w);
  // Разминка и заминка в составе не показываем: в них десятки коротких упражнений, а смысл дня — основная часть
  const exercises = blocks.filter((b) => b.kind === 'exercises').flatMap((b) => b.items.map((i) => ({ name: i.name, detail: i.value })));
  return { id: String(w.id), title: w.title, minutes: estimateWorkoutMinutes(blocks), tone: TONES[(w.id - 1) % TONES.length]!, exercises };
}

/** Тренировки пользователя как шаблоны и записи плана по дням. В дне с двумя тренировками первая главная, остальные — в more. */
export function planOf(db: Db, userId: number): PlanResponse {
  const workouts = db.prepare('SELECT id, title, blocks, warmup_routine_id, cooldown_routine_id FROM workouts WHERE user_id = ? ORDER BY id').all(userId) as WorkoutRow[];
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
  return { templates: workouts.map((w) => template(db, w)), entries, moves };
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
