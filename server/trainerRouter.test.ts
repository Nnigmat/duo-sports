import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { trainerRouter } from './trainerRouter';
import { linkAthlete } from './trainerLinks';

let db: Db;
let server: Server;
let base: string;
let nikita: number;
let coach: string;
let athlete: string;
let other: string;
const cookieOf = async (email: string) => {
  const r = await login(db, email, 'trenirovka7');
  if (!r.ok) throw new Error('login');
  return `session=${r.token}`;
};
const call = (path: string, cookie?: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, { ...init, headers: { ...(cookie ? { cookie } : {}), ...(init.body ? { 'content-type': 'application/json' } : {}) } });

beforeEach(async () => {
  db = openDb(':memory:');
  const trainer = await createUser(db, 'coach@example.com', 'trenirovka7', 'trainer');
  await createUser(db, 'coach2@example.com', 'trenirovka7', 'trainer');
  nikita = await createUser(db, 'nikita@example.com', 'trenirovka7', 'athlete');
  linkAthlete(db, trainer, nikita);
  coach = await cookieOf('coach@example.com');
  other = await cookieOf('coach2@example.com');
  athlete = await cookieOf('nikita@example.com');
  const app = express();
  app.use(express.json());
  app.use('/api', trainerRouter(db));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('GET /api/trainer/athletes', () => {
  it('401 без входа, 403 ученику, 400 без даты или с чужим фильтром', async () => {
    expect((await call('/trainer/athletes?date=2026-11-02')).status).toBe(401);
    expect((await call('/trainer/athletes?date=2026-11-02', athlete)).status).toBe(403);
    expect((await call('/trainer/athletes', coach)).status).toBe(400);
    expect((await call('/trainer/athletes?date=2026-11-02&filter=bad', coach)).status).toBe(400);
  });
  it('тренер получает своих учеников, чужой тренер пустой список', async () => {
    const mine = await (await call('/trainer/athletes?date=2026-11-02&filter=all&q=nik', coach)).json();
    expect(mine.athletes.map((a: { id: number }) => a.id)).toEqual([nikita]);
    expect((await (await call('/trainer/athletes?date=2026-11-02', other)).json()).athletes).toEqual([]);
  });
});

describe('PUT /api/trainer/athletes/:id/goal', () => {
  const put = (id: number | string, cookie: string, body: unknown) => call(`/trainer/athletes/${id}/goal`, cookie, { method: 'PUT', body: JSON.stringify(body) });
  it('204 своему ученику, 403 чужому тренеру, 404 неизвестному, 400 на кривое тело', async () => {
    expect((await put(nikita, coach, { goal: 'Сила' })).status).toBe(204);
    expect((await put(nikita, other, { goal: 'x' })).status).toBe(403);
    expect((await put(999, coach, { goal: 'x' })).status).toBe(404);
    expect((await put('abc', coach, { goal: 'x' })).status).toBe(404);
    expect((await put(nikita, coach, { goal: 5 })).status).toBe(400);
    expect((await put(nikita, coach, { goal: 'я'.repeat(81) })).status).toBe(400);
    expect(db.prepare('SELECT goal FROM users WHERE id = ?').get(nikita)).toEqual({ goal: 'Сила' });
  });
});

describe('карточка ученика', () => {
  let sid: number;
  let wid: number;
  beforeEach(() => {
    sid = Number(db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, 'Ноги', '2026-11-01', 'x', '[]', 0)").run(nikita).lastInsertRowid);
    wid = Number(db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, created_at) VALUES (?, 'Верх', '[]', '[{\"id\":\"b\",\"mode\":\"timed\",\"title\":\"Р\",\"exercises\":[]}]', 'x')").run(nikita).lastInsertRowid);
    db.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('squat', 'Присед', 'weight', 'legs', 'x')").run();
  });
  const post = (path: string, cookie: string, body?: unknown) => call(path, cookie, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });

  it('sessions: 400 без даты, 403 чужому тренеру, 200 своему', async () => {
    expect((await call(`/trainer/athletes/${nikita}/sessions`, coach)).status).toBe(400);
    expect((await call(`/trainer/athletes/${nikita}/sessions?date=2026-11-02`, other)).status).toBe(403);
    const ok = await call(`/trainer/athletes/${nikita}/sessions?date=2026-11-02`, coach);
    expect(ok.status).toBe(200);
    expect((await ok.json()).history.map((h: { sessionId: number }) => h.sessionId)).toEqual([sid]);
    expect((await call('/trainer/athletes/999/sessions?date=2026-11-02', coach)).status).toBe(404);
  });
  it('exercise-comments: нужен exercise, exclude — число', async () => {
    expect((await call(`/trainer/athletes/${nikita}/exercise-comments`, coach)).status).toBe(400);
    expect((await call(`/trainer/athletes/${nikita}/exercise-comments?exercise=Присед&exclude=x`, coach)).status).toBe(400);
    expect(await (await call(`/trainer/athletes/${nikita}/exercise-comments?exercise=${encodeURIComponent('Присед')}&exclude=${sid}`, coach)).json()).toEqual({ comments: [] });
    expect((await call(`/trainer/athletes/${nikita}/exercise-comments?exercise=x`, other)).status).toBe(403);
  });
  it('состав тренировки ученика: свой тренер видит, чужой нет, чужой id — 404', async () => {
    expect((await (await call(`/trainer/athletes/${nikita}/workouts/${wid}`, coach)).json()).title).toBe('Верх');
    expect((await call(`/trainer/athletes/${nikita}/workouts/${wid}`, other)).status).toBe(403);
    expect((await call(`/trainer/athletes/${nikita}/workouts/999`, coach)).status).toBe(404);
  });
  it('подсказка: 201, 400 на кривое, 403 чужому, 400 на неизвестное упражнение', async () => {
    const body = { workoutId: wid, exerciseId: 'squat', text: 'Пауза внизу' };
    expect((await post(`/trainer/athletes/${nikita}/hints`, coach, body)).status).toBe(201);
    expect((await post(`/trainer/athletes/${nikita}/hints`, coach, { ...body, text: '' })).status).toBe(400);
    expect((await post(`/trainer/athletes/${nikita}/hints`, other, body)).status).toBe(403);
    expect((await post(`/trainer/athletes/${nikita}/hints`, coach, { ...body, exerciseId: 'nope' })).status).toBe(400);
  });
  it('разобрана: 204 тренеру ученика (дважды), 403 чужому, 404 несуществующей', async () => {
    expect((await post(`/trainer/sessions/${sid}/reviewed`, other)).status).toBe(403);
    expect((await post(`/trainer/sessions/${sid}/reviewed`, coach)).status).toBe(204);
    expect((await post(`/trainer/sessions/${sid}/reviewed`, coach)).status).toBe(204);
    expect((await post('/trainer/sessions/999/reviewed', coach)).status).toBe(404);
    expect((await post(`/trainer/sessions/${sid}/reviewed`, athlete)).status).toBe(403);
    expect(db.prepare('SELECT COUNT(*) AS n FROM notifications').get()).toEqual({ n: 1 });
  });
});
