import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { markReviewed } from './reviews';
import { reviewRouter } from './reviewRouter';
import { linkAthlete } from './trainerLinks';

let db: Db;
let server: Server;
let base: string;
let sid: number;
let athleteCookie: string;
let strangerCookie: string;
const cookieOf = async (email: string) => {
  const r = await login(db, email, 'trenirovka7');
  if (!r.ok) throw new Error('login');
  return `session=${r.token}`;
};
const get = (path: string, cookie?: string) => fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} });
const post = (path: string, cookie?: string) => fetch(`${base}${path}`, { method: 'POST', headers: cookie ? { cookie } : {} });

beforeEach(async () => {
  db = openDb(':memory:');
  const athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete');
  const trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer');
  await createUser(db, 's@example.com', 'trenirovka7', 'athlete');
  linkAthlete(db, trainer, athlete);
  sid = Number(db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, 'Ноги', '2026-10-31', 'x', '[]', 0)").run(athlete).lastInsertRowid);
  markReviewed(db, { id: trainer, role: 'trainer' }, sid);
  athleteCookie = await cookieOf('a@example.com');
  strangerCookie = await cookieOf('s@example.com');
  const app = express();
  app.use('/api', reviewRouter(db));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('GET /api/sessions/:id/review', () => {
  it('без входа 401, без date 400', async () => {
    expect((await get(`/sessions/${sid}/review?date=2026-11-02`)).status).toBe(401);
    expect((await get(`/sessions/${sid}/review`, athleteCookie)).status).toBe(400);
  });
  it('свой разбор отдаётся, чужой 403, несуществующий и кривой id 404', async () => {
    const ok = await get(`/sessions/${sid}/review?date=2026-11-02`, athleteCookie);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ sessionId: sid, title: 'Ноги', exercises: [] });
    expect((await get(`/sessions/${sid}/review?date=2026-11-02`, strangerCookie)).status).toBe(403);
    expect((await get('/sessions/999/review?date=2026-11-02', athleteCookie)).status).toBe(404);
    expect((await get('/sessions/abc/review?date=2026-11-02', athleteCookie)).status).toBe(404);
  });
});

describe('GET /api/sessions/video/:videoId', () => {
  it('неизвестное видео 404', async () => {
    expect((await get('/sessions/video/33333333-3333-4333-8333-333333333333', athleteCookie)).status).toBe(404);
  });
});

describe('уведомления', () => {
  const nid = () => (db.prepare('SELECT id FROM notifications').get() as { id: number }).id;
  it('read и dismiss: 204 своему, 404 чужому и несуществующему', async () => {
    expect((await post(`/notifications/${nid()}/read`, athleteCookie)).status).toBe(204);
    expect((await post(`/notifications/${nid()}/read`, strangerCookie)).status).toBe(404);
    expect((await post('/notifications/999/dismiss', athleteCookie)).status).toBe(404);
    expect((await post(`/notifications/${nid()}/dismiss`, athleteCookie)).status).toBe(204);
    expect((await post(`/notifications/${nid()}/dismiss`)).status).toBe(401);
    expect(db.prepare('SELECT dismissed_at IS NOT NULL AS d FROM notifications').get()).toEqual({ d: 1 });
  });
});
