import { beforeEach, describe, expect, it } from 'vitest';
import type { CommitBlock, ImportCommit } from '../shared/types';
import { createUser } from './auth';
import { DEFAULT_EXERCISES } from './defaultExercises';
import { openDb, type Db } from './db';
import { createExercise } from './exercises';
import { createRoutine } from './routines';
import { applyImport, checkStructure, ensureLibrary, ImportForbiddenError, ImportInvalidError, libraryOf, planTitles, redoImport, undoImport, validateCommit } from './imports';

let db: Db;
let t = new Date('2026-11-02T14:20:00Z');
const clock = () => t;
const advance = (hours: number) => (t = new Date(new Date('2026-11-02T14:20:00Z').getTime() + hours * 3_600_000));
let me: number;
let other: number;

const blocks = (...names: string[]): CommitBlock[] => [
  { kind: 'warmup', heading: 'Разминка', text: 'Скакалка', items: [] },
  { kind: 'exercises', heading: 'Круг · 3 раунда', items: names.map((name) => ({ name, value: '10–12' })) },
];
const commit = (over: Partial<ImportCommit> = {}): ImportCommit => ({
  exercises: [{ id: 'reverse-pushup', name: 'Обратные отжимания', aliases: [], muscles: ['трицепс'], kind: 'reps', group: 'arms', video: 'https://youtu.be/x' } as never],
  workouts: [
    { id: 'w01-tue', title: 'Трицепс', blocks: blocks('Обратные отжимания') },
    { id: 'w01-thu', title: 'Спина', blocks: blocks('Подтягивания') },
  ],
  entries: [
    { date: '2026-11-03', workout: 0 },
    { date: '2026-11-05', workout: 1 },
  ],
  replaceDates: [],
  routines: [],
  ...over,
});
const count = (table: string, userId = me) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).get(userId) as { n: number }).n;

beforeEach(async () => {
  db = openDb(':memory:');
  t = new Date('2026-11-02T14:20:00Z');
  me = await createUser(db, 'me@example.com', 'trenirovka7', 'trainer', clock);
  other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete', clock);
  ensureLibrary(db, clock);
});

describe('библиотека и план', () => {
  it('стартовые упражнения кладутся один раз', () => {
    ensureLibrary(db, clock);
    expect(libraryOf(db)).toHaveLength(DEFAULT_EXERCISES.length);
    db.prepare('DELETE FROM exercises WHERE slug = ?').run('plank');
    ensureLibrary(db, clock);
    expect(libraryOf(db).find((e) => e.id === 'plank')).toBeUndefined();
  });
  it('библиотека общая для всех пользователей', () => {
    expect(libraryOf(db)).toHaveLength(DEFAULT_EXERCISES.length);
  });
  it('упражнение отдаётся в виде, нужном разбору', () => {
    expect(libraryOf(db).find((e) => e.id === 'barbell-squat')).toEqual({
      id: 'barbell-squat', name: 'Приседания со штангой', aliases: ['присед'], kind: 'weight', group: 'legs', muscles: ['квадрицепс', 'ягодицы'],
    });
  });
});

describe('импорт', () => {
  it('создаёт упражнения, тренировки и записи плана', () => {
    const r = applyImport(db, me, commit(), clock);
    expect(r.summary).toEqual({ workouts: 2, inCalendar: 2, created: 1, updated: 0 });
    expect(r.undoUntil).toBe('2026-11-03T14:20:00.000Z');
    expect(r.undoneAt).toBeNull();
    expect(libraryOf(db).find((e) => e.id === 'reverse-pushup')).toMatchObject({ name: 'Обратные отжимания', kind: 'reps', group: 'arms' });
    expect(planTitles(db, me)).toEqual({ '2026-11-03': 'Трицепс', '2026-11-05': 'Спина' });
    expect(planTitles(db, other)).toEqual({});
  });
  it('блоки записываются как есть', () => {
    applyImport(db, me, commit(), clock);
    const row = db.prepare("SELECT blocks FROM workouts WHERE slug = 'w01-tue'").get() as { blocks: string };
    expect(JSON.parse(row.blocks)).toEqual(blocks('Обратные отжимания'));
  });
  it('упражнение без id получает свой, повтор названия не плодит копий', () => {
    const e = { name: 'Лодочка', aliases: [], muscles: ['спина'], kind: 'reps' as const, group: 'back' as const };
    applyImport(db, me, commit({ exercises: [e, e] }), clock);
    const ids = libraryOf(db).filter((x) => x.name === 'Лодочка');
    expect(ids).toHaveLength(2);
    expect(new Set(ids.map((x) => x.id)).size).toBe(2);
    expect(ids[0]!.id).toMatch(/^my-/);
  });
  it('упражнение, которое уже есть, не перезаписывается и не считается созданным', () => {
    const e = { id: 'plank', name: 'Другая планка', aliases: [], muscles: [], kind: 'reps' as const, group: 'core' as const };
    const r = applyImport(db, me, commit({ exercises: [e] }), clock);
    expect(r.summary.created).toBe(0);
    expect(libraryOf(db).find((x) => x.id === 'plank')!.name).toBe('Планка');
  });
  it('«Заменить»: своя тренировка в этот день уходит, остальные остаются', () => {
    applyImport(db, me, commit({ workouts: [{ id: 'mine', title: 'Всё тело', blocks: blocks('Планка') }], entries: [{ date: '2026-11-05', workout: 0 }, { date: '2026-11-07', workout: 0 }], exercises: [] }), clock);
    applyImport(db, me, commit({ replaceDates: ['2026-11-05'] }), clock);
    expect(planTitles(db, me)).toEqual({ '2026-11-03': 'Трицепс', '2026-11-05': 'Спина', '2026-11-07': 'Всё тело' });
  });
  it('без replaceDates на дне остаются обе тренировки', () => {
    applyImport(db, me, commit({ workouts: [{ title: 'Своя', blocks: blocks('Планка') }], entries: [{ date: '2026-11-05', workout: 0 }], exercises: [] }), clock);
    applyImport(db, me, commit(), clock);
    expect(planTitles(db, me)['2026-11-05']).toBe('Своя + Спина');
  });
  it('повторный импорт по id обновляет тренировку, а не создаёт копию', () => {
    applyImport(db, me, commit(), clock);
    const r = applyImport(db, me, commit({ exercises: [], workouts: [{ id: 'w01-tue', title: 'Трицепс 2', blocks: blocks('Обратные отжимания') }, { id: 'w01-thu', title: 'Спина', blocks: blocks('Подтягивания') }] }), clock);
    expect(r.summary).toMatchObject({ updated: 2, inCalendar: 0 });
    expect(count('workouts')).toBe(2);
    expect(planTitles(db, me)['2026-11-03']).toBe('Трицепс 2');
  });
  it('чужой пользователь не видит и не трогает записи', () => {
    applyImport(db, me, commit(), clock);
    applyImport(db, other, commit({ exercises: [] }), clock);
    expect(count('workouts', me)).toBe(2);
    expect(count('workouts', other)).toBe(2);
    expect(count('plan_entries', other)).toBe(2);
  });
});

describe('права на упражнения', () => {
  it('тренер импортирует ученику: права проверяются по тренеру, данные пишутся ученику', () => {
    const r = applyImport(db, other, commit(), clock, me);
    expect(r.summary.created).toBe(1);
    expect(count('workouts', other)).toBe(2);
    expect(libraryOf(db).some((e) => e.id === 'reverse-pushup')).toBe(true);
  });

  it('спортсмен не добавляет упражнения, ничего не записывается', () => {
    expect(() => applyImport(db, other, commit(), clock)).toThrow('Упражнения добавляют тренер и админ');
    expect(count('workouts', other)).toBe(0);
    expect(libraryOf(db).some((e) => e.id === 'reverse-pushup')).toBe(false);
  });
  it('спортсмен импортирует тренировки с пустым разделом exercises', () => {
    applyImport(db, other, commit({ exercises: [] }), clock);
    expect(count('workouts', other)).toBe(2);
  });
  it('админ добавляет; существующее по slug не перезаписывается; отмена убирает только созданное', async () => {
    const admin = await createUser(db, 'adm@example.com', 'trenirovka7', 'admin', clock);
    const r = applyImport(db, admin, commit({ exercises: [{ id: 'plank', name: 'Другая планка', aliases: [], muscles: [], kind: 'time', group: 'core' }, ...commit().exercises] }), clock);
    expect(r.summary.created).toBe(1);
    expect(libraryOf(db).find((e) => e.id === 'plank')!.name).toBe('Планка');
    expect(undoImport(db, admin, r.id, clock).ok).toBe(true);
    expect(libraryOf(db).some((e) => e.id === 'reverse-pushup')).toBe(false);
    expect(libraryOf(db)).toHaveLength(DEFAULT_EXERCISES.length);
  });
  it('библиотека общая: упражнение тренера видно всем', () => {
    applyImport(db, me, commit(), clock);
    const e = libraryOf(db).find((x) => x.id === 'reverse-pushup');
    expect(e).toMatchObject({ name: 'Обратные отжимания' });
    expect(e).not.toHaveProperty('video'); // ключ video в файле импорта допустим, но молча игнорируется
  });
});

describe('отмена и возврат', () => {
  it('отмена убирает созданное: упражнения, тренировки, записи плана', () => {
    const r = applyImport(db, me, commit(), clock);
    advance(1);
    const u = undoImport(db, me, r.id, clock);
    expect(u.ok && u.record.undoneAt).toBe('2026-11-02T15:20:00.000Z');
    expect(planTitles(db, me)).toEqual({});
    expect(count('workouts')).toBe(0);
    expect(libraryOf(db).find((e) => e.id === 'reverse-pushup')).toBeUndefined();
    expect(libraryOf(db)).toHaveLength(DEFAULT_EXERCISES.length);
  });
  it('отмена возвращает заменённые тренировки и прежнее содержимое обновлённых', () => {
    applyImport(db, me, commit({ workouts: [{ id: 'mine', title: 'Всё тело', blocks: blocks('Планка') }], entries: [{ date: '2026-11-05', workout: 0 }], exercises: [] }), clock);
    applyImport(db, me, commit({ exercises: [], workouts: [{ id: 'w01-tue', title: 'Старое', blocks: blocks('Планка') }, { id: 'w01-thu', title: 'Спина', blocks: blocks('Планка') }] }), clock);
    const r = applyImport(db, me, commit({ exercises: [], workouts: [{ id: 'w01-tue', title: 'Новое', blocks: blocks('Планка') }, { id: 'w01-thu', title: 'Спина', blocks: blocks('Планка') }], replaceDates: ['2026-11-05'] }), clock);
    expect(planTitles(db, me)['2026-11-05']).toBe('Спина');
    expect(undoImport(db, me, r.id, clock).ok).toBe(true);
    expect(planTitles(db, me)['2026-11-03']).toBe('Старое');
    expect(planTitles(db, me)['2026-11-05']).toBe('Всё тело + Спина');
  });
  it('«Вернуть импорт» записывает то же самое ещё раз', () => {
    const r = applyImport(db, me, commit(), clock);
    undoImport(db, me, r.id, clock);
    const back = redoImport(db, me, r.id, clock);
    expect(back.ok && back.record.undoneAt).toBeNull();
    expect(back.ok && back.record.summary).toEqual(r.summary);
    expect(planTitles(db, me)).toEqual({ '2026-11-03': 'Трицепс', '2026-11-05': 'Спина' });
    expect(libraryOf(db).some((e) => e.id === 'reverse-pushup')).toBe(true);
  });
  it('нельзя отменить дважды и вернуть то, что не отменено', () => {
    const r = applyImport(db, me, commit(), clock);
    expect(redoImport(db, me, r.id, clock)).toEqual({ ok: false, error: 'bad_state' });
    undoImport(db, me, r.id, clock);
    expect(undoImport(db, me, r.id, clock)).toEqual({ ok: false, error: 'bad_state' });
  });
  it('через 24 часа отмена закрыта', () => {
    const r = applyImport(db, me, commit(), clock);
    advance(24);
    expect(undoImport(db, me, r.id, clock).ok).toBe(true);
    const r2 = applyImport(db, me, commit({ exercises: [], workouts: [{ title: 'Другая', blocks: blocks('Планка') }], entries: [] }), clock);
    advance(24 + 25);
    expect(undoImport(db, me, r2.id, clock)).toEqual({ ok: false, error: 'expired' });
    expect(redoImport(db, me, r2.id, clock)).toEqual({ ok: false, error: 'expired' });
  });
  it('чужой импорт не найден', () => {
    const r = applyImport(db, me, commit(), clock);
    expect(undoImport(db, other, r.id, clock)).toEqual({ ok: false, error: 'not_found' });
    expect(undoImport(db, me, 999, clock)).toEqual({ ok: false, error: 'not_found' });
    expect(planTitles(db, me)).not.toEqual({});
  });
});

describe('validateCommit', () => {
  const bad = (patch: Record<string, unknown>) => validateCommit({ ...commit(), ...patch });
  it('нормальное принимает', () => {
    expect(validateCommit(commit()).ok).toBe(true);
    expect(validateCommit(JSON.parse(JSON.stringify(commit()))).ok).toBe(true);
  });
  it('отказывает по форме', () => {
    expect(validateCommit(null).ok).toBe(false);
    expect(validateCommit('x').ok).toBe(false);
    expect(bad({ workouts: [] })).toMatchObject({ ok: false, error: 'workouts: список от 1 до 500' });
    expect(bad({ entries: [{ date: '2026-02-30', workout: 0 }] })).toMatchObject({ ok: false });
    expect(bad({ entries: [{ date: '2026-11-03', workout: 5 }] })).toMatchObject({ ok: false });
    expect(bad({ replaceDates: ['вчера'] })).toMatchObject({ ok: false });
    expect(bad({ exercises: [{ name: 'А', aliases: [], muscles: [], kind: 'yoga', group: 'legs' }] })).toMatchObject({ ok: false, error: 'exercises[0]: неверные поля' });
    expect(bad({ exercises: [{ id: 'bad id', name: 'А', aliases: [], muscles: [], kind: 'reps', group: 'legs' }] })).toMatchObject({ ok: false });
    expect(bad({ workouts: [{ title: 'Т', blocks: [{ kind: 'x', heading: 'h', items: [] }] }] })).toMatchObject({ ok: false, error: 'workouts[0]: неверные поля' });
  });
  it('отказывает по пределам', () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ title: `Т${i}`, blocks: blocks('Планка') }));
    expect(bad({ workouts: many })).toMatchObject({ ok: false });
    expect(bad({ workouts: [{ title: 'х'.repeat(201), blocks: blocks('Планка') }] })).toMatchObject({ ok: false });
  });
});

describe('импорт: набор со сторонами', () => {
  it('structure с sides записывается и читается без потерь', () => {
    const structure = [
      { id: 'b0', mode: 'timed', title: 'Разминка', exercises: [{ id: 'b0-e0', name: 'Вращение головой', kind: 'time', pose: 'stand', target: { min: 30, max: 30 }, sides: ['вправо', 'влево'] }] },
    ] as never;
    applyImport(db, me, commit({ workouts: [{ id: 'w1', title: 'Т', blocks: blocks('Подтягивания'), structure }], entries: [], replaceDates: [] }), clock);
    const row = db.prepare("SELECT structure FROM workouts WHERE slug = 'w1'").get() as { structure: string };
    expect(JSON.parse(row.structure)).toEqual(structure);
  });
});

describe('checkStructure: стороны', () => {
  const timed = (sides: unknown) => [
    {
      id: 'b0',
      mode: 'timed',
      title: 'Разминка',
      exercises: [{ id: 'b0-e0', name: 'Вращения головой', kind: 'time', target: { min: 30, max: 30 }, ...(sides === undefined ? {} : { sides }) }],
    },
  ];

  it('принимает sides из двух подписей', () => {
    expect(checkStructure(timed(['вправо', 'влево']))).toBe(true);
    expect(checkStructure(timed(undefined))).toBe(true);
  });
  it('отклоняет sides из одного элемента, с пустой строкой и не списком', () => {
    expect(checkStructure(timed(['вправо']))).toBe(false);
    expect(checkStructure(timed(['вправо', '']))).toBe(false);
    expect(checkStructure(timed(['а', 'б', 'в']))).toBe(false);
    expect(checkStructure(timed('вправо'))).toBe(false);
  });
  it('отклоняет sides вне таймерного блока', () => {
    const sets = [
      {
        id: 'b0', mode: 'sets', title: 'Силовая', restSec: 60, videoRounds: [],
        exercises: [{ id: 'b0-e0', name: 'Приседания', kind: 'reps', target: { min: 10, max: 10 }, sets: 3, sides: ['вправо', 'влево'] }],
      },
    ];
    expect(checkStructure(sets)).toBe(false);
  });
});

describe('разминки и заминки в импорте', () => {
  const routineRow = (slug: string) => db.prepare('SELECT id, import_id FROM routines WHERE slug = ?').get(slug) as { id: number; import_id: number | null } | undefined;
  const links = () => db.prepare("SELECT slug, warmup_routine_id AS w, cooldown_routine_id AS c FROM workouts WHERE user_id = ? ORDER BY id").all(me) as Array<{ slug: string; w: number | null; c: number | null }>;
  const timeEx = (name: string) => {
    const r = createExercise(db, { name, group: 'core', kind: 'time', muscles: [], aliases: [] });
    if (!r.ok) throw new Error('exercise');
    return r.entry.id;
  };
  const fileRoutine = (slug = 'legs-light', exercise = 'sheya') => ({ id: slug, kind: 'warmup' as const, title: 'Ноги лёгкая', items: [{ exercise, sec: { min: 30, max: 30 } }] });
  const withLink = (over: Partial<ImportCommit> = {}, link: Record<string, string> = { warmupRoutine: 'legs-light' }) =>
    commit({ exercises: [], workouts: [{ id: 'w01-tue', title: 'Трицепс', blocks: blocks('Отжимания'), ...link }], entries: [], ...over });
  beforeEach(() => {
    timeEx('Шея');
  });

  it('applyImport сохраняет разминки до тренировок и ставит ссылки', () => {
    const rec = applyImport(db, me, withLink({ routines: [fileRoutine()] }), clock);
    const row = routineRow('legs-light')!;
    expect(row.import_id).toBe(rec.id);
    expect(links()).toEqual([{ slug: 'w01-tue', w: row.id, c: null }]);
  });
  it('ссылка на готовую разминку библиотеки ничего не создаёт', () => {
    createRoutine(db, { kind: 'warmup', title: 'Ноги лёгкая', items: [{ exercise: 'sheya', sec: { min: 20, max: 20 } }] });
    const before = routineRow('nogi-legkaya')!;
    applyImport(db, other, withLink({}, { warmupRoutine: 'nogi-legkaya' }), clock);
    expect((db.prepare('SELECT COUNT(*) AS n FROM routines').get() as { n: number }).n).toBe(1);
    expect(db.prepare('SELECT warmup_routine_id AS w FROM workouts WHERE user_id = ?').get(other)).toEqual({ w: before.id });
  });
  it('существующий slug разминки не перезаписывается', () => {
    createRoutine(db, { kind: 'warmup', title: 'Старая', items: [{ exercise: 'sheya', sec: { min: 20, max: 20 } }] });
    db.prepare("UPDATE routines SET slug = 'legs-light'").run();
    applyImport(db, me, withLink({ routines: [fileRoutine()] }), clock);
    expect(db.prepare("SELECT title FROM routines WHERE slug = 'legs-light'").get()).toEqual({ title: 'Старая' });
    expect(links()[0]!.w).toBe(routineRow('legs-light')!.id);
  });
  it('validateCommit отклоняет ссылку на неизвестный slug', () => {
    const v = validateCommit(withLink({}, { warmupRoutine: 'nope' }), db);
    expect(v).toEqual({ ok: false, error: 'Неизвестная разминка: nope' });
    expect(validateCommit(withLink({ routines: [fileRoutine('nope')] }, { warmupRoutine: 'nope' }), db).ok).toBe(true);
  });
  it('validateCommit отклоняет разминку, подключённую как заминку', () => {
    const v = validateCommit(withLink({ routines: [fileRoutine()] }, { cooldownRoutine: 'legs-light' }), db);
    expect(v.ok).toBe(false);
  });
  it('validateCommit проверяет форму и пределы routines и ссылок', () => {
    const bad = (routines: unknown) => validateCommit(withLink({ routines: routines as never }), db).ok;
    expect(bad([fileRoutine()])).toBe(true);
    expect(bad('x')).toBe(false);
    expect(bad([{ ...fileRoutine(), items: [] }])).toBe(false);
    expect(bad([{ ...fileRoutine(), kind: 'main' }])).toBe(false);
    expect(bad([{ ...fileRoutine(), id: 'плохой slug' }])).toBe(false);
    expect(bad([{ ...fileRoutine(), items: [{ exercise: 'sheya', sec: { min: 0, max: 5 } }] }])).toBe(false);
    expect(bad(Array.from({ length: 31 }, (_, i) => fileRoutine(`r${i}`)))).toBe(false);
    expect(validateCommit(withLink({ routines: [fileRoutine()] }, { warmupRoutine: 5 as never }), db).ok).toBe(false);
  });
  it('validateCommit принимает старый запрос без routines', () => {
    const { routines: _omit, ...old } = commit();
    const v = validateCommit(old);
    expect(v.ok && v.commit.routines).toEqual([]);
  });
  it('спортсмен не может импортировать раздел routines, ссылки на готовые разрешены', () => {
    expect(() => applyImport(db, other, withLink({ routines: [fileRoutine()] }), clock)).toThrow(ImportForbiddenError);
    createRoutine(db, { kind: 'warmup', title: 'Готовая', items: [{ exercise: 'sheya', sec: { min: 20, max: 20 } }] });
    expect(() => applyImport(db, other, withLink({}, { warmupRoutine: 'gotovaya' }), clock)).not.toThrow();
  });
  it('упражнение разминки, которого нет, откатывает весь импорт с понятной ошибкой', () => {
    const c = withLink({ routines: [fileRoutine('legs-light', 'net-takogo')] });
    expect(() => applyImport(db, me, c, clock)).toThrow(ImportInvalidError);
    expect(count('workouts')).toBe(0);
    expect(routineRow('legs-light')).toBeUndefined();
  });

  it('отмена убирает созданные импортом разминки, если на них никто не ссылается', () => {
    const rec = applyImport(db, me, withLink({ routines: [fileRoutine()] }), clock);
    undoImport(db, me, rec.id, clock);
    expect(routineRow('legs-light')).toBeUndefined();
    expect(count('workouts')).toBe(0);
  });
  it('отмена оставляет разминку, на которую ссылается другая тренировка', () => {
    const rec = applyImport(db, me, withLink({ routines: [fileRoutine()] }), clock);
    applyImport(db, other, withLink({}, { warmupRoutine: 'legs-light' }), clock);
    expect(undoImport(db, me, rec.id, clock).ok).toBe(true);
    expect(routineRow('legs-light')).toBeDefined();
    expect(db.prepare('SELECT warmup_routine_id AS w FROM workouts WHERE user_id = ?').get(other)).toEqual({ w: routineRow('legs-light')!.id });
  });
  it('упражнение, созданное импортом и стоящее в разминке, при отмене остаётся', () => {
    const ex = { id: 'kot', name: 'Кот', aliases: [], muscles: [], kind: 'time' as const, group: 'core' as const };
    const rec = applyImport(db, me, withLink({ exercises: [ex], routines: [fileRoutine('legs-light', 'kot')] }), clock);
    applyImport(db, other, withLink({}, { warmupRoutine: 'legs-light' }), clock);
    expect(undoImport(db, me, rec.id, clock).ok).toBe(true);
    expect(libraryOf(db).some((e) => e.id === 'kot')).toBe(true);
  });
  it('«Вернуть» восстанавливает разминки и ссылки', () => {
    const rec = applyImport(db, me, withLink({ routines: [fileRoutine()] }), clock);
    undoImport(db, me, rec.id, clock);
    expect(redoImport(db, me, rec.id, clock).ok).toBe(true);
    expect(links()).toEqual([{ slug: 'w01-tue', w: routineRow('legs-light')!.id, c: null }]);
  });
  it('обновлённая тренировка при отмене получает прежние ссылки', () => {
    createRoutine(db, { kind: 'warmup', title: 'Старая', items: [{ exercise: 'sheya', sec: { min: 20, max: 20 } }] });
    applyImport(db, me, withLink({}, { warmupRoutine: 'staraya' }), clock);
    const old = routineRow('staraya')!.id;
    const rec = applyImport(db, me, withLink({ routines: [fileRoutine()] }), clock);
    expect(links()[0]!.w).toBe(routineRow('legs-light')!.id);
    undoImport(db, me, rec.id, clock);
    expect(links()).toEqual([{ slug: 'w01-tue', w: old, c: null }]);
  });
});
