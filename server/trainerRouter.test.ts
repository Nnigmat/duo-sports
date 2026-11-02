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
