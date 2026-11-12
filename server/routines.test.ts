import { beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseInput, RoutineInput } from '../shared/types';
import { openDb, type Db } from './db';
import { createExercise, deleteExercise, updateExercise } from './exercises';
import { libraryOf } from './imports';
import type { Block } from '../shared/types';
import {
  composeDisplay, composeStructure, createRoutine, deleteRoutine, getRoutine, linksOf, listRoutines, routineById, updateRoutine, validateRoutine,
} from './routines';

let db: Db;
const timeEx = (name: string): ExerciseInput => ({ name, group: 'core', kind: 'time', muscles: [], aliases: [] });
const slugOf = (name: string) => {
  const r = createExercise(db, timeEx(name));
  if (!r.ok) throw new Error('exercise');
  return r.entry.id;
};
const user = () =>
  Number(db.prepare("INSERT INTO users (email, password_hash, role, created_at) VALUES ('a@b.c', 'x', 'athlete', 'z')").run().lastInsertRowid);
const routineDbId = (slug: string) => (db.prepare('SELECT id FROM routines WHERE slug = ?').get(slug) as { id: number }).id;

let neck: string;
let hip: string;
const input = (over: Partial<RoutineInput> = {}): RoutineInput => ({
  kind: 'warmup',
  title: 'Ноги лёгкая',
  items: [
    { exercise: neck, sec: { min: 30, max: 30 } },
    { exercise: hip, sec: { min: 20, max: 30 }, sides: ['вправо', 'влево'] },
  ],
  ...over,
});

beforeEach(() => {
  db = openDb(':memory:');
  neck = slugOf('Шея');
  hip = slugOf('Бедро');
});

describe('createRoutine', () => {
  it('creates a routine with ordered items and totalSec', () => {
    const r = createRoutine(db, input({ note: 'Повторяйте' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.routine.id).toBe('nogi-legkaya');
    expect(r.routine.note).toBe('Повторяйте');
    expect(r.routine.items.map((i) => i.name)).toEqual(['Шея', 'Бедро']);
    expect(r.routine.items[1]!.sides).toEqual(['вправо', 'влево']);
    expect(r.routine.totalSec).toBe(30 + 30 * 2);
  });
  it('rejects an exercise that is not a time exercise', () => {
    const w = createExercise(db, { ...timeEx('Жим'), kind: 'weight' });
    if (!w.ok) throw new Error('x');
    expect(createRoutine(db, input({ items: [{ exercise: w.entry.id, sec: { min: 10, max: 10 } }] }))).toEqual({ ok: false, error: 'not_time' });
  });
  it('rejects an unknown exercise', () => {
    expect(createRoutine(db, input({ items: [{ exercise: 'nope', sec: { min: 10, max: 10 } }] }))).toEqual({ ok: false, error: 'unknown_exercise' });
  });
  it('rejects a duplicate title of the same kind, allows the same title for another kind', () => {
    expect(createRoutine(db, input()).ok).toBe(true);
    expect(createRoutine(db, input())).toEqual({ ok: false, error: 'duplicate' });
    const other = createRoutine(db, input({ kind: 'cooldown' }));
    expect(other.ok).toBe(true);
    if (other.ok) expect(other.routine.id).toBe('nogi-legkaya-2');
  });
});

describe('validateRoutine', () => {
  const err = (b: unknown) => {
    const r = validateRoutine(b);
    return r.ok ? null : r.error;
  };
  it('rejects empty items, over-limit items and sec <= 0', () => {
    expect(err(input({ items: [] }))).toBeTruthy();
    expect(err(input({ items: Array.from({ length: 31 }, () => ({ exercise: neck, sec: { min: 5, max: 5 } })) }))).toBeTruthy();
    expect(err(input({ items: [{ exercise: neck, sec: { min: 0, max: 5 } }] }))).toBeTruthy();
    expect(err(input({ items: [{ exercise: neck, sec: { min: 10, max: 5 } }] }))).toBeTruthy();
    expect(err(input({ items: [{ exercise: neck, sec: { min: 5, max: 3601 } }] }))).toBeTruthy();
  });
  it('rejects bad kind, empty or long title, long note', () => {
    expect(err({ ...input(), kind: 'main' })).toBeTruthy();
    expect(err(input({ title: '  ' }))).toBeTruthy();
    expect(err(input({ title: 'я'.repeat(81) }))).toBeTruthy();
    expect(err(input({ note: 'я'.repeat(301) }))).toBeTruthy();
    expect(err(null)).toBeTruthy();
  });
  it('accepts and trims a valid body', () => {
    const r = validateRoutine({ ...input(), title: '  Ноги  ' });
    expect(r.ok && r.value.title).toBe('Ноги');
  });
});

describe('updateRoutine', () => {
  it('replaces the items and keeps the slug', () => {
    createRoutine(db, input());
    const r = updateRoutine(db, 'nogi-legkaya', input({ title: 'Другое имя', items: [{ exercise: hip, sec: { min: 45, max: 45 } }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.routine.id).toBe('nogi-legkaya');
    expect(r.routine.title).toBe('Другое имя');
    expect(r.routine.items).toHaveLength(1);
    expect(r.routine.totalSec).toBe(45);
  });
  it('returns not_found and duplicate', () => {
    expect(updateRoutine(db, 'zzz', input())).toEqual({ ok: false, error: 'not_found' });
    createRoutine(db, input());
    createRoutine(db, input({ title: 'Вторая' }));
    expect(updateRoutine(db, 'vtoraya', input())).toEqual({ ok: false, error: 'duplicate' });
  });
  it('does not change kind while the routine is used', () => {
    createRoutine(db, input());
    const uid = user();
    db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, warmup_routine_id, created_at) VALUES (?, 'T', '[]', '[]', ?, 'z')").run(uid, routineDbId('nogi-legkaya'));
    expect(updateRoutine(db, 'nogi-legkaya', input({ kind: 'cooldown' }))).toEqual({ ok: false, error: 'in_use' });
    expect(updateRoutine(db, 'nogi-legkaya', input({ title: 'Новое' })).ok).toBe(true);
  });
});

describe('renaming an exercise', () => {
  it('shows the new name in the routine', () => {
    createRoutine(db, input());
    expect(updateExercise(db, neck, { name: 'Шея новая' }).ok).toBe(true);
    expect(routineById(db, routineDbId('nogi-legkaya'))!.items[0]!.name).toBe('Шея новая');
  });
});

describe('listRoutines and getRoutine', () => {
  it('lists with counts and filters by kind', () => {
    createRoutine(db, input());
    createRoutine(db, input({ kind: 'cooldown', title: 'Растяжка' }));
    expect(listRoutines(db)).toHaveLength(2);
    expect(listRoutines(db, 'cooldown')).toEqual([{ id: 'rastyazhka', kind: 'cooldown', title: 'Растяжка', itemCount: 2, totalSec: 90, usedIn: 0 }]);
  });
  it('usedBy shows only the viewer workouts, usedIn counts all', () => {
    createRoutine(db, input());
    const a = user();
    const b = Number(db.prepare("INSERT INTO users (email, password_hash, role, created_at) VALUES ('b@b.c', 'x', 'athlete', 'z')").run().lastInsertRowid);
    const rid = routineDbId('nogi-legkaya');
    const ins = db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, warmup_routine_id, created_at) VALUES (?, ?, '[]', '[]', ?, 'z')");
    ins.run(a, 'Моя', rid);
    ins.run(b, 'Чужая', rid);
    const d = getRoutine(db, 'nogi-legkaya', a)!;
    expect(d.usedIn).toBe(2);
    expect(d.usedBy.map((w) => w.title)).toEqual(['Моя']);
    expect(getRoutine(db, 'zzz', a)).toBeNull();
  });
});

describe('deleteRoutine', () => {
  it('is refused while a workout uses it, then deletes with items', () => {
    createRoutine(db, input());
    const uid = user();
    const rid = routineDbId('nogi-legkaya');
    const w = Number(db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, warmup_routine_id, created_at) VALUES (?, 'T', '[]', '[]', ?, 'z')").run(uid, rid).lastInsertRowid);
    expect(deleteRoutine(db, 'nogi-legkaya')).toEqual({ ok: false, error: 'in_use', workouts: [{ workoutId: w, title: 'T' }] });
    db.prepare('UPDATE workouts SET warmup_routine_id = NULL').run();
    expect(deleteRoutine(db, 'nogi-legkaya')).toEqual({ ok: true });
    expect((db.prepare('SELECT COUNT(*) AS n FROM routine_items').get() as { n: number }).n).toBe(0);
    expect(deleteRoutine(db, 'nogi-legkaya')).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('deleteExercise', () => {
  it('returns in_use instead of throwing for an exercise in a routine', () => {
    createRoutine(db, input());
    expect(deleteExercise(db, neck)).toBe('in_use');
    expect(libraryOf(db).some((e) => e.id === neck)).toBe(true);
  });
});

describe('composeStructure and composeDisplay', () => {
  const main: Block[] = [{ id: 'b0', mode: 'sets', title: 'Силовая', restSec: 60, videoRounds: [], exercises: [{ id: 'b0-e0', name: 'Жим', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 }] }];
  const inlineWarmup: Block = { id: 'w', mode: 'timed', kind: 'warmup', title: 'Встроенная', exercises: [{ id: 'w-e0', name: 'Шея', kind: 'time', target: { min: 30, max: 30 } }] };
  const row = (structure: Block[] | null, links: { w?: number | null; c?: number | null } = {}) => ({
    structure: structure ? JSON.stringify(structure) : null,
    blocks: JSON.stringify([{ kind: 'exercises', heading: 'Силовая', items: [{ name: 'Жим', value: '3 × 8 · 60 кг' }] }]),
    warmup_routine_id: links.w ?? null,
    cooldown_routine_id: links.c ?? null,
  });

  it('returns the stored blocks when there are no links', () => {
    expect(composeStructure(db, row([inlineWarmup, ...main]))).toEqual([inlineWarmup, ...main]);
    expect(composeDisplay(db, row(null))).toEqual(JSON.parse(row(null).blocks));
  });
  it('returns null when the workout has no structure', () => {
    expect(composeStructure(db, row(null))).toBeNull();
  });
  it('wraps main blocks with linked routines', () => {
    createRoutine(db, input());
    createRoutine(db, input({ kind: 'cooldown', title: 'Растяжка' }));
    const w = routineDbId('nogi-legkaya');
    const c = routineDbId('rastyazhka');
    const out = composeStructure(db, row(main, { w, c }))!;
    expect(out.map((b) => b.id)).toEqual([`r${w}`, 'b0', `r${c}`]);
    expect(out[0]).toMatchObject({ mode: 'timed', kind: 'warmup', title: 'Ноги лёгкая' });
    expect(out[2]).toMatchObject({ kind: 'cooldown' });
    const display = composeDisplay(db, row(null, { w, c }));
    expect(display.map((b) => b.kind)).toEqual(['warmup', 'exercises', 'cooldown']);
    expect(display[0]!.items.map((i) => i.name)).toEqual(['Шея', 'Бедро']);
  });
  it('a routine with no items is skipped', () => {
    createRoutine(db, input());
    const w = routineDbId('nogi-legkaya');
    db.prepare('DELETE FROM routine_items WHERE routine_id = ?').run(w);
    expect(composeStructure(db, row(main, { w }))).toEqual(main);
    expect(composeDisplay(db, row(null, { w })).map((b) => b.kind)).toEqual(['exercises']);
  });
  it('linksOf reads both columns', () => {
    createRoutine(db, input());
    const uid = user();
    const w = routineDbId('nogi-legkaya');
    const id = Number(db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, warmup_routine_id, created_at) VALUES (?, 'T', '[]', '[]', ?, 'z')").run(uid, w).lastInsertRowid);
    expect(linksOf(db, id)).toEqual({ warmup_routine_id: w, cooldown_routine_id: null });
  });
});
