import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { addComment } from './comments';
import { openDb, type Db } from './db';
import { markReviewed } from './reviews';
import { listAthletes, setGoal } from './trainerAthletes';
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
    video(dmitry, (db.prepare("SELECT id FROM sessions_done WHERE user_id = ? AND date = '2026-10-10'").get(dmitry) as { id: number }).id, '22222222-2222-4222-8222-222222222222');
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
