import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { measurementsOf, saveMeasurement } from './measurements';
import { seedMeasurements } from './seedMeasurements';

const TODAY = '2026-11-16';
let db: Db;
let athlete: number;

beforeEach(async () => {
  db = openDb(':memory:');
  athlete = await createUser(db, 'a@example.com', 'secret-pass', 'athlete');
});

describe('seedMeasurements', () => {
  it('кладёт шесть дат раз в две недели, последняя — сегодня', () => {
    expect(seedMeasurements(db, athlete, TODAY)).toEqual({ ok: true, dates: 6 });
    const dates = measurementsOf(db, athlete).entries.map((e) => e.date).sort();
    expect(dates).toEqual(['2026-09-07', '2026-09-21', '2026-10-05', '2026-10-19', '2026-11-02', '2026-11-16']);
  });

  it('есть пропуски: каждый показатель кроме бёдер и икр пропущен хотя бы в одну дату', () => {
    seedMeasurements(db, athlete, TODAY);
    const entries = measurementsOf(db, athlete).entries;
    for (const kind of ['weight', 'chest', 'waist', 'belly', 'thigh', 'arm'] as const) {
      expect(entries.some((e) => e.values[kind] === undefined)).toBe(true);
    }
  });

  it('икры только в двух последних датах', () => {
    seedMeasurements(db, athlete, TODAY);
    const withCalf = measurementsOf(db, athlete).entries.filter((e) => e.values.calf !== undefined).map((e) => e.date).sort();
    expect(withCalf).toEqual(['2026-11-02', '2026-11-16']);
  });

  it('у ученика уже есть замеры: ничего не меняет', () => {
    saveMeasurement(db, athlete, { date: TODAY, values: { weight: 70 } }, TODAY);
    expect(seedMeasurements(db, athlete, TODAY)).toEqual({ ok: false, error: 'У пользователя уже есть замеры' });
    expect(measurementsOf(db, athlete).entries).toEqual([{ date: TODAY, values: { weight: 70 } }]);
  });
});
