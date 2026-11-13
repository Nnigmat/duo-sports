import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { createExercise } from './exercises';
import { planOf } from './plan';
import { createRoutine } from './routines';
import { workoutOf } from './workouts';
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

describe('updateWorkout и разминка по ссылке', () => {
  const actor = () => ({ id: me, role: 'athlete' as const });
  const ex = (id: string) => ({ id, name: id, kind: 'time', target: { min: 30, max: 30 } });
  const main = [{ id: 'm', mode: 'sets', title: 'Силовая', restSec: 60, videoRounds: [], exercises: [{ id: 'e0', name: 'Жим', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 }] }];
  let rid: number;
  const stored = () => db.prepare('SELECT structure, blocks, warmup_routine_id AS w FROM workouts WHERE id = ?').get(wid) as { structure: string; blocks: string; w: number | null };
  beforeEach(() => {
    const e = createExercise(db, { name: 'Шея', group: 'core', kind: 'time', muscles: [], aliases: [] });
    if (!e.ok) throw new Error('exercise');
    const r = createRoutine(db, { kind: 'warmup', title: 'Спина', items: [{ exercise: e.entry.id, sec: { min: 30, max: 30 } }] });
    if (!r.ok) throw new Error('routine');
    rid = (db.prepare('SELECT id FROM routines').get() as { id: number }).id;
    db.prepare('UPDATE workouts SET structure = ?, blocks = ?, warmup_routine_id = ? WHERE id = ?').run(JSON.stringify(main), '[]', rid, wid);
  });

  it('сохраняет только основные блоки и не трогает ссылку', () => {
    const r = updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: main });
    expect(r.ok).toBe(true);
    const row = stored();
    expect(row.w).toBe(rid);
    expect(JSON.parse(row.structure)).toEqual(main);
    expect(JSON.parse(row.blocks).map((b: { kind: string }) => b.kind)).toEqual(['exercises']);
  });
  it('блок разминки, присланный клиентом при ссылке, отбрасывается', () => {
    const sent = [{ id: `r${rid}`, mode: 'timed', kind: 'warmup', title: 'Спина', exercises: [ex(`r${rid}-e0`)] }, ...main];
    expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: sent }).ok).toBe(true);
    expect(JSON.parse(stored().structure)).toEqual(main);
    expect(stored().w).toBe(rid);
  });
  it('если после отбрасывания блоков не осталось, запрос отклоняется', () => {
    const sent = [{ id: `r${rid}`, mode: 'timed', kind: 'warmup', title: 'Спина', exercises: [ex(`r${rid}-e0`)] }];
    expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: sent })).toEqual({ ok: false, error: 'bad_request' });
  });
  it('без ссылки встроенная разминка по-прежнему принимается', () => {
    db.prepare('UPDATE workouts SET warmup_routine_id = NULL WHERE id = ?').run(wid);
    const inline = { id: 'w', mode: 'timed', kind: 'warmup', title: 'Встроенная', exercises: [ex('a')] };
    expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: [inline, ...main] }).ok).toBe(true);
    expect(JSON.parse(stored().structure)).toEqual([inline, ...main]);
  });
  it('ответ отдаёт собранную тренировку и список подключённых разминок', () => {
    const r = updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: main });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.blocks.map((b) => b.id)).toEqual([`r${rid}`, 'm']);
    expect(r.workout.routines).toEqual({ warmup: { id: 'spina', title: 'Спина' } });
  });
  describe('смена ссылок', () => {
    const links = () => db.prepare('SELECT warmup_routine_id AS w, cooldown_routine_id AS c FROM workouts WHERE id = ?').get(wid) as { w: number | null; c: number | null };
    let cid: number;
    beforeEach(() => {
      const slug = (db.prepare('SELECT slug FROM exercises LIMIT 1').get() as { slug: string }).slug;
      const c = createRoutine(db, { kind: 'cooldown', title: 'Растяжка', items: [{ exercise: slug, sec: { min: 30, max: 30 } }] });
      if (!c.ok) throw new Error('cooldown');
      cid = (db.prepare("SELECT id FROM routines WHERE kind = 'cooldown'").get() as { id: number }).id;
    });

    it('подключает заминку по slug и оставляет разминку, если её не трогали', () => {
      expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: main, cooldownRoutine: 'rastyazhka' }).ok).toBe(true);
      expect(links()).toEqual({ w: rid, c: cid });
    });
    it('null снимает ссылку', () => {
      expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: main, warmupRoutine: null }).ok).toBe(true);
      expect(links().w).toBeNull();
    });
    it('заменяет разминку другой и убирает присланный блок прежней', () => {
      const own = { id: 'w', mode: 'timed', kind: 'warmup', title: 'Своя', exercises: [ex('a')] };
      expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: [own, ...main], warmupRoutine: null }).ok).toBe(true);
      expect(JSON.parse(stored().structure)).toEqual([own, ...main]);
      expect(links().w).toBeNull();
    });
    it('неизвестный slug отклоняется', () => {
      expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: main, warmupRoutine: 'net-takoy' })).toEqual({ ok: false, error: 'bad_request' });
      expect(links().w).toBe(rid);
    });
    it('вид набора должен совпадать: заминку в разминку не поставить', () => {
      expect(updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: main, warmupRoutine: 'rastyazhka' })).toEqual({ ok: false, error: 'bad_request' });
    });
    it('ответ отдаёт новые ссылки', () => {
      const r = updateWorkout(db, actor(), me, wid, { title: 'Новое', blocks: main, cooldownRoutine: 'rastyazhka' });
      if (!r.ok) throw new Error(r.error);
      expect(r.workout.routines).toEqual({ warmup: { id: 'spina', title: 'Спина' }, cooldown: { id: 'rastyazhka', title: 'Растяжка' } });
    });
  });
  it('загрузка для редактора перечисляет подключённые разминки (тренер читает тем же workoutOf)', () => {
    const w = workoutOf(db, me, wid)!;
    expect(w.routines).toEqual({ warmup: { id: 'spina', title: 'Спина' } });
    expect(w.blocks).toHaveLength(2);
    db.prepare('UPDATE workouts SET warmup_routine_id = NULL WHERE id = ?').run(wid);
    expect(workoutOf(db, me, wid)).not.toHaveProperty('routines');
  });
});
