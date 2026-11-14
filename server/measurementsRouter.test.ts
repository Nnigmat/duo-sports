import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login } from './auth';
import { type Db, openDb } from './db';
import { measurementsRouter } from './measurementsRouter';
import { trainerRouter } from './trainerRouter';
import { linkAthlete } from './trainerLinks';

let db: Db;
let server: Server;
let base: string;
let nikita: number;
let masha: number;
let coach: string;
let stranger: string;
let admin: string;
let nikitaCookie: string;
let mashaCookie: string;

const today = () => new Date().toISOString().slice(0, 10);
const cookieOf = async (email: string) => {
  const r = await login(db, email, 'trenirovka7');
  if (!r.ok) throw new Error('login');
  return `session=${r.token}`;
};
const call = (path: string, cookie?: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, { ...init, headers: { ...(cookie ? { cookie } : {}), ...(init.body ? { 'content-type': 'application/json' } : {}) } });
const post = (path: string, cookie: string | undefined, body: unknown) => call(path, cookie, { method: 'POST', body: JSON.stringify(body) });

beforeEach(async () => {
  db = openDb(':memory:');
  const trainer = await createUser(db, 'coach@example.com', 'trenirovka7', 'trainer');
  await createUser(db, 'coach2@example.com', 'trenirovka7', 'trainer');
  await createUser(db, 'admin@example.com', 'trenirovka7', 'admin');
  nikita = await createUser(db, 'nikita@example.com', 'trenirovka7', 'athlete');
  masha = await createUser(db, 'masha@example.com', 'trenirovka7', 'athlete');
  linkAthlete(db, trainer, nikita);
  coach = await cookieOf('coach@example.com');
  stranger = await cookieOf('coach2@example.com');
  admin = await cookieOf('admin@example.com');
  nikitaCookie = await cookieOf('nikita@example.com');
  mashaCookie = await cookieOf('masha@example.com');
  const app = express();
  app.use(express.json());
  app.use('/api', measurementsRouter(db));
  app.use('/api', trainerRouter(db));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('/api/measurements', () => {
  it('401 без входа', async () => {
    expect((await call('/measurements')).status).toBe(401);
    expect((await post('/measurements', undefined, { date: today(), values: { weight: 72 } })).status).toBe(401);
  });

  it('ученик пишет и читает свои замеры', async () => {
    expect((await post('/measurements', nikitaCookie, { date: today(), values: { weight: 72 } })).status).toBe(204);
    const got = await (await call('/measurements', nikitaCookie)).json();
    expect(got).toEqual({ entries: [{ date: today(), values: { weight: 72 } }] });
  });

  it('повторный POST за день обновляет, а не падает', async () => {
    const body = { date: today(), values: { weight: 72 } };
    expect((await post('/measurements', nikitaCookie, body)).status).toBe(204);
    expect((await post('/measurements', nikitaCookie, { date: today(), values: { weight: 71.5 } })).status).toBe(204);
    expect((await (await call('/measurements', nikitaCookie)).json()).entries[0].values.weight).toBe(71.5);
  });

  it('плохое тело → 400 с error', async () => {
    for (const body of [{ date: today(), values: {} }, { date: today(), values: { weight: '72' } }, { date: 'x', values: { weight: 72 } }, [1]]) {
      const r = await post('/measurements', nikitaCookie, body);
      expect(r.status).toBe(400);
      expect(typeof (await r.json()).error).toBe('string');
    }
  });

  it('тело null отвергает express.json ещё до роутера: 400', async () => {
    expect((await post('/measurements', nikitaCookie, null)).status).toBe(400);
  });

  it('ученик не видит чужие замеры', async () => {
    await post('/measurements', nikitaCookie, { date: today(), values: { weight: 72 } });
    expect(await (await call('/measurements', mashaCookie)).json()).toEqual({ entries: [] });
  });
});

describe('GET /api/trainer/athletes/:id/measurements', () => {
  beforeEach(async () => {
    await post('/measurements', nikitaCookie, { date: today(), values: { weight: 72 } });
  });

  it('тренер со связью видит замеры ученика', async () => {
    const r = await call(`/trainer/athletes/${nikita}/measurements`, coach);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ entries: [{ date: today(), values: { weight: 72 } }] });
  });

  it('тренер без связи — 403, чужие данные не отдаются', async () => {
    const r = await call(`/trainer/athletes/${nikita}/measurements`, stranger);
    expect(r.status).toBe(403);
    expect(JSON.stringify(await r.json())).not.toContain('weight');
  });

  it('тренер без связи не видит и неприкреплённого ученика', async () => {
    expect((await call(`/trainer/athletes/${masha}/measurements`, coach)).status).toBe(403);
  });

  it('ученик на тренерском маршруте — 403, в том числе со своим id', async () => {
    expect((await call(`/trainer/athletes/${nikita}/measurements`, nikitaCookie)).status).toBe(403);
    expect((await call(`/trainer/athletes/${masha}/measurements`, nikitaCookie)).status).toBe(403);
  });

  it('нечисловой id — 404', async () => {
    expect((await call('/trainer/athletes/abc/measurements', coach)).status).toBe(404);
    expect((await call('/trainer/athletes/1.5/measurements', coach)).status).toBe(404);
  });

  it('админ видит замеры любого ученика', async () => {
    const r = await call(`/trainer/athletes/${nikita}/measurements`, admin);
    expect(r.status).toBe(200);
    expect((await r.json()).entries).toHaveLength(1);
  });

  it('401 без входа', async () => {
    expect((await call(`/trainer/athletes/${nikita}/measurements`)).status).toBe(401);
  });

  it('писать за ученика нельзя: POST — 404', async () => {
    const r = await post(`/trainer/athletes/${nikita}/measurements`, coach, { date: today(), values: { weight: 60 } });
    expect(r.status).toBe(404);
    expect((await (await call('/measurements', nikitaCookie)).json()).entries[0].values.weight).toBe(72);
  });
});
