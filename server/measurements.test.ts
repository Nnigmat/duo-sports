import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { type Db, openDb } from './db';
import { measurementsOf, saveMeasurement } from './measurements';

const TODAY = '2026-11-14';
const clock = () => new Date('2026-11-14T10:00:00Z');

let db: Db;
let a: number;
let b: number;

beforeEach(async () => {
  db = openDb(':memory:');
  a = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete', clock);
  b = await createUser(db, 'b@example.com', 'trenirovka7', 'athlete', clock);
});

const rows = () => (db.prepare('SELECT COUNT(*) AS n FROM measurements').get() as { n: number }).n;

describe('measurementsOf', () => {
  it('у нового пользователя пусто', () => {
    expect(measurementsOf(db, a)).toEqual({ entries: [] });
  });

  it('группирует по дате и округляет до 0,1', () => {
    const r = saveMeasurement(db, a, { date: TODAY, values: { weight: 72.04, waist: 80.5 } }, TODAY, clock);
    expect(r).toEqual({ ok: true });
    expect(measurementsOf(db, a)).toEqual({ entries: [{ date: TODAY, values: { weight: 72, waist: 80.5 } }] });
  });

  it('даты идут от старых к новым независимо от порядка сохранения', () => {
    saveMeasurement(db, a, { date: '2026-11-14', values: { weight: 72 } }, TODAY, clock);
    saveMeasurement(db, a, { date: '2026-10-31', values: { weight: 72.4 } }, TODAY, clock);
    saveMeasurement(db, a, { date: '2026-11-01', values: { arm: 31 } }, TODAY, clock);
    expect(measurementsOf(db, a).entries.map((e) => e.date)).toEqual(['2026-10-31', '2026-11-01', '2026-11-14']);
  });

  it('чужие замеры не видны', () => {
    saveMeasurement(db, a, { date: TODAY, values: { weight: 72 } }, TODAY, clock);
    expect(measurementsOf(db, b)).toEqual({ entries: [] });
  });
});

describe('saveMeasurement: обновление', () => {
  it('повторное сохранение за день обновляет показатель и не трогает остальные', () => {
    saveMeasurement(db, a, { date: TODAY, values: { weight: 72, waist: 81 } }, TODAY, clock);
    expect(saveMeasurement(db, a, { date: TODAY, values: { waist: 80 } }, TODAY, clock)).toEqual({ ok: true });
    expect(measurementsOf(db, a).entries).toEqual([{ date: TODAY, values: { weight: 72, waist: 80 } }]);
    expect(rows()).toBe(2);
  });

  it('двойное сохранение одного и того же не создаёт дублей и не падает', () => {
    const input = { date: TODAY, values: { weight: 72 } };
    expect(saveMeasurement(db, a, input, TODAY, clock)).toEqual({ ok: true });
    expect(saveMeasurement(db, a, input, TODAY, clock)).toEqual({ ok: true });
    expect(rows()).toBe(1);
  });

  it('дата на день вперёд допустима (часовой пояс)', () => {
    expect(saveMeasurement(db, a, { date: '2026-11-15', values: { weight: 72 } }, TODAY, clock)).toEqual({ ok: true });
  });
});

describe('saveMeasurement: отказы', () => {
  const bad: Array<[string, unknown]> = [
    ['пустые values', { date: TODAY, values: {} }],
    ['неизвестный показатель', { date: TODAY, values: { neck: 40 } }],
    ['значение строкой', { date: TODAY, values: { weight: '72' } }],
    ['ноль', { date: TODAY, values: { weight: 0 } }],
    ['отрицательное', { date: TODAY, values: { weight: -1 } }],
    ['больше 999', { date: TODAY, values: { weight: 1000 } }],
    ['NaN', { date: TODAY, values: { weight: Number.NaN } }],
    ['дата в чужом формате', { date: '14.11.2026', values: { weight: 72 } }],
    ['дата на 5 дней вперёд', { date: '2026-11-19', values: { weight: 72 } }],
    ['нет даты', { values: { weight: 72 } }],
    ['values не объект', { date: TODAY, values: [72] }],
    ['null', null],
    ['строка', 'x'],
    ['массив', []],
    ['один плохой среди хороших', { date: TODAY, values: { weight: 72, waist: 0 } }],
  ];
  it.each(bad)('%s → ошибка, база пуста', (_name, input) => {
    const r = saveMeasurement(db, a, input, TODAY, clock);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/[А-Яа-я]/);
    expect(rows()).toBe(0);
  });
});

describe('каскад', () => {
  it('удаление пользователя удаляет замеры', () => {
    saveMeasurement(db, a, { date: TODAY, values: { weight: 72 } }, TODAY, clock);
    db.prepare('DELETE FROM users WHERE id = ?').run(a);
    expect(rows()).toBe(0);
  });
});
