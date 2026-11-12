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
});
