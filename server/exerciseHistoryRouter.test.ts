import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseHistoryResponse } from '../shared/types';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { exercisesRouter } from './exercisesRouter';

let db: Db;
let server: Server;
let base: string;

beforeEach(async () => {
  db = openDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api', exercisesRouter(db));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(() => new Promise((resolve) => server.close(resolve)));

const cookieOf = async (email: string) => {
  const r = await login(db, email, 'trenirovka7');
  if (!r.ok) throw new Error('login');
  return `session=${r.token}`;
};
const steps = (name: string) => JSON.stringify([{ exerciseId: 'a', exerciseName: name, blockIndex: 0, round: 1, rounds: 1, kind: 'reps', plan: { target: { min: 10, max: 10 } }, actual: { value: 12 }, completed: true }]);
const timedSteps = (name: string) =>
  JSON.stringify([40, 50].map((sec, i) => ({ exerciseId: 'a', exerciseName: name, blockIndex: 0, round: i + 1, rounds: 2, kind: 'reps', plan: { target: { min: 10, max: 10 } }, actual: { value: 12 }, completed: true, startedAt: 1000, endedAt: 1000 + sec * 1000 })));
const done = (user: number, date: string, name: string) =>
  db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, 'Т', ?, 'x', ?, 0)").run(user, date, steps(name));

describe('GET /api/exercises/history', () => {
  it('без входа — 401', async () => {
    expect((await fetch(`${base}/exercises/history`)).status).toBe(401);
  });

  it('отдаёт историю только вошедшего и находит упражнения стартового набора', async () => {
    const me = await createUser(db, 'me@example.com', 'trenirovka7', 'athlete');
    const other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete');
    const cookie = await cookieOf('me@example.com');
    const list = (await (await fetch(`${base}/exercises`, { headers: { cookie } })).json()) as { exercises: Array<{ id: string; name: string; kind: string }> };
    const ex = list.exercises.find((e) => e.kind === 'reps')!;
    done(me, '2026-10-01', ex.name);
    done(other, '2026-10-02', ex.name);
    const body = (await (await fetch(`${base}/exercises/history`, { headers: { cookie } })).json()) as ExerciseHistoryResponse;
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({ id: ex.id, sessionsTotal: 1, record: { value: 12, date: '2026-10-01' }, trend: [12] });
  });

  it('отдаёт комментарии тренера к упражнениям, без ответов самого спортсмена и чужих', async () => {
    const me = await createUser(db, 'me@example.com', 'trenirovka7', 'athlete');
    const other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete');
    const coach = await createUser(db, 'coach@example.com', 'trenirovka7', 'trainer');
    const cookie = await cookieOf('me@example.com');
    const list = (await (await fetch(`${base}/exercises`, { headers: { cookie } })).json()) as { exercises: Array<{ id: string; name: string }> };
    const ex = list.exercises[0]!;
    const add = db.prepare("INSERT INTO comments (athlete_id, author_id, exercise_slug, exercise_name, text, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    add.run(me, coach, ex.id, ex.name, 'Колени наружу', '2026-10-01T10:00:00Z');
    add.run(me, coach, ex.id, ex.name, 'Спина прямая', '2026-10-05T10:00:00Z');
    add.run(me, me, ex.id, ex.name, 'Понял', '2026-10-06T10:00:00Z');
    add.run(other, coach, ex.id, ex.name, 'Чужое', '2026-10-07T10:00:00Z');
    const body = (await (await fetch(`${base}/exercises/history`, { headers: { cookie } })).json()) as ExerciseHistoryResponse;
    expect(body.comments[ex.id]?.map((c) => c.text)).toEqual(['Спина прямая', 'Колени наружу']);
  });

  it('отдаёт время подходов из меток; у итога без меток полей времени нет', async () => {
    const me = await createUser(db, 'timed@example.com', 'trenirovka7', 'athlete');
    const cookie = await cookieOf('timed@example.com');
    const list = (await (await fetch(`${base}/exercises`, { headers: { cookie } })).json()) as { exercises: Array<{ id: string; name: string; kind: string }> };
    const ex = list.exercises.find((e) => e.kind === 'reps')!;
    done(me, '2026-10-01', ex.name);
    db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, 'Т', '2026-10-02', 'x', ?, 0)").run(me, timedSteps(ex.name));
    const body = (await (await fetch(`${base}/exercises/history`, { headers: { cookie } })).json()) as ExerciseHistoryResponse;
    const h = body.history[0]!;
    expect(h.typicalSetSec).toBe(45);
    expect(h.sessions[0]).toMatchObject({ date: '2026-10-02', totalSec: 90, sets: [{ timeSec: 40 }, { timeSec: 50 }] });
    expect(h.sessions[1]).not.toHaveProperty('totalSec');
  });
});
