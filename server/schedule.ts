import type { ScheduleResponse, ScheduleTarget } from '../shared/types';
import type { Db } from './db';
import { addDays, weekStart } from './today';

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);
const weekdayOf = (iso: string) => WEEKDAYS[(parse(iso).getUTCDay() + 6) % 7]!;
const dayOf = (iso: string) => parse(iso).getUTCDate();

export interface ScheduleInput {
  today: string;
  /** День, с которого переносим */
  from: string;
  /** Тренировка, которую переносим; null, если её нет */
  workout: { id: number; title: string } | null;
  /** Названия тренировок по датам плана (первая тренировка дня) */
  titleByDate: Map<string, string>;
}

const target = (iso: string, titleByDate: Map<string, string>): ScheduleTarget => {
  const busy = titleByDate.get(iso);
  return { date: iso, weekday: weekdayOf(iso), day: String(dayOf(iso)), ...(busy && { busy }) };
};

/** «2–8 ноября» или «30 нояб – 6 дек» */
export function rangeLabel(start: string, end: string): string {
  const a = parse(start);
  const b = parse(end);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${dayOf(start)}–${dayOf(end)} ${MONTHS[b.getUTCMonth()]}`;
  return `${dayOf(start)} ${MONTHS_SHORT[a.getUTCMonth()]} – ${dayOf(end)} ${MONTHS_SHORT[b.getUTCMonth()]}`;
}

const RELATIVE: Record<number, string> = { 1: 'Завтра', 2: 'Послезавтра' };

export function buildSchedule(input: ScheduleInput): ScheduleResponse | null {
  const { today, from, workout, titleByDate } = input;
  if (!workout) return null;
  // Пропущенную тренировку переносим вперёд от сегодняшнего дня: прошлые дни не предлагаем
  const missed = from < today;
  const first = missed ? today : addDays(from, 1);
  const weekOf = missed ? today : from;
  const weekEnd = addDays(weekStart(weekOf), 6);
  const rest: string[] = [];
  for (let d = first; d <= weekEnd; d = addDays(d, 1)) rest.push(d);
  const pick = rest.find((d) => !titleByDate.has(d)) ?? rest[0];
  const offset = pick ? rest.indexOf(pick) : 0;
  const relative = missed ? (offset === 0 ? 'Сегодня' : RELATIVE[offset]) : RELATIVE[offset + 1];
  const nextStart = addDays(weekStart(weekOf), 7);
  const d = parse(from);
  const whenLabel = `${from === today ? 'сегодня, ' : ''}${weekdayOf(from)} ${dayOf(from)} ${MONTHS_SHORT[d.getUTCMonth()]}`;
  return {
    from,
    workout: { id: String(workout.id), title: workout.title, whenLabel },
    sameWeek: pick ? { ...target(pick, titleByDate), ...(relative && { relative }) } : null,
    nextWeek: { rangeLabel: rangeLabel(nextStart, addDays(nextStart, 6)), days: Array.from({ length: 7 }, (_, i) => target(addDays(nextStart, i), titleByDate)) },
  };
}

type PlanRow = { date: string; workout_id: number; title: string };

function planRows(db: Db, userId: number): PlanRow[] {
  return db.prepare('SELECT e.date, e.workout_id, w.title FROM plan_entries e JOIN workouts w ON w.id = e.workout_id WHERE e.user_id = ? ORDER BY e.date, e.workout_id').all(userId) as PlanRow[];
}

/** Выполнена или пропущена: такую тренировку не переносят и не пропускают повторно */
const isHandled = (db: Db, userId: number, date: string, workoutId: number) =>
  !!db.prepare('SELECT 1 FROM sessions_done WHERE user_id = ? AND date = ? AND workout_id = ?').get(userId, date, workoutId) ||
  !!db.prepare('SELECT 1 FROM plan_skips WHERE user_id = ? AND date = ? AND workout_id = ?').get(userId, date, workoutId);

/** Варианты переноса тренировки дня `from`, ещё не выполненной и не пропущенной; null, если переносить нечего */
export function scheduleOf(db: Db, userId: number, today: string, from: string): ScheduleResponse | null {
  const rows = planRows(db, userId);
  const mine = rows.find((r) => r.date === from && !isHandled(db, userId, from, r.workout_id));
  const titleByDate = new Map<string, string>();
  for (const r of rows) if (!titleByDate.has(r.date)) titleByDate.set(r.date, r.title);
  return buildSchedule({ today, from, workout: mine ? { id: mine.workout_id, title: mine.title } : null, titleByDate });
}

export type MoveResult = { ok: true } | { ok: false; error: 'not_found' | 'bad_target' };

/** Переносит тренировку из дня `from` в `to`; в целевом дне остальные тренировки сохраняются */
export function moveEntry(db: Db, userId: number, today: string, from: string, to: string): MoveResult {
  return db.transaction((): MoveResult => {
    if (to === from || to < today) return { ok: false, error: 'bad_target' };
    const mine = planRows(db, userId).find((r) => r.date === from && !isHandled(db, userId, from, r.workout_id));
    if (!mine) return { ok: false, error: 'not_found' };
    // Если та же тренировка уже стоит в целевом дне, запись из исходного просто убираем
    db.prepare('INSERT OR IGNORE INTO plan_entries (user_id, date, workout_id, import_id) SELECT user_id, ?, workout_id, import_id FROM plan_entries WHERE user_id = ? AND date = ? AND workout_id = ?').run(to, userId, from, mine.workout_id);
    db.prepare('DELETE FROM plan_entries WHERE user_id = ? AND date = ? AND workout_id = ?').run(userId, from, mine.workout_id);
    return { ok: true };
  })();
}

export type SkipResult = { ok: true } | { ok: false; error: 'not_found' };

/** Пропускает первую невыполненную тренировку дня: она остаётся в плане, серия недель не засчитывает её */
export function skipEntry(db: Db, userId: number, from: string, clock: () => Date = () => new Date()): SkipResult {
  return db.transaction((): SkipResult => {
    const mine = planRows(db, userId).find((r) => r.date === from && !isHandled(db, userId, from, r.workout_id));
    if (!mine) return { ok: false, error: 'not_found' };
    db.prepare('INSERT INTO plan_skips (user_id, date, workout_id, created_at) VALUES (?, ?, ?, ?)').run(userId, from, mine.workout_id, clock().toISOString());
    return { ok: true };
  })();
}

/** Снимает пропуск с первой пропущенной тренировки дня: она снова обычная невыполненная */
export function unskipEntry(db: Db, userId: number, from: string): SkipResult {
  const row = db.prepare('SELECT workout_id FROM plan_skips WHERE user_id = ? AND date = ? ORDER BY workout_id LIMIT 1').get(userId, from) as { workout_id: number } | undefined;
  if (!row) return { ok: false, error: 'not_found' };
  db.prepare('DELETE FROM plan_skips WHERE user_id = ? AND date = ? AND workout_id = ?').run(userId, from, row.workout_id);
  return { ok: true };
}

/** Самая долгая пауза за раз */
export const MAX_PAUSE_DAYS = 90;

export type PauseResult = { ok: true } | { ok: false; error: 'bad_range' };

/** Ставит план на паузу с from по to включительно; пересекающиеся паузы укорачиваются или заменяются */
export function pausePlan(db: Db, userId: number, from: string, to: string, clock: () => Date = () => new Date()): PauseResult {
  if (to < from || to > addDays(from, MAX_PAUSE_DAYS - 1)) return { ok: false, error: 'bad_range' };
  db.transaction(() => {
    resumePlan(db, userId, from);
    db.prepare('DELETE FROM plan_pauses WHERE user_id = ? AND start_date BETWEEN ? AND ?').run(userId, from, to);
    db.prepare('INSERT INTO plan_pauses (user_id, start_date, end_date, created_at) VALUES (?, ?, ?, ?)').run(userId, from, to, clock().toISOString());
  })();
  return { ok: true };
}

/** Снимает паузу с дня date: будущие паузы удаляются, идущая заканчивается накануне. Возвращает, была ли пауза. */
export function resumePlan(db: Db, userId: number, date: string): boolean {
  return db.transaction(() => {
    const gone = db.prepare('DELETE FROM plan_pauses WHERE user_id = ? AND start_date >= ?').run(userId, date).changes;
    const cut = db.prepare('UPDATE plan_pauses SET end_date = ? WHERE user_id = ? AND start_date < ? AND end_date >= ?').run(addDays(date, -1), userId, date, date).changes;
    return gone + cut > 0;
  })();
}
