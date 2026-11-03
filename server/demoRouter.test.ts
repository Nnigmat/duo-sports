import express from 'express';
import fs from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login } from './auth';
import { demoRouter } from './demoRouter';
import { openDb, type Db } from './db';
import { exercisesRouter } from './exercisesRouter';

let dir: string;
let db: Db;
let server: Server;
let base: string;
const cookies: Record<string, string> = {};

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-'));
  db = openDb(':memory:');
  for (const role of ['athlete', 'trainer', 'admin'] as const) {
    await createUser(db, `${role}@x.ru`, 'password-123456', role);
    const r = await login(db, `${role}@x.ru`, 'password-123456');
    if (r.ok) cookies[role] = `session=${r.token}`;
  }
  db.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('plank', 'Планка', 'time', 'core', 'z')").run();
  const app = express();
  app.use(express.json());
  app.use('/api', demoRouter({ db, dir, maxBytes: 1024 }));
  app.use('/api', exercisesRouter(db, dir));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

const put = (role: string | null, gender: string, body: BodyInit | null, type: string | null = 'video/mp4', id = 'plank') =>
  fetch(`${base}/exercises/${id}/demo/${gender}`, {
    method: 'PUT',
    body,
    headers: { ...(role ? { cookie: cookies[role]! } : {}), ...(type ? { 'content-type': type } : {}) },
  });
const del = (role: string, gender: string, id = 'plank') =>
  fetch(`${base}/exercises/${id}/demo/${gender}`, { method: 'DELETE', headers: { cookie: cookies[role]! } });
const files = () => fs.readdirSync(dir);
const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

describe('PUT /api/exercises/:id/demo/:gender', () => {
  it('тренер загружает ролик: файл на диске, поле в ответе', async () => {
    const res = await put('trainer', 'female', bytes);
    expect(res.status).toBe(200);
    const entry = await res.json();
    expect(entry.demo.female).toMatch(/^[0-9a-f-]{36}\.mp4$/);
    expect(new Uint8Array(fs.readFileSync(path.join(dir, entry.demo.female)))).toEqual(bytes);
  });
  it('спортсмену 403, без входа 401, неизвестное упражнение 404, неверный пол 400', async () => {
    expect((await put('athlete', 'female', bytes)).status).toBe(403);
    expect((await put(null, 'female', bytes)).status).toBe(401);
    expect((await put('trainer', 'female', bytes, 'video/mp4', 'net')).status).toBe(404);
    expect((await put('trainer', 'other', bytes)).status).toBe(400);
    expect(files()).toEqual([]);
  });
  it('чужой тип 415, пустое тело 400, слишком большое 413: поле и диск не тронуты', async () => {
    expect((await put('trainer', 'male', bytes, 'text/plain')).status).toBe(415);
    expect((await put('trainer', 'male', new Uint8Array(0))).status).toBe(400);
    expect((await put('trainer', 'male', new Uint8Array(2048))).status).toBe(413);
    expect(files()).toEqual([]);
    expect(db.prepare("SELECT demo_male FROM exercises WHERE slug = 'plank'").get()).toEqual({ demo_male: null });
  });
  it('повторная загрузка заменяет ролик и удаляет прежний файл', async () => {
    const first = (await (await put('trainer', 'male', bytes)).json()).demo.male;
    const second = (await (await put('admin', 'male', bytes, 'video/webm')).json()).demo.male;
    expect(second).not.toBe(first);
    expect(files()).toEqual([second]);
  });
});

describe('DELETE /api/exercises/:id/demo/:gender', () => {
  it('очищает поле и удаляет файл; чужому 403; неизвестному упражнению 404', async () => {
    await put('trainer', 'female', bytes);
    expect((await del('athlete', 'female')).status).toBe(403);
    expect((await del('trainer', 'female', 'net')).status).toBe(404);
    const res = await del('trainer', 'female');
    expect(res.status).toBe(200);
    expect(await res.json()).not.toHaveProperty('demo');
    expect(files()).toEqual([]);
  });
});

describe('удаление упражнения', () => {
  it('убирает с диска оба ролика', async () => {
    await put('trainer', 'female', bytes);
    await put('trainer', 'male', bytes);
    expect(files()).toHaveLength(2);
    expect((await fetch(`${base}/exercises/plank`, { method: 'DELETE', headers: { cookie: cookies.admin! } })).status).toBe(204);
    expect(files()).toEqual([]);
  });
});

describe('GET /api/demo/:file', () => {
  it('любой вошедший получает файл, поддерживается Range', async () => {
    const file = (await (await put('trainer', 'female', bytes)).json()).demo.female;
    const ok = await fetch(`${base}/demo/${file}`, { headers: { cookie: cookies.athlete! } });
    expect(ok.status).toBe(200);
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(bytes);
    const part = await fetch(`${base}/demo/${file}`, { headers: { cookie: cookies.athlete!, range: 'bytes=2-4' } });
    expect(part.status).toBe(206);
    expect(new Uint8Array(await part.arrayBuffer())).toEqual(bytes.slice(2, 5));
  });
  it('без входа 401; имя не из библиотеки или пропавший файл 404', async () => {
    const file = (await (await put('trainer', 'female', bytes)).json()).demo.female;
    expect((await fetch(`${base}/demo/${file}`)).status).toBe(401);
    const cookie = cookies.athlete!;
    for (const name of ['..%2Fapp.db', 'x.exe', 'не-uuid.mp4', '00000000-0000-0000-0000-000000000000.mp4']) {
      expect((await fetch(`${base}/demo/${name}`, { headers: { cookie } })).status).toBe(404);
    }
  });
});
