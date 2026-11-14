import { describe, expect, it } from 'vitest';
import { isMeasurementKind, MEASUREMENT_KINDS, MEASUREMENT_MAX, measurementDue, normalizeMeasurement } from './measurements';

describe('normalizeMeasurement', () => {
  it('округляет до 0,1', () => {
    expect(normalizeMeasurement(72.44)).toBe(72.4);
    expect(normalizeMeasurement(72)).toBe(72);
  });
  it('отвергает всё, что не конечное число в (0, 999]', () => {
    for (const bad of [0, -1, 1000, '72', Number.NaN, Number.POSITIVE_INFINITY, null, undefined, 0.04]) {
      expect(normalizeMeasurement(bad)).toBeNull();
    }
  });
  it('принимает верхнюю границу', () => {
    expect(normalizeMeasurement(MEASUREMENT_MAX)).toBe(999);
  });
});

describe('isMeasurementKind', () => {
  it('узнаёт показатели', () => {
    expect(isMeasurementKind('waist')).toBe(true);
    expect(isMeasurementKind('neck')).toBe(false);
    expect(isMeasurementKind(5)).toBe(false);
  });
  it('порядок показателей фиксирован', () => {
    expect(MEASUREMENT_KINDS).toEqual(['weight', 'chest', 'waist', 'belly', 'hips', 'thigh', 'arm']);
  });
});

describe('measurementDue', () => {
  const entry = (date: string) => ({ date, values: { weight: 70 } });
  const today = '2026-11-14';

  it('без замеров срок наступил, дней нет', () => {
    expect(measurementDue([], today)).toEqual({ due: true, daysSince: null });
  });
  it('13 дней назад: рано', () => {
    expect(measurementDue([entry('2026-11-01')], today)).toEqual({ due: false });
  });
  it('ровно 14 дней назад: пора', () => {
    expect(measurementDue([entry('2026-10-31')], today)).toEqual({ due: true, daysSince: 14 });
  });
  it('считает дни, когда прошло больше', () => {
    expect(measurementDue([entry('2026-10-01')], today)).toEqual({ due: true, daysSince: 44 });
  });
  it('берёт максимальную дату, порядок записей не важен', () => {
    expect(measurementDue([entry('2026-10-01'), entry('2026-11-10'), entry('2026-09-01')], today)).toEqual({ due: false });
  });
  it('замер с датой в будущем срок не наступает', () => {
    expect(measurementDue([entry('2026-11-20')], today)).toEqual({ due: false });
  });
  it('верно считает через границу месяца и года', () => {
    expect(measurementDue([entry('2025-12-31')], '2026-01-14')).toEqual({ due: true, daysSince: 14 });
  });
});
