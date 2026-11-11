import { beforeEach, describe, expect, it } from 'vitest';
import type { Block, CommitBlock, TimedBlock } from '../shared/types';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { createExercise } from './exercises';
import { migrateRoutines } from './migrateRoutines';
import { composeStructure, linksOf } from './routines';

let db: Db;
let me: number;

const timeEx = (name: string) => {
  const r = createExercise(db, { name, group: 'core', kind: 'time', muscles: [], aliases: [] });
  if (!r.ok) throw new Error('exercise');
};
const timed = (id: string, kind: 'warmup' | 'cooldown', title: string, items: Array<[string, number, [string, string]?]>, note?: string): TimedBlock => ({
  id,
  mode: 'timed',
  kind,
  title,
  ...(note ? { note } : {}),
  exercises: items.map(([name, sec, sides], i) => ({ id: `${id}-e${i}`, name, kind: 'time', pose: kind === 'warmup' ? 'stand' : 'stretch', target: { min: sec, max: sec }, ...(sides ? { sides } : {}) })),
});
const main: Block = { id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [{ id: 'b1-e0', name: 'Жим', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 }] };
const display = (kinds: Array<CommitBlock['kind']>): CommitBlock[] => kinds.map((kind) => ({ kind, heading: kind, items: [{ name: 'x', value: '1' }] }));
const addWorkout = (title: string, structure: Block[], blocks = display(structure.map((b) => (b.mode === 'timed' && b.kind ? b.kind : 'exercises')))) =>
  Number(db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, created_at) VALUES (?, ?, ?, ?, 'z')").run(me, title, JSON.stringify(blocks), JSON.stringify(structure)).lastInsertRowid);
const row = (id: number) => db.prepare('SELECT structure, blocks FROM workouts WHERE id = ?').get(id) as { structure: string; blocks: string };
const routineCount = () => (db.prepare('SELECT COUNT(*) AS n FROM routines').get() as { n: number }).n;

const neck = () => timed('b0', 'warmup', 'Разминка', [['Шея', 30], ['Бедро', 45, ['вправо', 'влево']]], 'Повторяйте за персонажем');

beforeEach(async () => {
  db = openDb(':memory:');
  me = await createUser(db, 'me@example.com', 'trenirovka7', 'athlete');
  timeEx('Шея');
  timeEx('Бедро');
  timeEx('Растяжка');
});

describe('migrateRoutines', () => {
  it('moves an inline warmup into a routine and links the workout', () => {
    const before = neck();
    const id = addWorkout('Верх', [before, main]);
    expect(migrateRoutines(db)).toMatchObject({ routines: 1, workouts: 1 });
    expect(JSON.parse(row(id).structure)).toEqual([main]);
    expect(JSON.parse(row(id).blocks).map((b: CommitBlock) => b.kind)).toEqual(['exercises']);
    const links = linksOf(db, id);
    expect(links.warmup_routine_id).not.toBeNull();
    const composed = composeStructure(db, { ...links, structure: row(id).structure })!;
    const w = composed[0] as TimedBlock;
    expect(composed).toHaveLength(2);
    expect(w).toMatchObject({ kind: 'warmup', title: 'Разминка', note: 'Повторяйте за персонажем' });
    expect(w.exercises.map((e) => [e.name, e.target, e.sides])).toEqual(before.exercises.map((e) => [e.name, e.target, e.sides]));
  });
  it('moves a cooldown too', () => {
    const id = addWorkout('Верх', [main, timed('b1', 'cooldown', 'Заминка', [['Растяжка', 40]])]);
    migrateRoutines(db);
    expect(linksOf(db, id).cooldown_routine_id).not.toBeNull();
    expect(JSON.parse(row(id).structure)).toEqual([main]);
  });
  it('identical blocks across workouts share one routine', () => {
    const a = addWorkout('А', [neck(), main]);
    const b = addWorkout('Б', [neck(), main]);
    expect(migrateRoutines(db)).toMatchObject({ routines: 1, workouts: 2 });
    expect(linksOf(db, a).warmup_routine_id).toBe(linksOf(db, b).warmup_routine_id);
  });
  it('different blocks make different routines with unique slugs', () => {
    addWorkout('А', [neck(), main]);
    addWorkout('Б', [timed('b0', 'warmup', 'Разминка', [['Шея', 60]]), main]);
    expect(migrateRoutines(db)).toMatchObject({ routines: 2, workouts: 2 });
    const slugs = (db.prepare('SELECT slug FROM routines').all() as Array<{ slug: string }>).map((r) => r.slug);
    expect(new Set(slugs).size).toBe(2);
  });
  it('a placeholder block without exercises stays inline', () => {
    const placeholder = timed('b0', 'warmup', 'Разминка', [['Разминка', 300]]);
    const id = addWorkout('Верх', [placeholder, main]);
    expect(migrateRoutines(db)).toMatchObject({ routines: 0, workouts: 0, warnings: [] });
    expect(JSON.parse(row(id).structure)).toEqual([placeholder, main]);
    expect(linksOf(db, id).warmup_routine_id).toBeNull();
  });
  it('running twice changes nothing', () => {
    const id = addWorkout('Верх', [neck(), main, timed('b2', 'cooldown', 'Заминка', [['Растяжка', 40]])]);
    migrateRoutines(db);
    const snapshot = JSON.stringify([row(id), linksOf(db, id), db.prepare('SELECT * FROM routines').all(), db.prepare('SELECT * FROM routine_items').all()]);
    expect(migrateRoutines(db)).toMatchObject({ routines: 0, workouts: 0 });
    expect(JSON.stringify([row(id), linksOf(db, id), db.prepare('SELECT * FROM routines').all(), db.prepare('SELECT * FROM routine_items').all()])).toBe(snapshot);
  });
  it('a workout whose only blocks were inline warmups keeps a valid structure', () => {
    const only = [neck()];
    const id = addWorkout('Только разминка', only);
    expect(migrateRoutines(db)).toMatchObject({ routines: 0, workouts: 0 });
    expect(JSON.parse(row(id).structure)).toEqual(only);
    expect(routineCount()).toBe(0);
  });
  it('a block with an exercise missing from the library stays inline and is reported', () => {
    const odd = timed('b0', 'warmup', 'Разминка', [['Шея', 30], ['Нет такого', 30]]);
    const id = addWorkout('Верх', [odd, main]);
    const r = migrateRoutines(db);
    expect(r).toMatchObject({ routines: 0, workouts: 0 });
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('Нет такого');
    expect(JSON.parse(row(id).structure)).toEqual([odd, main]);
    expect((db.prepare('SELECT COUNT(*) AS n FROM exercises').get() as { n: number }).n).toBe(3);
  });
  it('a warmup that is not first stays inline', () => {
    const id = addWorkout('Верх', [main, neck()]);
    migrateRoutines(db);
    expect(linksOf(db, id).warmup_routine_id).toBeNull();
  });
  it('a workout without structure is skipped', () => {
    db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, created_at) VALUES (?, 'Старая', '[]', NULL, 'z')").run(me);
    expect(migrateRoutines(db)).toMatchObject({ routines: 0, workouts: 0 });
  });
});
