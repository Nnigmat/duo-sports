import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Block, ImportCommit, SessionResult } from '../shared/types';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { applyImport, undoImport, validateCommit } from './imports';
import { planOf } from './plan';
import { saveSession, validateSession, workoutOf } from './workouts';

let db: Db;
let me: number;
let other: number;
const clock = () => new Date('2026-11-03T10:00:00Z');

const structure: Block[] = [
  { id: 'b0', mode: 'timed', title: 'Разминка', exercises: [{ id: 'b0-e0', name: 'Разминка', kind: 'time', target: { min: 300, max: 300 } }] },
  { id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [{ id: 'b1-e0', name: 'Жим', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 }] },
];
const commit = (over: Partial<ImportCommit> = {}): ImportCommit => ({
  exercises: [],
  workouts: [{ id: 'w1', title: 'Верх', blocks: [{ kind: 'exercises', heading: 'Подходами', items: [{ name: 'Жим', value: '3 × 8 · 60 кг' }] }], structure }],
  entries: [{ date: '2026-11-03', workout: 0 }],
  replaceDates: [],
  ...over,
});
const result = (over: Partial<SessionResult> = {}): SessionResult => ({
  date: '2026-11-03',
  videos: 0,
  steps: [
    { exerciseId: 'b1-e0', exerciseName: 'Жим', blockIndex: 1, round: 1, rounds: 3, kind: 'weight', plan: { target: { min: 8, max: 8 }, weight: 60 }, completed: true },
    { exerciseId: 'b1-e0', exerciseName: 'Жим', blockIndex: 1, round: 2, rounds: 3, kind: 'weight', plan: { target: { min: 8, max: 8 }, weight: 60 }, completed: false },
  ],
  ...over,
});
const workoutId = () => (db.prepare("SELECT id FROM workouts WHERE slug = 'w1' AND user_id = ?").get(me) as { id: number }).id;

beforeEach(async () => {
  db = openDb(':memory:');
  me = await createUser(db, 'me@example.com', 'trenirovka7', 'athlete', clock);
  other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete', clock);
});

describe('тренировка для экрана выполнения', () => {
  it('отдаёт блоки так, как их сохранили', () => {
    applyImport(db, me, commit(), clock);
    expect(workoutOf(db, me, workoutId())).toEqual({ id: String(workoutId()), title: 'Верх', blocks: structure });
  });
  it('чужую и несуществующую не отдаёт', () => {
    applyImport(db, me, commit(), clock);
    expect(workoutOf(db, other, workoutId())).toBeNull();
    expect(workoutOf(db, me, 999)).toBeNull();
  });
  it('без структуры (импорт без неё) запустить нельзя', () => {
    const c = commit();
    delete c.workouts[0]!.structure;
    applyImport(db, me, c, clock);
    expect(workoutOf(db, me, workoutId())).toBeNull();
  });
  it('повторный импорт обновляет структуру, отмена возвращает прежнюю', () => {
    applyImport(db, me, commit(), clock);
    const newer: Block[] = [{ ...(structure[1] as Block), title: 'Новое' } as Block];
    const c = commit();
    c.workouts[0]!.structure = newer;
    const r = applyImport(db, me, c, clock);
    expect(workoutOf(db, me, workoutId())!.blocks).toEqual(newer);
    undoImport(db, me, r.id, clock);
    expect(workoutOf(db, me, workoutId())!.blocks).toEqual(structure);
  });
});

describe('проверка структуры в импорте', () => {
  const withStructure = (s: unknown) => {
    const c = commit();
    (c.workouts[0] as { structure?: unknown }).structure = s;
    return validateCommit(c);
  };
  it('нормальная проходит', () => {
    expect(withStructure(structure).ok).toBe(true);
  });
  it('отказывает по форме', () => {
    expect(withStructure([]).ok).toBe(false);
    expect(withStructure('x').ok).toBe(false);
    expect(withStructure([{ ...structure[1], exercises: [] }]).ok).toBe(false);
    expect(withStructure([{ ...structure[1], mode: 'yoga' }]).ok).toBe(false);
    expect(withStructure([{ ...structure[1], restSec: -1 }]).ok).toBe(false);
    expect(withStructure([{ ...structure[1], exercises: [{ id: 'x', name: 'Жим', kind: 'weight', target: { min: 8, max: 4 }, sets: 3 }] }]).ok).toBe(false);
    expect(withStructure([{ ...structure[1], exercises: [{ id: 'x', name: 'Жим', kind: 'weight', target: { min: 8, max: 8 } }] }]).ok).toBe(false);
  });
});

describe('итог тренировки', () => {
  it('записывается и делает день выполненным', () => {
    applyImport(db, me, commit(), clock);
    expect(planOf(db, me).entries['2026-11-03']!.status).toBe('planned');
    const saved = saveSession(db, me, workoutId(), result(), clock);
    expect(saved.ok).toBe(true);
    expect(planOf(db, me).entries['2026-11-03']!.status).toBe('done');
    const row = db.prepare('SELECT title, date, finished_at, steps, videos FROM sessions_done').get() as { title: string; date: string; finished_at: string; steps: string; videos: number };
    expect(row).toMatchObject({ title: 'Верх', date: '2026-11-03', finished_at: '2026-11-03T10:00:00.000Z', videos: 0 });
    expect(JSON.parse(row.steps)).toHaveLength(2);
  });
  it('выполненный день — только тот, на который записан итог', () => {
    applyImport(db, me, commit({ entries: [{ date: '2026-11-03', workout: 0 }, { date: '2026-11-10', workout: 0 }] }), clock);
    saveSession(db, me, workoutId(), result(), clock);
    const { entries } = planOf(db, me);
    expect([entries['2026-11-03']!.status, entries['2026-11-10']!.status]).toEqual(['done', 'planned']);
  });
  it('чужую тренировку записать нельзя', () => {
    applyImport(db, me, commit(), clock);
    expect(saveSession(db, other, workoutId(), result(), clock)).toEqual({ ok: false, error: 'not_found' });
    expect(saveSession(db, me, 999, result(), clock)).toEqual({ ok: false, error: 'not_found' });
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions_done').get()).toEqual({ n: 0 });
  });
  it('история остаётся, если тренировку убрали отменой импорта', () => {
    const r = applyImport(db, me, commit(), clock);
    saveSession(db, me, workoutId(), result(), clock);
    undoImport(db, me, r.id, clock);
    expect(db.prepare('SELECT title, workout_id FROM sessions_done').get()).toEqual({ title: 'Верх', workout_id: null });
  });
});

describe('validateSession', () => {
  const bad = (patch: Record<string, unknown>) => validateSession({ ...result(), ...patch });
  it('нормальный проходит', () => {
    expect(validateSession(result()).ok).toBe(true);
  });
  it('отказывает по форме', () => {
    expect(validateSession(null).ok).toBe(false);
    expect(bad({ date: 'вчера' })).toMatchObject({ ok: false });
    expect(bad({ videos: -1 })).toMatchObject({ ok: false });
    expect(bad({ steps: [] })).toMatchObject({ ok: false, error: 'steps: список от 1 до 2000' });
    expect(bad({ steps: [{ ...result().steps[0], kind: 'yoga' }] })).toMatchObject({ ok: false, error: 'steps[0]: неверные поля' });
    expect(bad({ steps: [{ ...result().steps[0], completed: 'да' }] })).toMatchObject({ ok: false });
    expect(bad({ steps: [{ ...result().steps[0], plan: { target: { min: -1, max: 2 } } }] })).toMatchObject({ ok: false });
  });
});

describe('validateSession: факт подхода', () => {
  const withActual = (actual: unknown) => {
    const r = result();
    r.steps[1] = { ...r.steps[1]!, actual } as SessionResult['steps'][number];
    return validateSession(r);
  };
  it('принимает факт: повторы, вес и «доп. вес»', () => {
    expect(withActual({ value: 8 }).ok).toBe(true);
    expect(withActual({ value: 8, weight: 62.5, extraWeight: true }).ok).toBe(true);
  });
  it('без факта (старый клиент, пропуск) тоже можно', () => {
    expect(validateSession(result()).ok).toBe(true);
  });
  it('отказывает по кривому факту', () => {
    for (const actual of [null, 5, {}, { value: -1 }, { value: 'много' }, { value: 8, weight: -1 }, { value: 8, extraWeight: false }, { value: 8, extraWeight: 'да' }]) {
      expect(withActual(actual)).toMatchObject({ ok: false, error: 'steps[1]: неверные поля' });
    }
  });
  it('факт сохраняется в Итоге вместе с планом', () => {
    const r = result();
    r.steps[1] = { ...r.steps[1]!, actual: { value: 7 } };
    applyImport(db, me, commit(), clock);
    const saved = saveSession(db, me, workoutId(), r, clock);
    expect(saved.ok).toBe(true);
    const row = db.prepare('SELECT steps FROM sessions_done WHERE id = ?').get((saved as { id: number }).id) as { steps: string };
    expect(JSON.parse(row.steps)[1]).toMatchObject({ actual: { value: 7 }, plan: r.steps[1]!.plan });
  });
});

describe('база, созданная до структуры', () => {
  it('колонка structure добавляется при открытии, данные остаются', async () => {
    const file = `${process.env.TMPDIR ?? '/tmp'}/old-${Date.now()}.db`;
    const old = new Database(file);
    old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL, password_changed_at TEXT, created_at TEXT NOT NULL);
      CREATE TABLE workouts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, slug TEXT, title TEXT NOT NULL, blocks TEXT NOT NULL, import_id INTEGER, created_at TEXT NOT NULL);
      INSERT INTO users (email, password_hash, role, created_at) VALUES ('a@b.c', 'x', 'athlete', 'now');
      INSERT INTO workouts (user_id, title, blocks, created_at) VALUES (1, 'Старая', '[]', 'now');`);
    old.close();
    const migrated = openDb(file);
    expect(migrated.prepare('SELECT title, structure FROM workouts').get()).toEqual({ title: 'Старая', structure: null });
    migrated.close();
  });
});

describe('durationSec', () => {
  const base = { date: '2026-11-03', videos: 0, steps: [{ exerciseId: 'a', exerciseName: 'A', blockIndex: 0, round: 1, rounds: 1, kind: 'reps', plan: { target: { min: 1, max: 1 } }, completed: true }] };
  it('необязательное число секунд от 0 до суток', () => {
    expect(validateSession(base).ok).toBe(true);
    expect(validateSession({ ...base, durationSec: 2700 }).ok).toBe(true);
    for (const bad of [-1, 1.5, 86_401, '60']) expect(validateSession({ ...base, durationSec: bad }).ok).toBe(false);
  });
});

describe('фактический отдых подхода', () => {
  const step = { exerciseId: 'a', exerciseName: 'A', blockIndex: 0, round: 1, rounds: 1, kind: 'reps', plan: { target: { min: 1, max: 1 } }, completed: true };
  const withRest = (restSec: unknown) => validateSession({ date: '2026-11-03', videos: 0, steps: [{ ...step, restSec }] });
  it('необязателен: старые итоги без него валидны', () => {
    expect(validateSession({ date: '2026-11-03', videos: 0, steps: [step] }).ok).toBe(true);
  });
  it('целое число секунд от 0 до суток, в том числе сверх цели', () => {
    for (const ok of [0, 72, 86_400]) expect(withRest(ok).ok).toBe(true);
    for (const bad of [-1, 1.5, 86_401, '60', null]) expect(withRest(bad)).toMatchObject({ ok: false, error: 'steps[0]: неверные поля' });
  });
  it('сохраняется в итоге вместе с подходом', () => {
    applyImport(db, me, commit(), clock);
    const r = result();
    r.steps[0] = { ...r.steps[0]!, restSec: 72 };
    const saved = saveSession(db, me, workoutId(), r, clock);
    expect(saved.ok).toBe(true);
    const row = db.prepare('SELECT steps FROM sessions_done').get() as { steps: string };
    expect(JSON.parse(row.steps)[0].restSec).toBe(72);
  });
});

describe('видео подхода', () => {
  const V1 = '11111111-1111-4111-8111-111111111111';
  const V2 = '22222222-2222-4222-8222-222222222222';
  const upload = (id: string, owner: number) =>
    db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, created_at) VALUES (?, ?, ?, 38, '2026-11-03T09:00:00Z')").run(id, owner, `${id}.webm`);
  const withVideo = (videoId: string, step = 0): SessionResult => {
    const r = result({ videos: 1 });
    r.steps[step] = { ...r.steps[step]!, videoId };
    return r;
  };

  it('сохранение привязывает видео к тренировке и номеру подхода', () => {
    applyImport(db, me, commit(), clock);
    upload(V1, me);
    const saved = saveSession(db, me, workoutId(), withVideo(V1, 1), clock);
    expect(saved.ok).toBe(true);
    expect(db.prepare('SELECT session_id, step_index FROM videos WHERE id = ?').get(V1)).toEqual({ session_id: saved.ok ? saved.id : -1, step_index: 1 });
  });
  it('чужое, неизвестное и уже занятое видео не принимается, тренировка не записывается', () => {
    applyImport(db, me, commit(), clock);
    upload(V1, other);
    expect(saveSession(db, me, workoutId(), withVideo(V1), clock)).toEqual({ ok: false, error: 'bad_video' });
    expect(saveSession(db, me, workoutId(), withVideo(V2), clock)).toEqual({ ok: false, error: 'bad_video' });
    upload(V2, me);
    expect(saveSession(db, me, workoutId(), withVideo(V2), clock).ok).toBe(true);
    expect(saveSession(db, me, workoutId(), withVideo(V2), clock)).toEqual({ ok: false, error: 'bad_video' });
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions_done').get()).toEqual({ n: 1 });
  });
  it('validateSession: videoId — uuid, один и тот же на двух подходах нельзя', () => {
    expect(validateSession(withVideo(V1)).ok).toBe(true);
    expect(validateSession(withVideo('../app.db')).ok).toBe(false);
    const r = withVideo(V1);
    r.steps[1] = { ...r.steps[1]!, videoId: V1 };
    expect(validateSession(r)).toMatchObject({ ok: false, error: 'videoId: одно видео на один подход' });
  });
});
