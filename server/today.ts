import type { Block, CommitBlock, SessionStepResult, TodayDay, TodayMissed, TodayPause, TodayResponse, TodayWorkoutCard } from '../shared/types';
import type { Db } from './db';
import { reviewNoticeOf, unreadCount } from './notifications';
import { estimateMinutes } from './plan';
import { awaitingReviewOf } from './sessionReview';

const NBSP = ' ';
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// ── Даты: «2026-11-03» как календарный день без часового пояса ──

const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => fmt(new Date(parse(iso).getTime() + n * 86_400_000));
/** 0 — понедельник … 6 — воскресенье */
const weekdayIndex = (iso: string) => (parse(iso).getUTCDay() + 6) % 7;
export const weekStart = (iso: string) => addDays(iso, -weekdayIndex(iso));
const dayOfMonth = (iso: string) => String(parse(iso).getUTCDate());

const plural = (n: number, [one, few, many]: [string, string, string]) => {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
const groupDigits = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

// ── Входные данные: всё, что нужно знать о пользователе ──

export interface TodayWorkoutInfo {
  id: number;
  title: string;
  blocks: CommitBlock[];
  /** Блоки экрана тренировки; у старых импортов нет */
  structure: Block[] | null;
}
export interface TodaySession {
  /** id записи sessions_done: по нему открывается разбор */
  id?: number;
  workoutId: number | null;
  title: string;
  date: string;
  steps: SessionStepResult[];
  /** Секунды; null у тренировок, записанных без замера */
  durationSec?: number | null;
}
export interface TodayInput {
  today: string;
  userName: string;
  workouts: Map<number, TodayWorkoutInfo>;
  /** Пары «дата, тренировка» из плана */
  entries: Array<{ date: string; workoutId: number }>;
  sessions: TodaySession[];
  /** Пропущенные нарочно тренировки: «дата:id тренировки» */
  skips?: Set<string>;
  /** Паузы плана: даты включительно */
  pauses?: Array<{ from: string; to: string }>;
  /** Мышцы упражнения по названию; пусто, если в библиотеке его нет */
  musclesOf: (exerciseName: string) => string[];
}

// ── Вычисления по одной тренировке ──

const exerciseItems = (w: TodayWorkoutInfo) => w.blocks.flatMap((b) => b.items);

export function modeLabel(structure: Block[] | null): string {
  if (!structure) return '';
  const modes = new Set(structure.map((b) => b.mode));
  const sets = modes.has('sets');
  const circuit = modes.has('circuit');
  if (sets && circuit) return 'Подходами + круг';
  if (sets) return 'Подходами';
  if (circuit) return 'По кругу';
  return modes.size ? 'По таймеру' : '';
}

/** Что реально сделано в подходе: факт, а без него (старые Итоги) план; повторы плана берём по нижней границе */
export function effectiveSet(s: SessionStepResult): { weight: number; value: number } {
  return { weight: s.actual?.weight ?? s.plan.weight ?? 0, value: s.actual?.value ?? s.plan.target.min };
}

/** Объём — вес × повторы выполненных подходов по факту, без факта по плану. «Был доп. вес» вес не меняет. */
export function sessionVolume(steps: SessionStepResult[]): number {
  return steps.reduce((sum, s) => {
    if (!s.completed || s.kind !== 'weight') return sum;
    const { weight, value } = effectiveSet(s);
    return sum + weight * value;
  }, 0);
}
export const doneSets = (steps: SessionStepResult[]) => steps.filter((s) => s.completed).length;

function workoutCard(w: TodayWorkoutInfo, today: string, musclesOf: TodayInput['musclesOf']): TodayWorkoutCard {
  const all = exerciseItems(w);
  const main = w.blocks.filter((b) => b.kind === 'exercises').flatMap((b) => b.items);
  const shown = main.slice(0, 3);
  const exercises = shown.map((i) => ({ name: i.name, plan: i.value }));
  if (main.length > shown.length) exercises.push({ name: `+ ещё ${main.length - shown.length}`, plan: '' });
  const muscles = [...new Set(all.flatMap((i) => musclesOf(i.name)))].slice(0, 4);
  return {
    id: String(w.id),
    title: w.title,
    whenLabel: `сегодня, ${WEEKDAYS[weekdayIndex(today)]} ${dayOfMonth(today)} ${MONTHS_SHORT[parse(today).getUTCMonth()]}`,
    exerciseCount: all.length,
    minutes: estimateMinutes(all.length),
    modeLabel: modeLabel(w.structure),
    muscles,
    exercises,
  };
}

/** Минуты всех тренировок дня; если хоть у одной нет замера, не знаем */
export function sessionsMinutes(sessions: TodaySession[]): number | undefined {
  if (!sessions.length || sessions.some((s) => s.durationSec == null)) return undefined;
  return Math.max(1, Math.round(sessions.reduce((sum, s) => sum + s.durationSec!, 0) / 60));
}

function doneMeta(sessions: TodaySession[]): string {
  const minutes = sessionsMinutes(sessions);
  const steps = sessions.flatMap((s) => s.steps);
  const volume = sessionVolume(steps);
  const sets = doneSets(steps);
  return [minutes !== undefined ? `${minutes}${NBSP}мин` : '', volume > 0 ? `${groupDigits(volume)}${NBSP}кг` : '', `${sets}${NBSP}${plural(sets, ['подход', 'подхода', 'подходов'])}`].filter(Boolean).join(' · ');
}

// ── Неделя ──

function fullLabel(iso: string, today: string): string {
  const d = parse(iso);
  const date = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return iso === today ? `Сегодня, ${date}` : `${WEEKDAYS_FULL[weekdayIndex(iso)]}, ${date}`;
}

const pausedOn = (input: Pick<TodayInput, 'pauses'>, iso: string) => input.pauses?.some((p) => iso >= p.from && iso <= p.to) ?? false;

const isSkipped = (input: TodayInput, e: { date: string; workoutId: number }) => input.skips?.has(`${e.date}:${e.workoutId}`) ?? false;

function weekDay(iso: string, input: TodayInput): TodayDay {
  const { today, workouts, entries, sessions } = input;
  const base = { weekday: WEEKDAYS[weekdayIndex(iso)]!, date: dayOfMonth(iso), iso, fullLabel: fullLabel(iso, today), ...(iso === today && { today: true }) };
  const done = sessions.filter((s) => s.date === iso);
  if (done.length) {
    const title = done[0]!.title;
    return { ...base, status: 'done', caption: title, title, meta: doneMeta(done), actionLabel: 'Итоги', ...(done[0]!.id !== undefined && { sessionId: done[0]!.id }) };
  }
  const entry = entries.find((e) => e.date === iso);
  const w = entry && workouts.get(entry.workoutId);
  if (!w) return { ...base, status: 'rest', title: 'День отдыха', meta: 'Без тренировки' };
  if (pausedOn(input, iso)) return { ...base, status: 'rest', caption: w.title, title: w.title, meta: 'План на паузе' };
  if (isSkipped(input, entry)) return { ...base, status: 'missed', caption: w.title, title: w.title, meta: 'Пропущена', actionLabel: 'Вернуть' };
  if (iso < today) return { ...base, status: 'missed', caption: w.title, title: w.title, meta: 'Пропущена', actionLabel: 'Перенести' };
  const n = exerciseItems(w).length;
  return {
    ...base,
    status: 'planned',
    caption: w.title,
    title: w.title,
    meta: `${n}${NBSP}${plural(n, ['упражнение', 'упражнения', 'упражнений'])} · ≈${NBSP}${estimateMinutes(n)}${NBSP}мин`,
    actionLabel: iso === today ? 'Начать' : 'Перенести',
  };
}

// ── Серия недель ──

/** Сколько недель подряд весь план выполнен. Текущая неделя засчитывается, если уже закрыта, и не обрывает серию, пока идёт. */
export function streakWeeks(today: string, entries: TodayInput['entries'], sessions: TodaySession[], pauses: TodayInput['pauses'] = []): number {
  const doneKey = new Set(sessions.filter((s) => s.workoutId !== null).map((s) => `${s.date}:${s.workoutId}`));
  const byWeek = new Map<string, boolean[]>();
  for (const e of entries) {
    if (pausedOn({ pauses }, e.date)) continue;
    const key = weekStart(e.date);
    byWeek.set(key, [...(byWeek.get(key) ?? []), doneKey.has(`${e.date}:${e.workoutId}`)]);
  }
  const current = weekStart(today);
  let streak = 0;
  for (let i = 0, week = current; i < 520; i++, week = addDays(week, -7)) {
    const days = byWeek.get(week);
    // Неделя с паузой, в которой не осталось тренировок вне паузы, серию не обрывает и не засчитывается
    if (!days?.length && pauses.some((p) => p.from <= addDays(week, 6) && p.to >= week)) continue;
    const complete = !!days?.length && days.every(Boolean);
    if (complete) streak++;
    else if (week !== current) break;
  }
  return streak;
}

// ── Итог ──

function nextWorkout(input: TodayInput) {
  const next = input.entries.filter((e) => e.date > input.today && input.workouts.has(e.workoutId) && !isSkipped(input, e) && !pausedOn(input, e.date)).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;
  const w = input.workouts.get(next.workoutId)!;
  const d = parse(next.date);
  return {
    whenLabel: next.date === addDays(input.today, 1) ? 'завтра' : `${WEEKDAYS[weekdayIndex(next.date)]}, ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`,
    title: w.title,
    minutes: estimateMinutes(exerciseItems(w).length),
  };
}

/** Как далеко назад ищем пропущенное */
const MISSED_DAYS = 28;

/** Невыполненные тренировки плана с прошлых недель; пропуски этой недели видны в самой неделе */
export function missedBefore(input: TodayInput): TodayMissed[] {
  const start = weekStart(input.today);
  const since = addDays(start, -MISSED_DAYS);
  const done = new Set(input.sessions.filter((s) => s.workoutId !== null).map((s) => `${s.date}:${s.workoutId}`));
  return input.entries
    .filter((e) => e.date < start && e.date >= since && !done.has(`${e.date}:${e.workoutId}`) && !isSkipped(input, e) && !pausedOn(input, e.date) && input.workouts.has(e.workoutId))
    .sort((a, b) => (a.date === b.date ? a.workoutId - b.workoutId : a.date < b.date ? 1 : -1))
    .map((e) => ({ iso: e.date, label: fullLabel(e.date, input.today), title: input.workouts.get(e.workoutId)!.title }));
}

/** Ближайшая пауза, которая ещё не закончилась */
function pauseOf(input: TodayInput): { pause: TodayPause } | Record<string, never> {
  const p = (input.pauses ?? []).filter((x) => x.to >= input.today).sort((a, b) => a.from.localeCompare(b.from))[0];
  if (!p) return {};
  const d = parse(p.to);
  return { pause: { ...p, label: `до ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` } };
}

/** Часть ответа, которая считается из плана и истории; уведомления и разбор добавляет todayOf */
export type TodayBase = Omit<TodayResponse, 'unread' | 'reviewNotice' | 'awaitingReview'>;

export function buildToday(input: TodayInput): TodayBase {
  const { today } = input;
  const start = weekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => weekDay(addDays(start, i), input));
  const d = parse(today);
  const doneToday = input.sessions.filter((s) => s.date === today);
  const entry = input.entries.find((e) => e.date === today);
  const planned = entry && !isSkipped(input, entry) && !pausedOn(input, today) ? input.workouts.get(entry.workoutId) : undefined;
  const state: TodayResponse['state'] = doneToday.length
    ? { kind: 'done', summary: { title: doneToday[0]!.title, ...(doneToday[0]!.id !== undefined && { sessionId: doneToday[0]!.id }), volumeKg: sessionVolume(doneToday.flatMap((s) => s.steps)), ...(sessionsMinutes(doneToday) !== undefined && { minutes: sessionsMinutes(doneToday) }) } }
    : planned
      ? { kind: 'workout', workout: workoutCard(planned, today, input.musclesOf) }
      : { kind: 'rest', next: nextWorkout(input) };
  return {
    dateLabel: `${WEEKDAYS_FULL[weekdayIndex(today)]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
    userName: input.userName,
    state,
    week,
    missed: missedBefore(input),
    streakWeeks: streakWeeks(today, input.entries, input.sessions, input.pauses),
    ...pauseOf(input),
  };
}

// ── База ──

/** Имя для показа: displayName, а если не задано, имя из почты. */
export function userNameOf(email: string, displayName?: string | null): string {
  if (displayName?.trim()) return displayName.trim();
  const local = email.split('@')[0] ?? '';
  return local ? local[0]!.toUpperCase() + local.slice(1) : email;
}

export function pausesOf(db: Db, userId: number): NonNullable<TodayInput['pauses']> {
  return (db.prepare('SELECT start_date, end_date FROM plan_pauses WHERE user_id = ?').all(userId) as Array<{ start_date: string; end_date: string }>).map((r) => ({ from: r.start_date, to: r.end_date }));
}

export function todayOf(db: Db, userId: number, today: string): TodayResponse {
  const user = db.prepare('SELECT email, display_name FROM users WHERE id = ?').get(userId) as { email: string; display_name: string | null } | undefined;
  const rows = db.prepare('SELECT id, title, blocks, structure FROM workouts WHERE user_id = ?').all(userId) as Array<{ id: number; title: string; blocks: string; structure: string | null }>;
  const workouts = new Map(rows.map((r) => [r.id, { id: r.id, title: r.title, blocks: JSON.parse(r.blocks) as CommitBlock[], structure: r.structure ? (JSON.parse(r.structure) as Block[]) : null }]));
  const entries = (db.prepare('SELECT date, workout_id FROM plan_entries WHERE user_id = ? ORDER BY date, workout_id').all(userId) as Array<{ date: string; workout_id: number }>).map((e) => ({ date: e.date, workoutId: e.workout_id }));
  const sessions = (db.prepare('SELECT id, workout_id, title, date, steps, duration_sec FROM sessions_done WHERE user_id = ? ORDER BY id').all(userId) as Array<{ id: number; workout_id: number | null; title: string; date: string; steps: string; duration_sec: number | null }>).map((s) => ({
    id: s.id,
    workoutId: s.workout_id,
    title: s.title,
    date: s.date,
    steps: JSON.parse(s.steps) as SessionStepResult[],
    durationSec: s.duration_sec,
  }));
  const library = new Map<string, string[]>();
  for (const e of db.prepare('SELECT name, aliases, muscles FROM exercises').all() as Array<{ name: string; aliases: string; muscles: string }>) {
    const muscles = JSON.parse(e.muscles) as string[];
    for (const n of [e.name, ...(JSON.parse(e.aliases) as string[])]) library.set(n.toLowerCase(), muscles);
  }
  const skips = new Set((db.prepare('SELECT date, workout_id FROM plan_skips WHERE user_id = ?').all(userId) as Array<{ date: string; workout_id: number }>).map((r) => `${r.date}:${r.workout_id}`));
  const pauses = pausesOf(db, userId);
  const base = buildToday({ today, userName: userNameOf(user?.email ?? '', user?.display_name), workouts, entries, sessions, skips, pauses, musclesOf: (n) => library.get(n.toLowerCase()) ?? [] });
  const reviewNotice = reviewNoticeOf(db, userId);
  const awaitingReview = awaitingReviewOf(db, userId, today);
  return { ...base, unread: unreadCount(db, userId), ...(reviewNotice && { reviewNotice }), ...(awaitingReview && { awaitingReview }) };
}
