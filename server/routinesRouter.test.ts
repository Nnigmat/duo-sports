import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseInput, RoutineInput } from '../shared/types';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { createExercise } from './exercises';
import { routinesRouter } from './routinesRouter';

let db: Db;
let server: Server;
let base: string;
const cookies: Record<string, string> = {};
const cookieOf = async (email: string) => {
  const r = await login(db, email, 'trenirovka7');
  if (!r.ok) throw new Error('login');
  return `session=${r.token}`;
};
const call = (method: string, role: string | null, path = '', body?: unknown) =>
  fetch(`${base}/routines${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(role ? { cookie: cookies[role]! } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const ex = (name: string, kind: ExerciseInput['kind'] = 'time') => {
  const r = createExercise(db, { name, group: 'core', kind, muscles: [], aliases: [] });
  if (!r.ok) throw new Error('exercise');
  return r.entry.id;
};
let neck: string;
const body = (over: Partial<RoutineInput> = {}): RoutineInput => ({
  kind: 'warmup',
  title: 'Ноги лёгкая',
  items: [{ exercise: neck, sec: { min: 30, max: 30 } }],
  ...over,
});

beforeEach(async () => {
  db = openDb(':memory:');
  await createUser(db, 'a@example.com', 'trenirovka7', 'athlete');
  await createUser(db, 't@example.com', 'trenirovka7', 'trainer');
  cookies.athlete = await cookieOf('a@example.com');
  cookies.trainer = await cookieOf('t@example.com');
  neck = ex('Шея');
  const app = express();
  app.use(express.json());
  app.use('/api', routinesRouter(db));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('/api/routines', () => {
  it('401 без входа; athlete читает, но не пишет', async () => {
    expect((await call('GET', null)).status).toBe(401);
    expect((await call('GET', 'athlete')).status).toBe(200);
    const r = await call('POST', 'athlete', '', body());
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: 'Разминки меняют тренер и админ' });
    expect((await call('PUT', 'athlete', '/x', body())).status).toBe(403);
    expect((await call('DELETE', 'athlete', '/x')).status).toBe(403);
  });

  it('trainer создаёт, список даёт itemCount, totalSec, usedIn; kind фильтрует', async () => {
    const c = await call('POST', 'trainer', '', body());
    expect(c.status).toBe(201);
    expect(await c.json()).toMatchObject({ id: 'nogi-legkaya', totalSec: 30 });
    await call('POST', 'trainer', '', body({ kind: 'cooldown', title: 'Растяжка' }));
    const all = await (await call('GET', 'athlete')).json();
    expect(all.routines).toHaveLength(2);
    expect(all.routines[0]).toEqual({ id: 'nogi-legkaya', kind: 'warmup', title: 'Ноги лёгкая', itemCount: 1, totalSec: 30, usedIn: 0 });
    const cd = await (await call('GET', 'athlete', '?kind=cooldown')).json();
    expect(cd.routines.map((r: { id: string }) => r.id)).toEqual(['rastyazhka']);
    expect((await call('GET', 'athlete', '?kind=main')).status).toBe(400);
  });

  it('карточка и 404', async () => {
    await call('POST', 'trainer', '', body());
    const d = await (await call('GET', 'athlete', '/nogi-legkaya')).json();
    expect(d).toMatchObject({ id: 'nogi-legkaya', usedIn: 0, usedBy: [] });
    const nf = await call('GET', 'athlete', '/net');
    expect(nf.status).toBe(404);
    expect(await nf.json()).toEqual({ error: 'Разминка не найдена' });
  });

  it('POST: не time → 400 с текстом, неизвестное → 400, пустое → 400, дубль → 409', async () => {
    const w = ex('Жим', 'weight');
    const r = await call('POST', 'trainer', '', body({ items: [{ exercise: w, sec: { min: 10, max: 10 } }] }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/time/);
    expect((await call('POST', 'trainer', '', body({ items: [{ exercise: 'nope', sec: { min: 10, max: 10 } }] }))).status).toBe(400);
    expect((await call('POST', 'trainer', '', body({ items: [] }))).status).toBe(400);
    await call('POST', 'trainer', '', body());
    expect((await call('POST', 'trainer', '', body())).status).toBe(409);
  });

  it('PUT меняет и даёт 404 и 409', async () => {
    await call('POST', 'trainer', '', body());
    await call('POST', 'trainer', '', body({ title: 'Вторая' }));
    const u = await call('PUT', 'trainer', '/nogi-legkaya', body({ title: 'Новое' }));
    expect(u.status).toBe(200);
    expect(await u.json()).toMatchObject({ id: 'nogi-legkaya', title: 'Новое' });
    expect((await call('PUT', 'trainer', '/net', body())).status).toBe(404);
    expect((await call('PUT', 'trainer', '/nogi-legkaya', body({ title: 'Вторая' }))).status).toBe(409);
  });

  it('DELETE: 204, 404, 409 со списком тренировок', async () => {
    await call('POST', 'trainer', '', body());
    await call('POST', 'trainer', '', body({ title: 'Занятая' }));
    const uid = (db.prepare("SELECT id FROM users WHERE email = 'a@example.com'").get() as { id: number }).id;
    const rid = (db.prepare("SELECT id FROM routines WHERE slug = 'zanyataya'").get() as { id: number }).id;
    const wid = Number(db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, warmup_routine_id, created_at) VALUES (?, 'Ноги', '[]', '[]', ?, 'z')").run(uid, rid).lastInsertRowid);
    const busy = await call('DELETE', 'trainer', '/zanyataya');
    expect(busy.status).toBe(409);
    const j = await busy.json();
    expect(j.workouts).toEqual([{ workoutId: wid, title: 'Ноги' }]);
    expect(typeof j.error).toBe('string');
    expect((await call('DELETE', 'trainer', '/nogi-legkaya')).status).toBe(204);
    expect((await call('DELETE', 'trainer', '/nogi-legkaya')).status).toBe(404);
  });
});
