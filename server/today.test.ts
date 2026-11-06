import { beforeEach, describe, expect, it } from 'vitest';
import type { CommitBlock, SessionStepResult } from '../shared/types';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { applyImport } from './imports';
import { pausePlan, skipEntry } from './schedule';
import { addDays, streakWeeks, todayOf, userNameOf, weekStart } from './today';
import { saveSession } from './workouts';

let db: Db;
let me: number;
let other: number;
const clock = () => new Date('2026-11-02T10:00:00Z');
const blocks = (n: number): CommitBlock[] => [
  { kind: 'warmup', heading: 'Разминка', items: [{ name: 'Суставная', value: '2 мин' }] },
  { kind: 'exercises', heading: 'Основа', items: Array.from({ length: n }, (_, i) => ({ name: `Упр ${i + 1}`, value: '4 × 8 · 75 кг' })) },
];
const step = (over: Partial<SessionStepResult> = {}): SessionStepResult => ({
  exerciseId: 'e1', exerciseName: 'Присед', blockIndex: 0, round: 1, rounds: 3, kind: 'weight',
  plan: { target: { min: 10, max: 10 }, weight: 60 }, completed: true, ...over,
});
/** Среда 4 ноября; неделя 2–8 ноября */
const TODAY = '2026-11-04';
const plan = (entries: Array<{ date: string; workout: number }>) =>
  applyImport(db, me, { exercises: [], workouts: [{ title: 'Верх', blocks: blocks(3) }, { title: 'Ноги', blocks: blocks(5) }], entries, replaceDates: [] }, clock);
const finish = (workoutId: number, date: string, steps = [step()], durationSec?: number) => saveSession(db, me, workoutId, { date, steps, videos: 0, durationSec }, clock);
const ids = () => (db.prepare('SELECT id FROM workouts WHERE user_id = ? ORDER BY id').all(me) as Array<{ id: number }>).map((w) => w.id);

beforeEach(async () => {
  db = openDb(':memory:');
  me = await createUser(db, 'nikita@example.com', 'trenirovka7', 'athlete', clock);
  other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete', clock);
});

describe('даты', () => {
  it('неделя начинается с понедельника', () => {
    expect(weekStart('2026-11-04')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
  });
  it('имя из почты', () => expect(userNameOf('nikita@example.com')).toBe('Nikita'));
  it('displayName важнее почты, пустой не считается', () => {
    expect(userNameOf('nikita@example.com', ' Никита ')).toBe('Никита');
    expect(userNameOf('nikita@example.com', '  ')).toBe('Nikita');
    expect(userNameOf('nikita@example.com', null)).toBe('Nikita');
  });
});

describe('todayOf: состояние дня', () => {
  it('без плана день отдыха без следующей тренировки', () => {
    const t = todayOf(db, me, TODAY);
    expect(t.state).toEqual({ kind: 'rest', next: null });
    expect(t.dateLabel).toBe('Среда, 4 ноября');
    expect(t.userName).toBe('Nikita');
    expect(t.streakWeeks).toBe(0);
    expect(t.week.map((d) => d.weekday)).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']);
    expect(t.week.every((d) => d.status === 'rest')).toBe(true);
    expect(t.week.map((d) => d.iso)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  });
  it('тренировка сегодня: карточка с упражнениями и оценкой', () => {
    plan([{ date: TODAY, workout: 1 }]);
    const s = todayOf(db, me, TODAY).state;
    expect(s.kind).toBe('workout');
    if (s.kind !== 'workout') return;
    expect(s.workout).toMatchObject({ title: 'Ноги', whenLabel: 'сегодня, ср 4 ноя', exerciseCount: 6, minutes: 40, modeLabel: '' });
    expect(s.workout.exercises).toEqual([
      { name: 'Упр 1', plan: '4 × 8 · 75 кг' }, { name: 'Упр 2', plan: '4 × 8 · 75 кг' }, { name: 'Упр 3', plan: '4 × 8 · 75 кг' }, { name: '+ ещё 2', plan: '' },
    ]);
  });
  it('мышцы берутся из библиотеки по названию', () => {
    plan([{ date: TODAY, workout: 0 }]);
    db.prepare("INSERT INTO exercises (slug, name, aliases, muscles, kind, group_id, created_at) VALUES ('u1', 'Приседание', '[\"упр 1\"]', '[\"Квадрицепс\"]', 'reps', 'legs', 'x')").run();
    const s = todayOf(db, me, TODAY).state;
    expect(s.kind === 'workout' && s.workout.muscles).toEqual(['Квадрицепс']);
  });
  it('после завершения — «сделано» с объёмом', () => {
    plan([{ date: TODAY, workout: 0 }]);
    finish(ids()[0]!, TODAY, [step(), step({ round: 2 }), step({ round: 3, completed: false })]);
    expect(todayOf(db, me, TODAY).state).toEqual({ kind: 'done', summary: { title: 'Верх', sessionId: expect.any(Number), volumeKg: 1200 } });
  });
  it('минуты из замера времени; без замера их нет', () => {
    plan([{ date: TODAY, workout: 0 }, { date: '2026-11-03', workout: 1 }]);
    finish(ids()[1]!, '2026-11-03', [step()], 2700);
    finish(ids()[0]!, TODAY);
    expect(todayOf(db, me, TODAY).state).toEqual({ kind: 'done', summary: { title: 'Верх', sessionId: expect.any(Number), volumeKg: 600 } });
    expect(todayOf(db, me, TODAY).week[1]!.meta).toBe('45 мин · 600 кг · 1 подход');
    finish(ids()[0]!, TODAY, [step()], 20);
    expect(todayOf(db, me, TODAY).state).toEqual({ kind: 'done', summary: { title: 'Верх', sessionId: expect.any(Number), volumeKg: 1200 } });
  });
  it('отдых показывает ближайшую тренировку', () => {
    plan([{ date: '2026-11-05', workout: 1 }, { date: '2026-11-07', workout: 0 }]);
    expect(todayOf(db, me, TODAY).state).toEqual({ kind: 'rest', next: { whenLabel: 'завтра', title: 'Ноги', minutes: 40 } });
    expect(todayOf(db, me, '2026-11-06').state).toMatchObject({ kind: 'rest', next: { whenLabel: 'завтра', title: 'Верх' } });
    expect(todayOf(db, me, '2026-11-02').state).toMatchObject({ kind: 'rest', next: { whenLabel: 'чт, 5 ноя' } });
  });
  it('чужие данные не видны', () => {
    plan([{ date: TODAY, workout: 0 }]);
    expect(todayOf(db, other, TODAY).state).toEqual({ kind: 'rest', next: null });
  });
});

describe('todayOf: пропущенное с прошлых недель', () => {
  it('невыполненные тренировки до этой недели, свежие первыми; выполненные и давние не попадают', () => {
    plan([
      { date: '2026-10-30', workout: 1 },
      { date: '2026-10-27', workout: 0 },
      { date: '2026-10-28', workout: 1 },
      { date: '2026-09-01', workout: 0 },
      { date: '2026-11-03', workout: 1 },
    ]);
    finish(ids()[1]!, '2026-10-28');
    const { missed } = todayOf(db, me, TODAY);
    expect(missed).toEqual([
      { iso: '2026-10-30', label: 'Пятница, 30 октября', title: 'Ноги' },
      { iso: '2026-10-27', label: 'Вторник, 27 октября', title: 'Верх' },
    ]);
  });
  it('без пропусков список пустой', () => {
    expect(todayOf(db, me, TODAY).missed).toEqual([]);
  });
});

describe('todayOf: пропуск', () => {
  it('пропущенная сегодня тренировка: день отдыха, в неделе «Пропущена» без кнопки', () => {
    plan([{ date: TODAY, workout: 0 }, { date: '2026-11-06', workout: 1 }]);
    skipEntry(db, me, TODAY);
    const t = todayOf(db, me, TODAY);
    expect(t.state).toMatchObject({ kind: 'rest', next: { title: 'Ноги' } });
    expect(t.week[2]).toMatchObject({ status: 'missed', meta: 'Пропущена' });
    expect(t.week[2]!.actionLabel).toBe('Вернуть');
  });
  it('пропущенное с прошлых недель уходит из списка «Пропущено»', () => {
    plan([{ date: '2026-10-30', workout: 1 }, { date: '2026-10-27', workout: 0 }]);
    skipEntry(db, me, '2026-10-30');
    expect(todayOf(db, me, TODAY).missed.map((m) => m.iso)).toEqual(['2026-10-27']);
  });
});

describe('todayOf: пропуск и серия', () => {
  it('пропущенная нарочно тренировка закрытой недели обрывает серию, выполненная — нет', () => {
    plan([{ date: '2026-10-26', workout: 0 }, { date: '2026-10-28', workout: 1 }]);
    finish(ids()[0]!, '2026-10-26');
    expect(todayOf(db, me, TODAY).streakWeeks).toBe(0);
    finish(ids()[1]!, '2026-10-28');
    expect(todayOf(db, me, TODAY).streakWeeks).toBe(1);
  });
  it('с пропуском вместо выполнения серия остаётся нулевой', () => {
    plan([{ date: '2026-10-26', workout: 0 }, { date: '2026-10-28', workout: 1 }]);
    finish(ids()[0]!, '2026-10-26');
    skipEntry(db, me, '2026-10-28');
    expect(todayOf(db, me, TODAY).streakWeeks).toBe(0);
  });
});

describe('todayOf: неделя', () => {
  it('статусы: выполнена, пропущена, сегодня, впереди, отдых', () => {
    plan([{ date: '2026-11-02', workout: 0 }, { date: '2026-11-03', workout: 1 }, { date: TODAY, workout: 0 }, { date: '2026-11-06', workout: 1 }]);
    finish(ids()[0]!, '2026-11-02', [step(), step({ round: 2, kind: 'reps', plan: { target: { min: 12, max: 12 } } })]);
    const w = todayOf(db, me, TODAY).week;
    expect(w.map((d) => d.status)).toEqual(['done', 'missed', 'planned', 'rest', 'planned', 'rest', 'rest']);
    expect(w[0]).toMatchObject({ title: 'Верх', meta: '600 кг · 2 подхода', actionLabel: 'Итоги', fullLabel: 'Понедельник, 2 ноября' });
    expect(w[1]).toMatchObject({ meta: 'Пропущена', caption: 'Ноги' });
    expect(w[1]!.actionLabel).toBe('Перенести');
    expect(w[2]).toMatchObject({ today: true, actionLabel: 'Начать', fullLabel: 'Сегодня, 4 ноября', meta: '4 упражнения · ≈ 30 мин' });
    expect(w[4]).toMatchObject({ actionLabel: 'Перенести' });
  });
  it('тренировка не по плану тоже отмечает день выполненным', () => {
    finish(plan([]) && ids()[0]!, '2026-11-03');
    expect(todayOf(db, me, TODAY).week[1]!.status).toBe('done');
  });
});

describe('серия недель', () => {
  const e = (date: string, workoutId = 1) => ({ date, workoutId });
  const s = (date: string, workoutId = 1) => ({ workoutId, title: 'x', date, steps: [] });
  it('без плана — ноль', () => expect(streakWeeks(TODAY, [], [])).toBe(0));
  it('идущая неделя серию не обрывает, закрытая засчитывается', () => {
    const entries = [e('2026-10-26'), e('2026-10-28'), e('2026-11-02'), e('2026-11-06')];
    const done = [s('2026-10-26'), s('2026-10-28')];
    expect(streakWeeks(TODAY, entries, done)).toBe(1);
    expect(streakWeeks(TODAY, entries, [...done, s('2026-11-02'), s('2026-11-06')])).toBe(2);
  });
  it('пропущенный день обрывает серию, пустая неделя тоже', () => {
    const entries = [e('2026-10-19'), e('2026-10-26'), e('2026-10-28')];
    expect(streakWeeks(TODAY, entries, [s('2026-10-19'), s('2026-10-26')])).toBe(0);
    expect(streakWeeks(TODAY, [e('2026-10-12'), e('2026-10-26')], [s('2026-10-12'), s('2026-10-26')])).toBe(1);
  });
});

describe('todayOf: пауза', () => {
  it('день на паузе — отдых, тренировка не «следующая» и не «пропущенная»; после паузы план возвращается', () => {
    plan([{ date: '2026-10-30', workout: 1 }, { date: TODAY, workout: 0 }, { date: '2026-11-06', workout: 1 }, { date: '2026-11-10', workout: 0 }]);
    pausePlan(db, me, '2026-10-30', '2026-11-08', clock);
    const t = todayOf(db, me, TODAY);
    expect(t.state).toEqual({ kind: 'rest', next: { whenLabel: 'вт, 10 ноя', title: 'Верх', minutes: 30 } });
    expect(t.missed).toEqual([]);
    expect(t.week[2]).toMatchObject({ status: 'rest', meta: 'План на паузе' });
    expect(t.week[2]!.actionLabel).toBeUndefined();
    expect(t.pause).toEqual({ from: '2026-10-30', to: '2026-11-08', label: 'до 8 ноября' });
    expect(todayOf(db, me, '2026-11-09').pause).toBeUndefined();
  });
  it('без паузы поля pause нет', () => expect(todayOf(db, me, TODAY).pause).toBeUndefined());
  it('недели с паузой серию не обрывают и не засчитываются', () => {
    const e = (date: string) => ({ date, workoutId: 1 });
    const done = [{ workoutId: 1, title: 'x', date: '2026-10-19', steps: [] }, { workoutId: 1, title: 'x', date: '2026-11-02', steps: [] }];
    const entries = [e('2026-10-19'), e('2026-10-27'), e('2026-11-02')];
    expect(streakWeeks('2026-11-04', entries, done)).toBe(1);
    expect(streakWeeks('2026-11-04', entries, done, [{ from: '2026-10-26', to: '2026-11-01' }])).toBe(2);
  });
});

describe('todayOf: разбор тренера', () => {
  it('без разборов: счётчик 0, карточки и строки ожидания нет', () => {
    const t = todayOf(db, me, TODAY);
    expect(t.unread).toBe(0);
    expect(t).not.toHaveProperty('reviewNotice');
    expect(t).not.toHaveProperty('awaitingReview');
  });
  it('видео отправлены, разбора нет — строка ожидания; после разбора — карточка и точка', async () => {
    const coach = await createUser(db, 'coach@example.com', 'trenirovka7', 'trainer', clock);
    const sid = Number(db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, 'Всё тело', '2026-11-03', 'x', '[]', 1)").run(me).lastInsertRowid);
    db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, session_id, step_index, created_at) VALUES ('11111111-1111-4111-8111-111111111111', ?, 'x', 5, ?, 0, 'x')").run(me, sid);
    expect(todayOf(db, me, TODAY).awaitingReview).toEqual({ sessionId: sid, title: 'Всё тело', whenLabel: 'вчера', videos: 1 });
    const { linkAthlete } = await import('./trainerLinks');
    const { markReviewed } = await import('./reviews');
    linkAthlete(db, coach, me);
    markReviewed(db, { id: coach, role: 'trainer' }, sid, clock);
    const t = todayOf(db, me, TODAY);
    expect(t).not.toHaveProperty('awaitingReview');
    expect(t.unread).toBe(1);
    expect(t.reviewNotice).toMatchObject({ sessionId: sid, title: 'Всё тело', commentCount: 0 });
  });
});
