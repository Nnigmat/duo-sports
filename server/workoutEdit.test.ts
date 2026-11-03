import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { updateWorkout } from './workoutEdit';

const blocks = [{ id: 'b1', mode: 'timed', title: 'Разминка', exercises: [{ id: 'x1', name: 'Бег', kind: 'time', target: { min: 60, max: 60 } }] }];
let db: Db;
let me: number;
let other: number;
let wid: number;

beforeEach(async () => {
  db = openDb(':memory:');
  me = await createUser(db, 'me@example.com', 'trenirovka7', 'athlete');
  other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete');
  wid = Number(db.prepare("INSERT INTO workouts (user_id, title, blocks, structure, created_at) VALUES (?, 'Было', '[]', '[]', 'x')").run(me).lastInsertRowid);
});

describe('updateWorkout', () => {
  it('спортсмен меняет свою тренировку', () => {
    const r = updateWorkout(db, { id: me, role: 'athlete' }, me, wid, { title: 'Стало', blocks });
    expect(r.ok).toBe(true);
    expect(db.prepare('SELECT title FROM workouts WHERE id = ?').get(wid)).toEqual({ title: 'Стало' });
  });
  it('чужую тренировку не меняет', () => {
    expect(updateWorkout(db, { id: other, role: 'athlete' }, me, wid, { title: 'Стало', blocks })).toEqual({ ok: false, error: 'forbidden' });
    expect(updateWorkout(db, { id: other, role: 'athlete' }, other, wid, { title: 'Стало', blocks })).toEqual({ ok: false, error: 'not_found' });
  });
});
