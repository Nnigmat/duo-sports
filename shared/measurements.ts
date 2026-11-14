import type { MeasurementEntry, MeasurementKind } from './types';

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

/** Как часто ученик должен вносить замеры */
export const MEASUREMENT_INTERVAL_DAYS = 14;

/** daysSince === null: замеров ещё не было */
export type MeasurementDue = { due: false } | { due: true; daysSince: number | null };

const MS_PER_DAY = 86_400_000;

/** Целые дни между ISO-датами; через UTC, чтобы не зависеть от часового пояса и перехода на летнее время */
function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

/** Пора ли напомнить о замере: с последнего прошло не меньше MEASUREMENT_INTERVAL_DAYS дней или замеров нет */
export function measurementDue(entries: readonly MeasurementEntry[], todayIso: string): MeasurementDue {
  const last = entries.map((e) => e.date).sort().at(-1);
  if (last === undefined) return { due: true, daysSince: null };
  const daysSince = daysBetween(last, todayIso);
  return daysSince >= MEASUREMENT_INTERVAL_DAYS ? { due: true, daysSince } : { due: false };
}
