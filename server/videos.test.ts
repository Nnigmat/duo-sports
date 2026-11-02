import express from 'express';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { linkAthlete } from './trainerLinks';
import { videosRouter } from './videos';

let dir: string;
let server: Server;
let base: string;
let db: Db;
let cookie: string;
let cookieOf: (email: string) => Promise<string>;

async function start(maxBytes = 1024) {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videos-'));
  db = openDb(':memory:');
  const athlete = await createUser(db, 'nikita@example.com', 'trenirovka7', 'athlete');
  const coach = await createUser(db, 'coach@example.com', 'trenirovka7', 'trainer');
  await createUser(db, 'coach2@example.com', 'trenirovka7', 'trainer');
  linkAthlete(db, coach, athlete);
  cookieOf = async (email) => {
    const r = await login(db, email, 'trenirovka7');
    if (!r.ok) throw new Error('login');
    return `session=${r.token}`;
  };
  cookie = await cookieOf('nikita@example.com');
  const app = express();
  app.use('/api', videosRouter({ db, dir, maxBytes }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/videos`;
}

const post = (body: BodyInit | null, type?: string, query = '') =>
  fetch(base + query, { method: 'POST', body, headers: { cookie, ...(type ? { 'content-type': type } : {}) } });

beforeEach(() => start());
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('POST /api/videos', () => {
  it('сохраняет тело запроса в файл и возвращает id и путь', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const res = await post(bytes, 'video/webm');
    expect(res.status).toBe(201);
    const { id, path: p } = await res.json();
    expect(p).toBe(`videos/${id}.webm`);
    expect(new Uint8Array(fs.readFileSync(path.join(dir, `${id}.webm`)))).toEqual(bytes);
  });

  it('расширение берётся из типа, параметры codecs игнорируются', async () => {
    const mp4 = await (await post(new Uint8Array([1]), 'video/mp4;codecs=avc1')).json();
    expect(mp4.path).toMatch(/\.mp4$/);
    const webm = await (await post(new Uint8Array([1]), 'video/webm;codecs=vp9,opus')).json();
    expect(webm.path).toMatch(/\.webm$/);
  });

  it('чужой тип: 415 и ничего не сохранено', async () => {
    const res = await post(new Uint8Array([1]), 'text/plain');
    expect(res.status).toBe(415);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('без типа: 415', async () => {
    const res = await post(new Uint8Array([1]));
    expect(res.status).toBe(415);
  });

  it('пустое тело: 400 и файла нет', async () => {
    const res = await post(new Uint8Array([]), 'video/webm');
    expect(res.status).toBe(400);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('больше лимита: 413 и недописанный файл удалён', async () => {
    const res = await post(new Uint8Array(2048), 'video/webm');
    expect(res.status).toBe(413);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('каждая загрузка получает свой id', async () => {
    const a = await (await post(new Uint8Array([1]), 'video/webm')).json();
    const b = await (await post(new Uint8Array([1]), 'video/webm')).json();
    expect(a.id).not.toBe(b.id);
    expect(fs.readdirSync(dir)).toHaveLength(2);
  });
});

describe('владелец и длительность', () => {
  it('без входа: 401', async () => {
    const res = await fetch(base, { method: 'POST', body: new Uint8Array([1]), headers: { 'content-type': 'video/webm' } });
    expect(res.status).toBe(401);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('запоминает владельца и длительность', async () => {
    const { id } = await (await post(new Uint8Array([1]), 'video/webm', '?durationSec=38')).json();
    expect(db.prepare('SELECT duration_sec, file FROM videos WHERE id = ?').get(id)).toEqual({ duration_sec: 38, file: `${id}.webm` });
  });

  it('длительность не число или вне 0–3600: 400 и файла нет', async () => {
    for (const q of ['?durationSec=abc', '?durationSec=-1', '?durationSec=3601', '?durationSec=1.5']) {
      expect((await post(new Uint8Array([1]), 'video/webm', q)).status).toBe(400);
    }
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe('GET /api/videos/:id', () => {
  const get = (id: string, c: string, headers: Record<string, string> = {}) => fetch(`${base}/${id}`, { headers: { cookie: c, ...headers } });
  let id: string;
  beforeEach(async () => {
    id = (await (await post(new Uint8Array([10, 11, 12, 13, 14, 15]), 'video/webm')).json()).id;
  });

  it('владелец и его тренер получают файл, чужой тренер нет', async () => {
    const own = await get(id, cookie);
    expect(own.status).toBe(200);
    expect(new Uint8Array(await own.arrayBuffer())).toEqual(new Uint8Array([10, 11, 12, 13, 14, 15]));
    expect((await get(id, await cookieOf('coach@example.com'))).status).toBe(200);
    expect((await get(id, await cookieOf('coach2@example.com'))).status).toBe(404);
  });

  it('Range отдаёт кусок: перемотка в плеере', async () => {
    const res = await get(id, cookie, { range: 'bytes=2-3' });
    expect(res.status).toBe(206);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([12, 13]));
  });

  it('неизвестный id и не-uuid: 404', async () => {
    expect((await get('00000000-0000-4000-8000-000000000000', cookie)).status).toBe(404);
    expect((await get('..%2Fapp.db', cookie)).status).toBe(404);
  });
});
