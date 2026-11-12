import { beforeEach, describe, expect, it } from 'vitest';
import type { CommitBlock } from '../shared/types';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { applyImport } from './imports';
import { clearDay, planOf, setDay } from './plan';
import { buildSchedule, moveEntry, rangeLabel, pausePlan, resumePlan, scheduleOf, skipEntry, unskipEntry } from './schedule';

let db: Db;
let me: number;
let other: number;
const clock = () => new Date('2026-11-02T10:00:00Z');
const blocks: CommitBlock[] = [{ kind: 'exercises', heading: 'Круг', items: [{ name: 'Упр', value: '10' }] }];
const seed = (userId: number, entries: Array<{ date: string; workout: number }>) =>
  applyImport(db, userId, { exercises: [], workouts: [{ title: 'Верх', blocks }, { title: 'Ноги', blocks }], entries, replaceDates: [], routines: [] }, clock);
const dates = (userId: number) => Object.entries(planOf(db, userId).entries).map(([d, e]) => `${d}:${e.templateId}`);

beforeEach(async () => {
  db = openDb(':memory:');
  me = await createUser(db, 'me@example.com', 'trenirovka7', 'athlete', clock);
  other = await createUser(db, 'other@example.com', 'trenirovka7', 'athlete', clock);
});

describe('rangeLabel', () => {
  it('в одном месяце и на стыке месяцев', () => {
    expect(rangeLabel('2026-11-09', '2026-11-15')).toBe('9–15 ноября');
    expect(rangeLabel('2026-11-30', '2026-12-06')).toBe('30 ноя – 6 дек');
  });
});

describe('buildSchedule', () => {
  const base = { today: '2026-11-02', from: '2026-11-02', workout: { id: 1, title: 'Верх' } };
  it('без тренировки переносить нечего', () => {
    expect(buildSchedule({ ...base, workout: null, titleByDate: new Map() })).toBeNull();
  });
  it('этой недели берёт ближайший свободный день, неделя после — семь дней', () => {
    const s = buildSchedule({ ...base, titleByDate: new Map([['2026-11-02', 'Верх'], ['2026-11-03', 'Ноги']]) })!;
    expect(s.sameWeek).toEqual({ date: '2026-11-04', weekday: 'ср', day: '4', relative: 'Послезавтра' });
    expect(s.workout.whenLabel).toBe('сегодня, пн 2 ноя');
    expect(s.nextWeek.rangeLabel).toBe('9–15 ноября');
    expect(s.nextWeek.days).toHaveLength(7);
  });
  it('если вся неделя занята, берёт завтрашний день с пометкой', () => {
    const titleByDate = new Map(['02', '03', '04', '05', '06', '07', '08'].map((d) => [`2026-11-${d}`, 'Ноги'] as const));
    expect(buildSchedule({ ...base, titleByDate })!.sameWeek).toEqual({ date: '2026-11-03', weekday: 'вт', day: '3', busy: 'Ноги', relative: 'Завтра' });
  });
  it('в воскресенье на этой неделе дней не осталось', () => {
    expect(buildSchedule({ ...base, from: '2026-11-08', titleByDate: new Map() })!.sameWeek).toBeNull();
  });
});

describe('buildSchedule: пропущенная тренировка', () => {
  const missed = { today: '2026-11-04', from: '2026-11-02', workout: { id: 1, title: 'Верх' } };
  it('варианты начинаются с сегодняшнего дня, прошлых дней нет', () => {
    const s = buildSchedule({ ...missed, titleByDate: new Map([['2026-11-02', 'Верх']]) })!;
    expect(s.sameWeek).toEqual({ date: '2026-11-04', weekday: 'ср', day: '4', relative: 'Сегодня' });
    expect(s.workout.whenLabel).toBe('пн 2 ноя');
  });
  it('занятый сегодня день пропускает, следующая неделя — после текущей', () => {
    const s = buildSchedule({ ...missed, titleByDate: new Map([['2026-11-04', 'Ноги']]) })!;
    expect(s.sameWeek).toEqual({ date: '2026-11-05', weekday: 'чт', day: '5', relative: 'Завтра' });
    expect(s.nextWeek.rangeLabel).toBe('9–15 ноября');
  });
  it('если свободных дней нет, берёт сегодня с пометкой занятости', () => {
    const titleByDate = new Map(['04', '05', '06', '07', '08'].map((d) => [`2026-11-${d}`, 'Ноги'] as const));
    expect(buildSchedule({ ...missed, titleByDate })!.sameWeek).toEqual({ date: '2026-11-04', weekday: 'ср', day: '4', busy: 'Ноги', relative: 'Сегодня' });
  });
  it('из прошлой недели переносит в текущую', () => {
    const s = buildSchedule({ today: '2026-11-04', from: '2026-10-28', workout: { id: 1, title: 'Верх' }, titleByDate: new Map() })!;
    expect(s.sameWeek!.date).toBe('2026-11-04');
    expect(s.nextWeek.rangeLabel).toBe('9–15 ноября');
  });
});

describe('skipEntry', () => {
  it('отмечает пропуск: запись остаётся в плане со статусом skipped, перенести её уже нельзя', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }]);
    expect(skipEntry(db, me, '2026-11-02')).toEqual({ ok: true });
    expect(planOf(db, me).entries['2026-11-02']).toMatchObject({ templateId: '1', status: 'skipped' });
    expect(scheduleOf(db, me, '2026-11-02', '2026-11-02')).toBeNull();
    expect(moveEntry(db, me, '2026-11-02', '2026-11-02', '2026-11-04')).toEqual({ ok: false, error: 'not_found' });
  });
  it('повторно пропустить нельзя, пропущенная и выполненная тренировки не пропускаются, чужой план не трогается', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }]);
    expect(skipEntry(db, me, '2026-11-02').ok).toBe(true);
    expect(skipEntry(db, me, '2026-11-02')).toEqual({ ok: false, error: 'not_found' });
    expect(skipEntry(db, me, '2026-11-03')).toEqual({ ok: false, error: 'not_found' });
    expect(skipEntry(db, other, '2026-11-02')).toEqual({ ok: false, error: 'not_found' });
  });
  it('из двух тренировок дня пропускает первую невыполненную', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }, { date: '2026-11-02', workout: 1 }]);
    skipEntry(db, me, '2026-11-02');
    expect(scheduleOf(db, me, '2026-11-02', '2026-11-02')!.workout.title).toBe('Ноги');
  });
  it('пропуск переживает перенос другой тренировки и удаление тренировки из плана', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }]);
    skipEntry(db, me, '2026-11-02');
    db.prepare('DELETE FROM plan_entries WHERE user_id = ?').run(me);
    expect(db.prepare('SELECT COUNT(*) AS n FROM plan_skips WHERE user_id = ?').get(me)).toEqual({ n: 1 });
  });
});

describe('unskipEntry', () => {
  it('возвращает пропущенную тренировку: её снова можно перенести и пропустить', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }]);
    skipEntry(db, me, '2026-11-02');
    expect(unskipEntry(db, me, '2026-11-02')).toEqual({ ok: true });
    expect(planOf(db, me).entries['2026-11-02']!.status).not.toBe('skipped');
    expect(scheduleOf(db, me, '2026-11-02', '2026-11-02')!.workout.title).toBe('Верх');
  });
  it('нечего возвращать и чужой план не трогается', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }]);
    expect(unskipEntry(db, me, '2026-11-02')).toEqual({ ok: false, error: 'not_found' });
    skipEntry(db, me, '2026-11-02');
    expect(unskipEntry(db, other, '2026-11-02')).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('scheduleOf и moveEntry', () => {
  it('варианты строятся из плана, выполненная тренировка не переносится', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }, { date: '2026-11-03', workout: 1 }]);
    expect(scheduleOf(db, me, '2026-11-02', '2026-11-02')!.workout.title).toBe('Верх');
    expect(scheduleOf(db, me, '2026-11-02', '2026-11-04')).toBeNull();
    expect(scheduleOf(db, other, '2026-11-02', '2026-11-02')).toBeNull();
    const wid = Number(planOf(db, me).entries['2026-11-02']!.templateId);
    db.prepare("INSERT INTO sessions_done (user_id, workout_id, title, date, finished_at, steps) VALUES (?, ?, 'Верх', '2026-11-02', 'x', '[]')").run(me, wid);
    expect(scheduleOf(db, me, '2026-11-02', '2026-11-02')).toBeNull();
  });
  it('перенос меняет запись плана', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }]);
    expect(moveEntry(db, me, '2026-11-02', '2026-11-02', '2026-11-04')).toEqual({ ok: true });
    expect(dates(me)).toHaveLength(1);
    expect(Object.keys(planOf(db, me).entries)).toEqual(['2026-11-04']);
  });
  it('в занятый день встаёт вторая тренировка', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }, { date: '2026-11-04', workout: 1 }]);
    moveEntry(db, me, '2026-11-02', '2026-11-02', '2026-11-04');
    expect(planOf(db, me).entries['2026-11-04']!.more).toHaveLength(1);
    expect(planOf(db, me).entries['2026-11-02']).toBeUndefined();
  });
  it('пропущенную тренировку можно перенести на сегодня', () => {
    seed(me, [{ date: '2026-10-30', workout: 0 }]);
    expect(scheduleOf(db, me, '2026-11-02', '2026-10-30')!.sameWeek!.date).toBe('2026-11-02');
    expect(moveEntry(db, me, '2026-11-02', '2026-10-30', '2026-11-02')).toEqual({ ok: true });
    expect(dates(me)).toEqual(['2026-11-02:1']);
  });
  it('отказы: нечего переносить, то же или прошлое число, чужой план', () => {
    seed(me, [{ date: '2026-11-02', workout: 0 }]);
    expect(moveEntry(db, me, '2026-11-02', '2026-11-05', '2026-11-06')).toEqual({ ok: false, error: 'not_found' });
    expect(moveEntry(db, me, '2026-11-02', '2026-11-02', '2026-11-02')).toEqual({ ok: false, error: 'bad_target' });
    expect(moveEntry(db, me, '2026-11-02', '2026-11-02', '2026-11-01')).toEqual({ ok: false, error: 'bad_target' });
    expect(moveEntry(db, other, '2026-11-02', '2026-11-02', '2026-11-04')).toEqual({ ok: false, error: 'not_found' });
    expect(dates(me)).toHaveLength(1);
  });
});

describe('перенос помнит исходный день', () => {
  const moves = (userId = me) => planOf(db, userId).moves;
  const wid = () => planOf(db, me).templates[0]!.id;
  it('перенос записывает исходную и новую дату', () => {
    seed(me, [{ date: '2026-11-04', workout: 0 }]);
    moveEntry(db, me, '2026-11-02', '2026-11-04', '2026-11-06');
    expect(moves()).toEqual([{ templateId: wid(), from: '2026-11-04', to: '2026-11-06' }]);
    expect(moves(other)).toEqual([]);
  });
  it('повторный перенос сохраняет самую первую дату', () => {
    seed(me, [{ date: '2026-11-04', workout: 0 }]);
    moveEntry(db, me, '2026-11-02', '2026-11-04', '2026-11-06');
    moveEntry(db, me, '2026-11-02', '2026-11-06', '2026-11-09');
    expect(moves()).toEqual([{ templateId: wid(), from: '2026-11-04', to: '2026-11-09' }]);
  });
  it('возврат на исходный день стирает перенос', () => {
    seed(me, [{ date: '2026-11-04', workout: 0 }]);
    moveEntry(db, me, '2026-11-02', '2026-11-04', '2026-11-06');
    moveEntry(db, me, '2026-11-02', '2026-11-06', '2026-11-04');
    expect(moves()).toEqual([]);
  });
  it('перенос исчезает, если тренировку с нового дня убрали', () => {
    seed(me, [{ date: '2026-11-04', workout: 0 }]);
    moveEntry(db, me, '2026-11-02', '2026-11-04', '2026-11-06');
    clearDay(db, me, '2026-11-06');
    expect(moves()).toEqual([]);
    setDay(db, me, '2026-11-06', Number(wid()));
    expect(moves()).toEqual([]);
  });
  it('перенос в день, где та же тренировка уже стоит, тоже запоминается', () => {
    seed(me, [{ date: '2026-11-04', workout: 0 }, { date: '2026-11-06', workout: 0 }]);
    moveEntry(db, me, '2026-11-02', '2026-11-04', '2026-11-06');
    expect(moves()).toEqual([{ templateId: wid(), from: '2026-11-04', to: '2026-11-06' }]);
  });
});

describe('пауза плана', () => {
  const rows = () => db.prepare('SELECT start_date, end_date FROM plan_pauses WHERE user_id = ? ORDER BY start_date').all(me);
  it('ставит паузу и проверяет диапазон', () => {
    expect(pausePlan(db, me, '2026-11-02', '2026-11-08', clock)).toEqual({ ok: true });
    expect(rows()).toEqual([{ start_date: '2026-11-02', end_date: '2026-11-08' }]);
    expect(pausePlan(db, me, '2026-11-08', '2026-11-02')).toEqual({ ok: false, error: 'bad_range' });
    expect(pausePlan(db, me, '2026-11-02', '2027-03-01')).toEqual({ ok: false, error: 'bad_range' });
  });
  it('новая пауза укорачивает идущую и заменяет будущую', () => {
    pausePlan(db, me, '2026-11-02', '2026-11-08', clock);
    pausePlan(db, me, '2026-11-05', '2026-11-20', clock);
    expect(rows()).toEqual([{ start_date: '2026-11-02', end_date: '2026-11-04' }, { start_date: '2026-11-05', end_date: '2026-11-20' }]);
  });
  it('возобновление: идущая заканчивается накануне, будущая удаляется, чужая не трогается', () => {
    pausePlan(db, me, '2026-11-02', '2026-11-08', clock);
    pausePlan(db, other, '2026-11-02', '2026-11-08', clock);
    expect(resumePlan(db, me, '2026-11-04')).toBe(true);
    expect(rows()).toEqual([{ start_date: '2026-11-02', end_date: '2026-11-03' }]);
    expect(resumePlan(db, me, '2026-11-02')).toBe(true);
    expect(rows()).toEqual([]);
    expect(resumePlan(db, me, '2026-11-02')).toBe(false);
    expect(db.prepare('SELECT COUNT(*) AS n FROM plan_pauses WHERE user_id = ?').get(other)).toEqual({ n: 1 });
  });
});
