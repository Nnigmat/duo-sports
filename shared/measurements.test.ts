import { describe, expect, it } from 'vitest';
import { isMeasurementKind, MEASUREMENT_KINDS, MEASUREMENT_MAX, normalizeMeasurement } from './measurements';

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
