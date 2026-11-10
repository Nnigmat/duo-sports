import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { planOf } from './plan';
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
  it('после правки разминка и заминка остаются ими, а блок по таймеру без kind (планка) — основная часть', () => {
    const ex = (id: string) => ({ id, name: id === 'p' ? 'Планка' : id, kind: 'time', target: { min: 30, max: 30 } });
    const edited = [
      { id: 'b0', mode: 'timed', kind: 'warmup', title: 'Разминка', exercises: [ex('a')] },
      { id: 'b1', mode: 'timed', title: 'Планка', exercises: [ex('p')] },
      { id: 'b2', mode: 'timed', kind: 'cooldown', title: 'Заминка', exercises: [ex('d')] },
    ];
    expect(updateWorkout(db, { id: me, role: 'athlete' }, me, wid, { title: 'Стало', blocks: edited }).ok).toBe(true);
    const stored = JSON.parse((db.prepare('SELECT blocks FROM workouts WHERE id = ?').get(wid) as { blocks: string }).blocks) as Array<{ kind: string }>;
    expect(stored.map((b) => b.kind)).toEqual(['warmup', 'exercises', 'cooldown']);
    expect(planOf(db, me).templates[0]?.exercises.map((e) => e.name)).toEqual(['Планка']);
  });
  it('неизвестный kind блока отклоняется', () => {
    const bad = [{ id: 'b0', mode: 'timed', kind: 'main', title: 'Х', exercises: [{ id: 'a', name: 'a', kind: 'time', target: { min: 30, max: 30 } }] }];
    expect(updateWorkout(db, { id: me, role: 'athlete' }, me, wid, { title: 'Стало', blocks: bad })).toEqual({ ok: false, error: 'bad_request' });
  });
  it('чужую тренировку не меняет', () => {
    expect(updateWorkout(db, { id: other, role: 'athlete' }, me, wid, { title: 'Стало', blocks })).toEqual({ ok: false, error: 'forbidden' });
    expect(updateWorkout(db, { id: other, role: 'athlete' }, other, wid, { title: 'Стало', blocks })).toEqual({ ok: false, error: 'not_found' });
  });
});
