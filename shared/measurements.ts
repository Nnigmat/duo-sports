import type { MeasurementKind } from './types';

export const MEASUREMENT_KINDS: readonly MeasurementKind[] = ['weight', 'chest', 'waist', 'belly', 'hips', 'thigh', 'arm'];

export const MEASUREMENT_MAX = 999;

export function isMeasurementKind(x: unknown): x is MeasurementKind {
  return typeof x === 'string' && (MEASUREMENT_KINDS as readonly string[]).includes(x);
}

/** Конечное число 0 < x ≤ 999 с округлением до 0,1; иначе null */
export function normalizeMeasurement(x: unknown): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  const r = Math.round(x * 10) / 10;
  return r > 0 && r <= MEASUREMENT_MAX ? r : null;
}
