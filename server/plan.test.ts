import { beforeEach, describe, expect, it } from 'vitest';
import type { Block, CommitBlock, Exercise } from '../shared/types';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { createExercise } from './exercises';
import { applyImport } from './imports';
import { createRoutine } from './routines';
import { clearDay, copyWorkoutToAthlete, estimateMinutes, estimateWorkoutMinutes, planOf, setDay } from './plan';

let db: Db;
let me: number;
let other: number;
const clock = () => new Date('2026-11-02T10:00:00Z');
const blocks = (n: number): CommitBlock[] => [
  { kind: 'warmup', heading: 'Разминка', items: [{ name: 'Суставная', value: '2 мин' }] },
  { kind: 'exercises', heading: 'Круг', items: Array.from({ length: n }, (_, i) => ({ name: `Упр ${i + 1}`, value: '10' })) },
];
const importTwo = (userId: number) =>
  applyImport(db, userId, {
    exercises: [],
    workouts: [{ title: 'Верх', blocks: blocks(3) }, { title: 'Ноги', blocks: blocks(5) }],
    entries: [{ date: '2026-11-03', workout: 0 }, { date: '2026-11-05', workout: 1 }, { date: '2026-11-05', workout: 0 }],
    replaceDates: [], routines: [],
  }, clock);

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Упр ${i + 1}`, value: '10 повторений' }));
const block = (kind: CommitBlock['kind'], n: number): CommitBlock => ({ kind, heading: kind, items: items(n) });

beforeEach(async () => {
  db = openDb(':memory:');
  me = await createUser(db, 'me@example.com', 'trenirovka7', 'athlete', clock);
  other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete', clock);
});

describe('planOf', () => {
  it('пустой план у нового пользователя', () => {
    expect(planOf(db, me)).toEqual({ templates: [], entries: {}, moves: [] });
  });
  it('тренировки становятся шаблонами с упражнениями и оценкой длительности', () => {
    importTwo(me);
    const { templates } = planOf(db, me);
    expect(templates.map((t) => [t.title, t.minutes, t.exercises.length])).toEqual([['Верх', 25, 3], ['Ноги', 35, 5]]);
    expect(templates[0]!.exercises[0]).toEqual({ name: 'Упр 1', detail: '10' });
    expect(templates.map((t) => t.tone)).toEqual(['primary', 'teal']);
  });
  it('разминка и заминка не попадают в состав, в оценку входят по десять минут', () => {
    applyImport(db, me, {
      exercises: [],
      workouts: [{ title: 'Ноги', blocks: [
        { kind: 'warmup', heading: 'Разминка', items: Array.from({ length: 20 }, (_, i) => ({ name: `Р${i}`, value: '00:30' })) },
        { kind: 'exercises', heading: 'Круг', items: [{ name: 'Выпады', value: '16–20 повт' }] },
        { kind: 'cooldown', heading: 'Заминка', items: [{ name: 'Бабочка', value: '00:45' }] },
      ] }],
      entries: [], replaceDates: [], routines: [],
    }, clock);
    const [t] = planOf(db, me).templates;
    expect(t!.exercises).toEqual([{ name: 'Выпады', detail: '16–20 повт' }]);
    expect(t!.minutes).toBe(25);
  });
  it('у выполненного дня в записи есть sessionId разбора', () => {
    importTwo(me);
    const верх = planOf(db, me).templates[0]!.id;
    const sid = Number(db.prepare("INSERT INTO sessions_done (user_id, workout_id, title, date, finished_at, steps, videos) VALUES (?, ?, 'Верх', '2026-11-03', 'x', '[]', 0)").run(me, Number(верх)).lastInsertRowid);
    const { entries } = planOf(db, me);
    expect(entries['2026-11-03']).toMatchObject({ status: 'done', sessionId: sid });
    expect(entries['2026-11-05']!.sessionId).toBeUndefined();
  });
  it('записи по дням; вторая тренировка дня попадает в more', () => {
    importTwo(me);
    const { entries, templates } = planOf(db, me);
    const [верх, ноги] = templates;
    expect(entries['2026-11-03']).toEqual({ templateId: верх!.id, status: 'planned', custom: true });
    expect(entries['2026-11-05']).toMatchObject({ templateId: верх!.id, more: ['Ноги'] });
    expect(ноги).toBeDefined();
  });
  it('чужой план не виден', () => {
    importTwo(me);
    expect(planOf(db, other)).toEqual({ templates: [], entries: {}, moves: [] });
  });
  it('оценка длительности кратна пяти и не меньше 15', () => {
    const main = (n: number): CommitBlock => ({ kind: 'exercises', heading: 'Основа', items: items(n) });
    expect([0, 1, 3, 4, 10].map((n) => estimateWorkoutMinutes([main(n)]))).toEqual([15, 15, 15, 20, 50]);
    for (const n of [0, 1, 2, 7]) {
      const m = estimateWorkoutMinutes([block('warmup', 3), main(n), block('cooldown', 3)]);
      expect(m % 5).toBe(0);
      expect(m).toBeGreaterThanOrEqual(15);
    }
  });
  it('число пунктов разминки и заминки не умножается на пять минут', () => {
    const few = estimateWorkoutMinutes([block('warmup', 1), block('exercises', 5), block('cooldown', 1)]);
    const many = estimateWorkoutMinutes([block('warmup', 30), block('exercises', 5), block('cooldown', 30)]);
    expect(many).toBe(few);
    expect(many).toBe(45);
  });
  it('без разминки и заминки не больше, чем с ними', () => {
    const bare = estimateWorkoutMinutes([block('exercises', 4)]);
    expect(bare).toBeLessThanOrEqual(estimateWorkoutMinutes([block('warmup', 2), block('exercises', 4), block('cooldown', 2)]));
    expect(estimateWorkoutMinutes([block('warmup', 0), block('exercises', 4)])).toBe(bare);
  });
});

describe('setDay и clearDay', () => {
  it('ставит тренировку в пустой день и заменяет стоявшие', () => {
    importTwo(me);
    const [верх, ноги] = planOf(db, me).templates;
    expect(setDay(db, me, '2026-11-05', Number(ноги!.id))).toEqual({ ok: true });
    expect(planOf(db, me).entries['2026-11-05']).toEqual({ templateId: ноги!.id, status: 'planned', custom: true });
    setDay(db, me, '2026-11-07', Number(верх!.id));
    expect(planOf(db, me).entries['2026-11-07']?.templateId).toBe(верх!.id);
  });
  it('чужую тренировку поставить нельзя, план при этом не меняется', () => {
    importTwo(me);
    importTwo(other);
    const foreign = Number(planOf(db, other).templates[0]!.id);
    expect(setDay(db, me, '2026-11-03', foreign)).toEqual({ ok: false, error: 'not_found' });
    expect(planOf(db, me).entries['2026-11-03']).toBeDefined();
    expect(setDay(db, me, '2026-11-03', 9999)).toEqual({ ok: false, error: 'not_found' });
  });
  it('убирает день у себя, у других ничего не трогает; сама тренировка остаётся', () => {
    importTwo(me);
    importTwo(other);
    clearDay(db, me, '2026-11-05');
    expect(planOf(db, me).entries['2026-11-05']).toBeUndefined();
    expect(planOf(db, me).templates).toHaveLength(2);
    expect(planOf(db, other).entries['2026-11-05']).toBeDefined();
  });
});

describe('copyWorkoutToAthlete', () => {
  it('создаёт другому ученику свою тренировку с тем же составом и ставит в день', () => {
    importTwo(me);
    const src = planOf(db, me).templates[0]!;
    expect(copyWorkoutToAthlete(db, me, Number(src.id), other, '2026-11-10')).toEqual({ ok: true });
    const theirs = planOf(db, other);
    const copy = theirs.templates.find((t) => t.id === theirs.entries['2026-11-10']?.templateId)!;
    expect(copy.id).not.toBe(src.id);
    expect(copy.title).toBe(src.title);
    expect(copy.exercises).toEqual(src.exercises);
    expect(planOf(db, me).templates).toHaveLength(2);
  });
  it('чужую тренировку не копирует', () => {
    importTwo(other);
    const foreign = Number(planOf(db, other).templates[0]!.id);
    expect(copyWorkoutToAthlete(db, me, foreign, other, '2026-11-10')).toEqual({ ok: false, error: 'not_found' });
    expect(planOf(db, other).templates).toHaveLength(2);
  });
});

describe('разминка по ссылке', () => {
  const linkWarmup = (userId: number, title: string) => {
    const ex = createExercise(db, { name: 'Шея', group: 'core', kind: 'time', muscles: [], aliases: [] });
    if (!ex.ok) throw new Error('exercise');
    const r = createRoutine(db, { kind: 'warmup', title: 'Р', items: [{ exercise: ex.entry.id, sec: { min: 30, max: 30 } }] });
    if (!r.ok) throw new Error('routine');
    const rid = (db.prepare('SELECT id FROM routines').get() as { id: number }).id;
    db.prepare('UPDATE workouts SET warmup_routine_id = ? WHERE user_id = ? AND title = ?').run(rid, userId, title);
    return rid;
  };
  const mainOnly = (userId: number) =>
    applyImport(db, userId, { exercises: [], workouts: [{ title: 'Верх', blocks: [block('exercises', 3)] }], entries: [], replaceDates: [], routines: [] }, clock);

  it('estimateWorkoutMinutes считает подключённую разминку, состав дня без неё', () => {
    mainOnly(me);
    expect(planOf(db, me).templates[0]).toMatchObject({ minutes: 15 });
    linkWarmup(me, 'Верх');
    const t = planOf(db, me).templates[0]!;
    expect(t.minutes).toBe(25);
    expect(t.exercises).toHaveLength(3);
  });
  it('копия тренировки сохраняет ссылки', () => {
    mainOnly(me);
    const rid = linkWarmup(me, 'Верх');
    const src = planOf(db, me).templates[0]!;
    copyWorkoutToAthlete(db, me, Number(src.id), other, '2026-11-10');
    const copy = db.prepare('SELECT warmup_routine_id, cooldown_routine_id FROM workouts WHERE user_id = ?').get(other);
    expect(copy).toEqual({ warmup_routine_id: rid, cooldown_routine_id: null });
    expect(planOf(db, other).templates[0]!.minutes).toBe(25);
  });
});

describe('estimateMinutes по структуре', () => {
  const ex = (id: string, max: number, extra: Partial<Exercise> = {}): Exercise => ({ id, name: id, kind: 'reps', target: { min: max, max }, ...extra });
  it('считает подходы с отдыхом, а не только число упражнений', () => {
    const structure: Block[] = [{ id: 'a', mode: 'sets', title: 'Основа', restSec: 90, videoRounds: [], exercises: [{ ...ex('x', 20), sets: 4 }, { ...ex('y', 0), sets: 4 }, { ...ex('z', 30, { kind: 'time' }), sets: 4 }] }];
    // 4 × (80 + 90) + 4 × (40 + 90) + 4 × (30 + 90) + 3 × 20 = 1740 с = 29 мин → 30
    expect(estimateMinutes([], structure)).toBe(30);
  });
  it('круги и разминка из структуры', () => {
    const structure: Block[] = [
      { id: 'w', mode: 'timed', kind: 'warmup', title: 'Разминка', exercises: [ex('a', 60, { kind: 'time' }), ex('b', 30, { kind: 'time', sides: ['л', 'п'] })] },
      { id: 'c', mode: 'circuit', title: 'Круг', rounds: 4, restSec: 60, videoRounds: [], exercises: [ex('x', 15), ex('y', 20)] },
    ];
    // 120 + 4 × (60 + 80 + 120) + 20 = 1180 с ≈ 20 мин
    expect(estimateMinutes([], structure)).toBe(20);
  });
  it('прошлые прохождения важнее расчёта: берём медиану', () => {
    const structure: Block[] = [{ id: 'c', mode: 'circuit', title: 'Круг', rounds: 3, restSec: 60, videoRounds: [], exercises: [ex('x', 15)] }];
    expect(estimateMinutes([], structure, [3300, 3600, 4200])).toBe(60);
    expect(estimateMinutes([], structure, [])).toBe(estimateMinutes([], structure));
  });
  it('реальное время подхода по упражнению важнее REP_SEC', () => {
    const structure: Block[] = [{ id: 'c', mode: 'circuit', title: 'Круг', rounds: 3, restSec: 60, videoRounds: [], exercises: [ex('x', 20)] }];
    // по умолчанию 3 × (80 + 60) + 20 = 440 с → 15 мин (минимум); с замером 600 с: 3 × (600 + 60) + 20 = 2000 с → 35 мин
    expect(estimateMinutes([], structure, [], new Map([['x', 600]]))).toBe(35);
  });
  it('без структуры считает по блокам', () => {
    expect(estimateMinutes([block('exercises', 4)], null)).toBe(estimateWorkoutMinutes([block('exercises', 4)]));
  });
});
