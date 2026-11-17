import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AI_RULES_MAX, DEFAULT_AI_RULES } from './aiRules';
import { aiRulesRouter } from './aiRulesRouter';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';

let db: Db;
let server: Server;
let base: string;
const cookies: Record<string, string> = {};
const cookieOf = async (email: string) => {
  const r = await login(db, email, 'trenirovka7');
  if (!r.ok) throw new Error('login');
  return `session=${r.token}`;
};
const call = (method: string, role: string | null, body?: unknown) =>
  fetch(`${base}/admin/ai-rules`, {
    method,
    headers: { 'content-type': 'application/json', ...(role ? { cookie: cookies[role]! } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(async () => {
  db = openDb(':memory:');
  for (const role of ['athlete', 'trainer', 'admin'] as const) {
    await createUser(db, `${role}@example.com`, 'trenirovka7', role);
    cookies[role] = await cookieOf(`${role}@example.com`);
  }
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', aiRulesRouter(db));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('/api/admin/ai-rules', () => {
  it('anonymous gets 401', async () => {
    expect((await call('GET', null)).status).toBe(401);
    expect((await call('PUT', null, { text: 'x' })).status).toBe(401);
  });

  it('athlete and trainer get 403', async () => {
    for (const role of ['athlete', 'trainer']) {
      const g = await call('GET', role);
      expect(g.status).toBe(403);
      expect(await g.json()).toEqual({ error: 'Правила меняет админ' });
      expect((await call('PUT', role, { text: 'x' })).status).toBe(403);
    }
  });

  it('admin reads default', async () => {
    const r = await call('GET', 'admin');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ text: DEFAULT_AI_RULES, updatedAt: null, updatedBy: null });
  });

  it('admin saves and reads back', async () => {
    const put = await call('PUT', 'admin', { text: 'Отдых 90 с' });
    expect(put.status).toBe(200);
    expect(await put.json()).toMatchObject({ text: 'Отдых 90 с', updatedBy: 'admin@example.com' });
    const got = await (await call('GET', 'admin')).json();
    expect(got.text).toBe('Отдых 90 с');
    expect(typeof got.updatedAt).toBe('string');
  });

  it('rejects text over AI_RULES_MAX with 400', async () => {
    expect((await call('PUT', 'admin', { text: 'а'.repeat(AI_RULES_MAX + 1) })).status).toBe(400);
    expect((await call('PUT', 'admin', { text: 5 })).status).toBe(400);
    expect((await call('PUT', 'admin', {})).status).toBe(400);
  });
});
