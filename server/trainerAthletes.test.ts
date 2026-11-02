import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { addComment } from './comments';
import { openDb, type Db } from './db';
import { markReviewed } from './reviews';
import type { Role } from '../shared/types';
import { moveEntry } from './schedule';
import { exerciseCommentsOf, listAthletes, progressOf, sessionsOf, setGoal } from './trainerAthletes';
import { linkAthlete } from './trainerLinks';

let db: Db;
let trainer: number;
let otherTrainer: number;
let admin: number;
let nikita: number;
let alexey: number;
let dmitry: number;
const TODAY = '2026-11-02';
const V = '11111111-1111-4111-8111-111111111111';
const V2 = '22222222-2222-4222-8222-222222222222';
const T = () => ({ id: trainer, role: 'trainer' as const });

const session = (user: number, date: string, title = 'Всё тело') =>
  Number(db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, ?, ?, 'x', '[]', 0)").run(user, title, date).lastInsertRowid);
const video = (user: number, sid: number, id = V) =>
  db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, session_id, step_index, created_at) VALUES (?, ?, 'x', 5, ?, 0, 'x')").run(id, user, sid);
const workout = (user: number) => Number(db.prepare("INSERT INTO workouts (user_id, title, blocks, created_at) VALUES (?, 'Т', '[]', 'x')").run(user).lastInsertRowid);
const planned = (user: number, date: string) => db.prepare('INSERT INTO plan_entries (user_id, date, workout_id) VALUES (?, ?, ?)').run(user, date, workout(user));

beforeEach(async () => {
  db = openDb(':memory:');
  trainer = await createUser(db, 'coach@example.com', 'trenirovka7', 'trainer', () => new Date('2026-01-01'));
  otherTrainer = await createUser(db, 'coach2@example.com', 'trenirovka7', 'trainer', () => new Date('2026-01-01'));
  admin = await createUser(db, 'admin@example.com', 'trenirovka7', 'admin', () => new Date('2026-01-01'));
  nikita = await createUser(db, 'nikita@example.com', 'trenirovka7', 'athlete', () => new Date('2026-01-01'));
  alexey = await createUser(db, 'alexey@example.com', 'trenirovka7', 'athlete', () => new Date('2026-01-01'));
  dmitry = await createUser(db, 'dmitry@example.com', 'trenirovka7', 'athlete', () => new Date('2026-01-01'));
  for (const a of [nikita, alexey, dmitry]) linkAthlete(db, trainer, a);
  // Никита: вчера с видео без разбора. Алексей: последняя тренировка 10 дней назад. Дмитрий: ходит по плану.
  video(nikita, session(nikita, '2026-11-01'));
  session(alexey, '2026-10-23');
  session(dmitry, '2026-10-31', 'Спина');
  session(dmitry, '2026-10-29');
  planned(nikita, '2026-11-01');
  planned(alexey, '2026-10-28');
  planned(alexey, '2026-10-30');
  planned(dmitry, '2026-10-31');
  planned(dmitry, '2026-10-29');
});

const list = (opts: { filter?: 'all' | 'review' | 'inactive' | 'ok'; q?: string } = {}, viewer: { id: number; role: 'trainer' | 'admin' | 'athlete' } = T()) => {
  const r = listAthletes(db, viewer, { today: TODAY, ...opts });
  if (!r.ok) throw new Error(r.error);
  return r.list;
};

describe('listAthletes', () => {
  it('статусы: разбор, пропадают, по плану', () => {
    const byName = Object.fromEntries(list().athletes.map((a) => [a.name, a]));
    expect(byName.Nikita).toMatchObject({ status: 'review', waitingSessions: 1, waitingVideos: 1, done7: 1, planned7: 1, lastSession: { date: '2026-11-01', title: 'Всё тело' }, daysSinceLast: 1 });
    expect(byName.Alexey).toMatchObject({ status: 'inactive', done7: 0, planned7: 2, daysSinceLast: 10 });
    expect(byName.Dmitry).toMatchObject({ status: 'ok', done7: 2, planned7: 2, lastSession: { date: '2026-10-31', title: 'Спина' } });
  });
  it('счётчики фильтров не зависят от выбранного фильтра и поиска', () => {
    const expected = { all: 3, review: 1, inactive: 1, ok: 1 };
    expect(list().counts).toEqual(expected);
    expect(list({ filter: 'review', q: 'zzz' }).counts).toEqual(expected);
  });
  it('фильтр и поиск по имени и почте', () => {
    expect(list({ filter: 'inactive' }).athletes.map((a) => a.name)).toEqual(['Alexey']);
    expect(list({ q: 'DMIT' }).athletes.map((a) => a.name)).toEqual(['Dmitry']);
    expect(list({ q: 'example.com', filter: 'ok' }).athletes.map((a) => a.name)).toEqual(['Dmitry']);
    expect(list({ q: 'нет такого' }).athletes).toEqual([]);
  });
  it('порядок: ждут разбора, потом пропадают, потом по плану', () => {
    expect(list().athletes.map((a) => a.status)).toEqual(['review', 'inactive', 'ok']);
  });
  it('разобранная тренировка больше не ждёт', () => {
    const sid = (db.prepare('SELECT id FROM sessions_done WHERE user_id = ?').get(nikita) as { id: number }).id;
    markReviewed(db, T(), sid);
    expect(list().athletes.find((a) => a.name === 'Nikita')).toMatchObject({ status: 'ok', waitingSessions: 0 });
  });
  it('без видео ждёт, только если ученик что-то написал', () => {
    const sid = session(dmitry, '2026-11-02');
    expect(list().athletes.find((a) => a.name === 'Dmitry')!.status).toBe('ok');
    addComment(db, { id: dmitry, role: 'athlete' }, dmitry, { sessionId: sid, text: 'Плохо спал' });
    expect(list().athletes.find((a) => a.name === 'Dmitry')).toMatchObject({ status: 'review', waitingSessions: 1, waitingVideos: 0 });
  });
  it('старше двух недель в ожидание не попадает', () => {
    session(dmitry, '2026-10-10');
    video(dmitry, (db.prepare("SELECT id FROM sessions_done WHERE user_id = ? AND date = '2026-10-10'").get(dmitry) as { id: number }).id, V2);
    expect(list().athletes.find((a) => a.name === 'Dmitry')!.waitingSessions).toBe(0);
  });
  it('новый ученик без тренировок не «пропадает» в первую неделю', async () => {
    const fresh = await createUser(db, 'new@example.com', 'trenirovka7', 'athlete', () => new Date('2026-10-30'));
    linkAthlete(db, trainer, fresh);
    expect(list().athletes.find((a) => a.name === 'New')).toMatchObject({ status: 'ok', lastSession: null, daysSinceLast: null });
    const old = await createUser(db, 'old@example.com', 'trenirovka7', 'athlete', () => new Date('2026-10-01'));
    linkAthlete(db, trainer, old);
    expect(list().athletes.find((a) => a.name === 'Old')!.status).toBe('inactive');
  });
  it('тренер видит только своих, админ всех, ученику нельзя', () => {
    expect(list({}, { id: otherTrainer, role: 'trainer' }).athletes).toEqual([]);
    expect(list({}, { id: admin, role: 'admin' }).athletes).toHaveLength(3);
    expect(listAthletes(db, { id: nikita, role: 'athlete' }, { today: TODAY })).toEqual({ ok: false, error: 'forbidden' });
  });
});

describe('setGoal', () => {
  it('тренер своему ученику; пустая строка очищает; чужой и ученик — нет', () => {
    expect(setGoal(db, T(), nikita, ' Сила ')).toEqual({ ok: true });
    expect(list().athletes.find((a) => a.id === nikita)!.goal).toBe('Сила');
    setGoal(db, T(), nikita, '  ');
    expect(list().athletes.find((a) => a.id === nikita)!.goal).toBeNull();
    expect(setGoal(db, { id: otherTrainer, role: 'trainer' }, nikita, 'x')).toEqual({ ok: false, error: 'forbidden' });
    expect(setGoal(db, { id: nikita, role: 'athlete' }, nikita, 'x')).toEqual({ ok: false, error: 'forbidden' });
    expect(setGoal(db, T(), 999, 'x')).toEqual({ ok: false, error: 'not_found' });
    expect(setGoal(db, T(), nikita, 'я'.repeat(81))).toEqual({ ok: false, error: 'too_long' });
  });
});

describe('sessionsOf: вкладка «Тренировки»', () => {
  const blocks = JSON.stringify([{ kind: 'exercises', heading: 'Основа', items: [{ name: 'Присед', value: '4 × 5' }, { name: 'Тяга', value: '3 × 10' }] }]);
  const wk = (title: string) => Number(db.prepare('INSERT INTO workouts (user_id, title, blocks, created_at) VALUES (?, ?, ?, ?)').run(nikita, title, blocks, 'x').lastInsertRowid);
  const entry = (date: string, w: number) => db.prepare('INSERT INTO plan_entries (user_id, date, workout_id) VALUES (?, ?, ?)').run(nikita, date, w);
  const view = (viewer: { id: number; role: Role } = T()) => {
    const r = sessionsOf(db, viewer, nikita, TODAY);
    if (!r.ok) throw new Error(r.error);
    return r.sessions;
  };
  it('запланированные с сегодня по порядку, выполненные и прошлые не в плане', () => {
    const legs = wk('Ноги');
    const upper = wk('Верх');
    entry('2026-11-05', legs);
    entry('2026-11-02', upper);
    entry('2026-10-20', upper);
    expect(view().planned.map((p) => [p.date, p.title, p.kind, p.exerciseCount])).toEqual([['2026-11-02', 'Верх', 'planned', 2], ['2026-11-05', 'Ноги', 'planned', 2]]);
  });
  it('перенос: на старом дне «перенесена», на новом «со дня»', () => {
    const cardio = wk('Кардио');
    entry('2026-11-04', cardio);
    moveEntry(db, nikita, TODAY, '2026-11-04', '2026-11-06');
    expect(view().planned).toEqual([
      { kind: 'moved', date: '2026-11-04', workoutId: cardio, title: 'Кардио', exerciseCount: 2, movedTo: '2026-11-06' },
      { kind: 'planned', date: '2026-11-06', workoutId: cardio, title: 'Кардио', exerciseCount: 2, movedFrom: '2026-11-04' },
    ]);
  });
  it('история: свежие первыми, с видео, разбором и новыми ответами ученика', () => {
    const sid = (db.prepare('SELECT id FROM sessions_done WHERE user_id = ?').get(nikita) as { id: number }).id;
    addComment(db, { id: nikita, role: 'athlete' }, nikita, { sessionId: sid, text: 'Плохо спал' });
    const older = session(nikita, '2026-10-26', 'Верх тела');
    markReviewed(db, T(), older, () => new Date('2026-10-27T10:00:00Z'));
    const h = view().history;
    expect(h.map((x) => [x.title, x.videos, x.reviewedAt, x.newFromAthlete])).toEqual([['Всё тело', 1, null, 1], ['Верх тела', 0, '2026-10-27T10:00:00.000Z', 0]]);
  });
  it('история помнит, откуда перенесена тренировка', () => {
    const w = wk('Ноги');
    entry('2026-10-29', w);
    moveEntry(db, nikita, '2026-10-28', '2026-10-29', '2026-10-31');
    db.prepare("INSERT INTO sessions_done (user_id, workout_id, title, date, finished_at, steps, videos) VALUES (?, ?, 'Ноги', '2026-10-31', 'x', '[]', 0)").run(nikita, w);
    expect(view().history.find((x) => x.date === '2026-10-31')!.movedFrom).toBe('2026-10-29');
  });
  it('доступ только тренеру ученика', () => {
    expect(sessionsOf(db, { id: otherTrainer, role: 'trainer' }, nikita, TODAY)).toEqual({ ok: false, error: 'forbidden' });
    expect(sessionsOf(db, { id: nikita, role: 'athlete' }, nikita, TODAY)).toEqual({ ok: false, error: 'forbidden' });
    expect(sessionsOf(db, T(), 999, TODAY)).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('exerciseCommentsOf: прошлые комментарии по упражнению', () => {
  beforeEach(() => {
    db.prepare("INSERT INTO exercises (slug, name, aliases, kind, group_id, created_at) VALUES ('deadlift', 'Становая тяга', '[\"тяга\"]', 'weight', 'back', 'x')").run();
  });
  it('комментарии тренера по упражнению, свежие первыми, с датой тренировки; ответы ученика и чужие не в счёт', () => {
    const a = session(nikita, '2026-10-24');
    video(nikita, a, V2);
    const at = (iso: string) => () => new Date(iso);
    addComment(db, T(), nikita, { exerciseId: 'deadlift', text: 'Спина ровная' }, at('2026-10-12T10:00:00Z'));
    addComment(db, T(), nikita, { videoId: V2, timecodeSec: 12, exerciseId: 'deadlift', text: 'Гриф уходит вперёд' }, at('2026-10-25T10:00:00Z'));
    addComment(db, { id: nikita, role: 'athlete' }, nikita, { exerciseId: 'deadlift', text: 'Понял' }, at('2026-10-26T10:00:00Z'));
    addComment(db, T(), alexey, { exerciseId: 'deadlift', text: 'Чужому ученику' }, at('2026-10-27T10:00:00Z'));
    const r = exerciseCommentsOf(db, T(), nikita, 'становая ТЯГА');
    if (!r.ok) throw new Error(r.error);
    expect(r.comments.map((c) => [c.date, c.timecodeSec, c.text])).toEqual([['2026-10-24', 12, 'Гриф уходит вперёд'], ['2026-10-12', null, 'Спина ровная']]);
  });
  it('exclude убирает комментарии выбранной тренировки; чужой тренер — нет', () => {
    const a = session(nikita, '2026-10-24');
    video(nikita, a, V2);
    addComment(db, T(), nikita, { videoId: V2, timecodeSec: 12, exerciseId: 'deadlift', text: 'Гриф' });
    const r = exerciseCommentsOf(db, T(), nikita, 'Становая тяга', a);
    expect(r).toEqual({ ok: true, comments: [] });
    expect(exerciseCommentsOf(db, { id: otherTrainer, role: 'trainer' }, nikita, 'Становая тяга')).toEqual({ ok: false, error: 'forbidden' });
  });
});

describe('progressOf', () => {
  it('регулярность за 28 дней, объём по неделям, рекорды', () => {
    const step = (name: string, weight: number) => JSON.stringify([{ exerciseId: name, exerciseName: name, blockIndex: 0, round: 1, rounds: 1, kind: 'weight', plan: { target: { min: 5, max: 5 }, weight }, completed: true }]);
    db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps) VALUES (?, 'А', '2026-10-20', 'x', ?), (?, 'Б', '2026-10-30', 'x', ?), (?, 'В', '2026-09-01', 'x', ?)").run(nikita, step('Присед', 70), nikita, step('Присед', 80), nikita, step('Присед', 60));
    planned(nikita, '2026-10-20');
    planned(nikita, '2026-10-25');
    const r = progressOf(db, T(), nikita, TODAY);
    if (!r.ok) throw new Error(r.error);
    // фикстура добавляет Никите тренировку и запись плана на 2026-11-01
    expect(r.progress.regularity).toEqual({ done: 3, planned: 3 });
    expect(r.progress.volume).toHaveLength(8);
    // 2 ноября — понедельник: текущая неделя пуста, тренировка 30 октября в предыдущей
    expect(r.progress.volume.slice(-2)).toEqual([{ weekStart: '2026-10-26', tons: 0.4 }, { weekStart: '2026-11-02', tons: 0 }]);
    expect(r.progress.records).toEqual([{ exerciseName: 'Присед', label: '80\u00a0кг × 5', date: '2026-10-30' }]);
    expect(r.progress.recordsMonth).toBe(2);
  });
  it('чужой тренер и ученик не видят', () => {
    expect(progressOf(db, { id: otherTrainer, role: 'trainer' }, nikita, TODAY)).toEqual({ ok: false, error: 'forbidden' });
    expect(progressOf(db, { id: nikita, role: 'athlete' }, nikita, TODAY)).toEqual({ ok: false, error: 'forbidden' });
    expect(progressOf(db, T(), 999, TODAY)).toEqual({ ok: false, error: 'not_found' });
  });
});
