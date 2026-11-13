import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { equipmentRouter } from './equipmentRouter';
import { createExercise } from './exercises';

let db: Db;
let server: Server;
let base: string;
const cookies: Record<string, string> = {};
const call = (method: string, role: string | null, body?: unknown) =>
  fetch(`${base}/equipment`, {
    method,
    headers: { 'content-type': 'application/json', ...(role ? { cookie: cookies[role]! } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(async () => {
  db = openDb(':memory:');
  for (const [role, email] of [['athlete', 'a@example.com'], ['trainer', 't@example.com'], ['admin', 'x@example.com']] as const) {
    await createUser(db, email, 'trenirovka7', role);
    const r = await login(db, email, 'trenirovka7');
    if (!r.ok) throw new Error('login');
    cookies[role] = `session=${r.token}`;
  }
  const app = express();
  app.use(express.json());
  app.use('/api', equipmentRouter(db));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('/api/equipment', () => {
  it('401 без входа, 403 спортсмену', async () => {
    expect((await call('GET', null)).status).toBe(401);
    expect((await call('GET', 'athlete')).status).toBe(403);
    expect((await call('POST', 'athlete', { name: 'Гриф' })).status).toBe(403);
  });

  it('тренер и админ добавляют; список по алфавиту', async () => {
    expect((await call('POST', 'trainer', { name: '  Штанга ' })).status).toBe(201);
    expect((await call('POST', 'admin', { name: 'Гриф' })).status).toBe(201);
    const body = await (await call('GET', 'trainer')).json();
    expect(body.equipment.map((e: { name: string }) => e.name)).toEqual(['Гриф', 'Штанга']);
  });

  it('дубликат без учёта регистра и ё даёт 409; пустое и длинное название 400', async () => {
    await call('POST', 'trainer', { name: 'Ёлка' });
    expect((await call('POST', 'trainer', { name: 'елка' })).status).toBe(409);
    expect((await call('POST', 'trainer', { name: '   ' })).status).toBe(400);
    expect((await call('POST', 'trainer', { name: 'я'.repeat(61) })).status).toBe(400);
    expect((await call('POST', 'trainer', {})).status).toBe(400);
  });

  it('пустой справочник наполняется инвентарём упражнений, считается использование', async () => {
    createExercise(db, { name: 'Жим', group: 'chest', kind: 'weight', muscles: [], aliases: [], equipment: ['Штанга', 'Скамья'] });
    createExercise(db, { name: 'Присед', group: 'legs', kind: 'weight', muscles: [], aliases: [], equipment: ['штанга'] });
    const body = await (await call('GET', 'trainer')).json();
    expect(body.equipment).toEqual([
      { id: expect.any(String), name: 'Скамья', exercises: 1 },
      { id: expect.any(String), name: 'Штанга', exercises: 2 },
    ]);
  });
});
