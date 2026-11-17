import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentWorkout, DraftRequest, DraftUsage } from '../shared/aiDraft';
import { AiError, type AiClient } from './aiClient';
import type { Prompt } from './aiPrompt';
import { setAiRules } from './aiRules';
import { aiRouter } from './aiRouter';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { linkAthlete } from './trainerLinks';

const workout: AgentWorkout = {
  title: 'Верх тела',
  warmup: null,
  cooldown: null,
  blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', do: '4x8 @ 60' }] }],
  new_exercises: [],
  advice: [],
};
const usage: DraftUsage = { input: 120, cacheCreation: 3000, cacheRead: 0, output: 800 };

/** Подделка клиента: запоминает запрос, отдаёт заданное или бросает */
class FakeClient implements AiClient {
  prompts: Prompt[] = [];
  schemas: Array<Record<string, unknown>> = [];
  answer: () => unknown = () => workout;
  async draft(prompt: Prompt, schema: Record<string, unknown>) {
    this.prompts.push(prompt);
    this.schemas.push(schema);
    return { json: this.answer(), usage };
  }
}

let db: Db;
let server: Server;
let base: string;
let fake: FakeClient;
let athleteId: number;
let otherAthleteId: number;
let adminId: number;
const cookies: Record<string, string> = {};

const body = (over: Partial<DraftRequest> = {}): DraftRequest => ({
  athleteId,
  date: '2026-11-18',
  title: '',
  warmup: null,
  main: { text: 'жим лёжа 4×8 60 кг', exercises: [] },
  cooldown: null,
  ...over,
});

async function start(client: AiClient | null) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', aiRouter(db, client));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
}

const call = (role: string, payload: unknown) =>
  fetch(`${base}/ai/workout-draft`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookies[role]! },
    body: JSON.stringify(payload),
  });

beforeEach(async () => {
  db = openDb(':memory:');
  const ids: Record<string, number> = {};
  for (const [name, role] of [['athlete', 'athlete'], ['other', 'athlete'], ['trainer', 'trainer'], ['stranger', 'trainer'], ['admin', 'admin']] as const) {
    ids[name] = await createUser(db, `${name}@example.com`, 'trenirovka7', role);
    const r = await login(db, `${name}@example.com`, 'trenirovka7');
    if (!r.ok) throw new Error('login');
    cookies[name] = `session=${r.token}`;
  }
  athleteId = ids.athlete!;
  otherAthleteId = ids.other!;
  adminId = ids.admin!;
  linkAthlete(db, ids.trainer!, athleteId);
  fake = new FakeClient();
});
afterEach(() => new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined))));

describe('POST /api/ai/workout-draft', () => {
  it('anonymous gets 401', async () => {
    await start(fake);
    const r = await fetch(`${base}/ai/workout-draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body()) });
    expect(r.status).toBe(401);
  });

  it('athlete gets 403', async () => {
    await start(fake);
    expect((await call('athlete', body({ athleteId: null }))).status).toBe(403);
    expect((await call('athlete', body())).status).toBe(403);
    expect(fake.prompts).toHaveLength(0);
  });

  it('trainer without link to athlete gets 403', async () => {
    await start(fake);
    expect((await call('stranger', body())).status).toBe(403);
    expect((await call('trainer', body({ athleteId: otherAthleteId }))).status).toBe(403);
    expect(fake.prompts).toHaveLength(0);
  });

  it('returns 503 without client', async () => {
    await start(null);
    const r = await call('trainer', body());
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'Сборка недоступна' });
  });

  it('rejects field over 2000 chars', async () => {
    await start(fake);
    const long = 'а'.repeat(2001);
    expect((await call('trainer', body({ main: { text: long, exercises: [] } }))).status).toBe(400);
    expect((await call('trainer', body({ title: long }))).status).toBe(400);
    expect((await call('trainer', body({ warmup: { text: long } }))).status).toBe(400);
    expect((await call('trainer', body({ cooldown: { text: long } }))).status).toBe(400);
    expect((await call('trainer', body({ main: { text: 'а'.repeat(2000), exercises: [] } }))).status).toBe(200);
  });

  it('rejects empty input', async () => {
    await start(fake);
    expect((await call('trainer', body({ main: { text: '   ', exercises: [] } }))).status).toBe(400);
    // Разминка без основной части — тоже пустой ввод: тренировки нет
    expect((await call('trainer', body({ main: { text: '', exercises: [] }, warmup: { text: 'суставная' } }))).status).toBe(400);
    expect(fake.prompts).toHaveLength(0);
  });

  it('rejects malformed body', async () => {
    await start(fake);
    for (const bad of [{}, body({ date: '18.11.2026' }), { ...body(), main: { text: 'x', exercises: [5] } }, { ...body(), warmup: { routine: 5 } }, { ...body(), athleteId: 'x' }, { ...body(), errors: 'нет' }]) {
      expect((await call('trainer', bad)).status).toBe(400);
    }
  });

  it('trainer gets workout for linked athlete', async () => {
    await start(fake);
    const r = await call('trainer', body({ main: { text: '', exercises: ['bench-press'] } }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ workout, usage });
    expect(fake.prompts[0]!.user).toContain('bench-press');
    expect(fake.schemas[0]).toHaveProperty('properties.blocks');
  });

  it('admin gets workout for own plan (athleteId null)', async () => {
    await start(fake);
    const r = await call('admin', body({ athleteId: null }));
    expect(r.status).toBe(200);
    expect((await r.json()).workout).toEqual(workout);
  });

  it('returns 502 when client throws', async () => {
    fake.answer = () => {
      throw new Error('overloaded');
    };
    await start(fake);
    const r = await call('trainer', body());
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: 'Агент не ответил, попробуйте ещё раз' });
  });

  it('returns 503 when API rejects request (400): our bug, retry will not help', async () => {
    fake.answer = () => {
      throw new AiError('400 Schema is too complex.', 400);
    };
    await start(fake);
    const r = await call('trainer', body());
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'Сборка недоступна' });
  });

  it('drops empty exercise fields of strict schema before check', async () => {
    const full = { exercise_id: 'bench-press', name: '', do: '4x8 @ 60', sets: 0, reps: '', weight: '', time: '', rest: '', per_side: false, notes: '' };
    fake.answer = () => ({ ...workout, blocks: [{ type: 'sets', exercises: [full] }] });
    await start(fake);
    const r = await call('trainer', body());
    expect(r.status).toBe(200);
    expect((await r.json()).workout).toEqual(workout);
  });

  it('returns 502 when json is not a workout', async () => {
    fake.answer = () => ({ title: 'Без блоков' });
    await start(fake);
    expect((await call('trainer', body())).status).toBe(502);
  });

  it('passes saved rules into prompt', async () => {
    setAiRules(db, adminId, 'Никаких прыжков');
    await start(fake);
    await call('trainer', body());
    expect(fake.prompts[0]!.system[2]!.text).toContain('Никаких прыжков');
  });

  it('passes parse errors of previous attempt into user message', async () => {
    await start(fake);
    await call('trainer', body({ errors: ['Неизвестный exercise_id: bench-pres'] }));
    expect(fake.prompts[0]!.user).toContain('bench-pres');
  });
});
