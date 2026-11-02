import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login } from './auth';
import { openDb, type Db } from './db';
import { techniquesFor } from './comments';
import { libraryOf as commentLibrary } from './comments';
import {
  createExercise, deleteExercise, slugify, uniqueSlug, updateExercise, validateCreate, validateFields,
} from './exercises';
import { exercisesRouter } from './exercisesRouter';
import { libraryOf } from './imports';
import type { ExerciseInput } from '../shared/types';

const base: ExerciseInput = { name: 'Жим лёжа', group: 'chest', kind: 'weight', muscles: ['Грудь'], aliases: ['Bench press'] };

describe('slugify / uniqueSlug', () => {
  it('транслитерирует кириллицу', () => {
    expect(slugify('Жим лёжа')).toBe('zhim-lezha');
    expect(slugify('  Подтягивания: широким хватом! ')).toBe('podtyagivaniya-shirokim-hvatom');
    expect(slugify('Squat 2.0')).toBe('squat-2-0');
  });
  it('пустой результат даёт exercise', () => {
    expect(slugify('???')).toBe('exercise');
    expect(slugify('ъь')).toBe('exercise');
  });
  it('добавляет суффикс при занятости', () => {
    expect(uniqueSlug('a', new Set())).toBe('a');
    expect(uniqueSlug('a', new Set(['a']))).toBe('a-2');
    expect(uniqueSlug('a', new Set(['a', 'a-2']))).toBe('a-3');
  });
});

describe('validateFields', () => {
  const err = (b: unknown) => {
    const r = validateFields(b);
    return r.ok ? null : r.error;
  };
  it('имя: trim и границы', () => {
    expect(validateFields({ name: '  Присед ' })).toEqual({ ok: true, value: { name: 'Присед' } });
    expect(err({ name: '   ' })).toMatch(/Название/);
    expect(err({ name: 'я'.repeat(81) })).toMatch(/Название/);
    expect(err({ name: 5 })).toMatch(/Название/);
  });
  it('group и kind', () => {
    expect(err({ group: 'head' })).toMatch(/Группа/);
    expect(err({ kind: 'distance' })).toMatch(/Тип/);
    expect(validateFields({ group: 'legs', kind: 'time' }).ok).toBe(true);
  });
  it('списки: пустые отбрасываются, дубликаты убираются, лимиты', () => {
    expect(validateFields({ muscles: [' Грудь ', '', 'грудь', 'Трицепс'] })).toEqual({ ok: true, value: { muscles: ['Грудь', 'Трицепс'] } });
    expect(err({ muscles: 'x' })).toMatch(/Мышцы/);
    expect(err({ aliases: [1] })).toMatch(/Псевдонимы/);
    expect(err({ aliases: ['я'.repeat(61)] })).toMatch(/Псевдонимы/);
    expect(err({ aliases: Array.from({ length: 13 }, (_, i) => `a${i}`) })).toMatch(/12/);
    expect(validateFields({ aliases: Array.from({ length: 12 }, (_, i) => `a${i}`) }).ok).toBe(true);
  });
  it('notes до 4000, video только http(s)', () => {
    expect(validateFields({ notes: 'x'.repeat(4000) }).ok).toBe(true);
    expect(err({ notes: 'x'.repeat(4001) })).toMatch(/Описание/);
    expect(validateFields({ notes: '', video: '' })).toEqual({ ok: true, value: { notes: '', video: '' } });
    expect(validateFields({ video: 'https://example.com/a.mp4' }).ok).toBe(true);
    expect(err({ video: 'javascript:alert(1)' })).toMatch(/Видео/);
    expect(err({ video: 'ftp://x/y' })).toMatch(/Видео/);
    expect(err({ video: '/videos/a.mp4' })).toMatch(/Видео/);
    expect(err({ video: 'https://e.com/' + 'a'.repeat(500) })).toMatch(/Видео/);
  });
  it('не объект — ошибка', () => {
    expect(err(null)).not.toBeNull();
    expect(err([])).not.toBeNull();
  });
  it('validateCreate требует name, group, kind', () => {
    expect(validateCreate({ name: 'А', group: 'core' }).ok).toBe(false);
    expect(validateCreate({ name: 'А', group: 'core', kind: 'reps' })).toEqual({
      ok: true, value: { name: 'А', group: 'core', kind: 'reps', muscles: [], aliases: [] },
    });
  });
});

describe('createExercise / updateExercise / deleteExercise', () => {
  let db: Db;
  beforeEach(() => {
    db = openDb(':memory:');
  });
  it('создаёт со слагом; одинаковый слаг получает суффикс', () => {
    const a = createExercise(db, base);
    expect(a).toMatchObject({ ok: true, entry: { id: 'zhim-lezha', name: 'Жим лёжа', aliases: ['Bench press'] } });
    const b = createExercise(db, { ...base, name: 'Жим  лёжа!', aliases: [] });
    expect(b).toMatchObject({ ok: true, entry: { id: 'zhim-lezha-2' } });
  });
  it('дубликат по названию без учёта регистра и по псевдониму других', () => {
    createExercise(db, base);
    expect(createExercise(db, { ...base, name: 'жИМ ЛЁЖА' })).toEqual({ ok: false, error: 'duplicate' });
    expect(createExercise(db, { ...base, name: 'bench PRESS' })).toEqual({ ok: false, error: 'duplicate' });
    expect(libraryOf(db)).toHaveLength(1);
  });
  it('patch: частичное обновление, slug не меняется, пустые notes/video очищают', () => {
    createExercise(db, { ...base, notes: '1. А', video: 'https://e.com/v' });
    const r = updateExercise(db, 'zhim-lezha', { name: 'Жим штанги', kind: 'reps' });
    expect(r).toMatchObject({ ok: true, entry: { id: 'zhim-lezha', name: 'Жим штанги', kind: 'reps', group: 'chest', notes: '1. А', video: 'https://e.com/v' } });
    const c = updateExercise(db, 'zhim-lezha', { notes: '', video: '' });
    expect(c.ok && c.entry).not.toHaveProperty('notes');
    expect(c.ok && c.entry).not.toHaveProperty('video');
  });
  it('patch: 404 и дубликат; своё название можно оставить', () => {
    createExercise(db, base);
    createExercise(db, { ...base, name: 'Присед', aliases: [] });
    expect(updateExercise(db, 'net', { name: 'X' })).toEqual({ ok: false, error: 'not_found' });
    expect(updateExercise(db, 'prised', { name: 'жим лёжа' })).toEqual({ ok: false, error: 'duplicate' });
    expect(updateExercise(db, 'prised', { name: 'ПРИСЕД' }).ok).toBe(true);
  });
  it('delete', () => {
    createExercise(db, base);
    expect(deleteExercise(db, 'zhim-lezha')).toBe(true);
    expect(deleteExercise(db, 'zhim-lezha')).toBe(false);
  });
  it('notes из упражнения превращаются в технику', () => {
    createExercise(db, { ...base, name: 'Отжимания', notes: '1. Шаг\n2. Шаг' });
    const blocks = [{ id: 'b', title: 'B', mode: 'sets', exercises: [{ id: 'e1', name: 'Отжимания', kind: 'reps' }] }] as never;
    const t = techniquesFor(blocks, commentLibrary(db));
    expect(Object.values(t)).toHaveLength(1);
    expect(Object.values(t)[0]!.instructions).toHaveLength(2);
  });
});

describe('/api/exercises (HTTP)', () => {
  let db: Db;
  let server: Server;
  let url: string;
  const cookies: Record<string, string> = {};

  beforeEach(async () => {
    db = openDb(':memory:');
    for (const role of ['athlete', 'trainer', 'admin'] as const) {
      await createUser(db, `${role}@x.ru`, 'password-123456', role);
      const r = await login(db, `${role}@x.ru`, 'password-123456');
      if (r.ok) cookies[role] = `session=${r.token}`;
    }
    const app = express();
    app.use(express.json());
    app.use('/api', exercisesRouter(db));
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/exercises`;
  });
  afterEach(() => new Promise((resolve) => server.close(resolve)));

  const call = (method: string, role: string | null, body?: unknown, id = '') =>
    fetch(url + id, {
      method,
      headers: { 'content-type': 'application/json', ...(role ? { cookie: cookies[role]! } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('401 без входа, 403 спортсмену на запись, GET доступен', async () => {
    expect((await call('GET', null)).status).toBe(401);
    expect((await call('POST', null, base)).status).toBe(401);
    expect((await call('GET', 'athlete')).status).toBe(200);
    const r = await call('POST', 'athlete', base);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: 'Упражнения меняют тренер и админ' });
    expect((await call('PATCH', 'athlete', { name: 'X' }, '/x')).status).toBe(403);
    expect((await call('DELETE', 'athlete', undefined, '/x')).status).toBe(403);
  });
  it('тренер: 201, 409, 400, PATCH 200/404, DELETE 204/404', async () => {
    const c = await call('POST', 'trainer', base);
    expect(c.status).toBe(201);
    expect(await c.json()).toMatchObject({ id: 'zhim-lezha' });
    const d = await call('POST', 'admin', base);
    expect(d.status).toBe(409);
    expect((await d.json()).error).toMatch(/уже есть/);
    expect((await call('POST', 'trainer', { ...base, name: '' })).status).toBe(400);
    const p = await call('PATCH', 'trainer', { notes: '1. А' }, '/zhim-lezha');
    expect(p.status).toBe(200);
    expect(await p.json()).toMatchObject({ notes: '1. А' });
    expect((await call('PATCH', 'trainer', { video: 'javascript:1' }, '/zhim-lezha')).status).toBe(400);
    expect((await call('PATCH', 'trainer', { name: 'X' }, '/net')).status).toBe(404);
    expect((await call('DELETE', 'admin', undefined, '/zhim-lezha')).status).toBe(204);
    expect((await call('DELETE', 'admin', undefined, '/zhim-lezha')).status).toBe(404);
  });
});
