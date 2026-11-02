/** Разбор и показ величин из YAML: повторы, время, вес, расстояние и короткая запись `do`. Всё чистые функции. */

export interface Range {
  min: number;
  max: number;
}
export type WeightUnit = 'kg' | 'lb';
export interface Weight extends Range {
  unit: WeightUnit;
}
export type DistanceUnit = 'm' | 'km' | 'mi';
export interface Distance {
  value: number;
  unit: DistanceUnit;
}
/** Повторы: диапазон или «сколько получится» */
export type Reps = Range | 'max';

const DASH = /\s*[-–—]\s*/;
const num = (s: string): number | null => {
  const n = Number(s.replace(',', '.'));
  return s.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
};

/** 10, "8-12", "8–12", max */
export function parseReps(v: unknown): Reps | null {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 ? { min: v, max: v } : null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (s === 'max') return 'max';
  const parts = s.split(DASH);
  if (parts.length === 1 && /^\d+$/.test(s)) return { min: Number(s), max: Number(s) };
  if (parts.length === 2 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number) as [number, number];
    return a <= b ? { min: a, max: b } : null;
  }
  return null;
}

const rangeText = (r: Range, fmt: (n: number) => string = String): string => (r.min === r.max ? fmt(r.min) : `${fmt(r.min)}–${fmt(r.max)}`);

export const formatReps = (r: Reps): string => (r === 'max' ? 'макс.' : rangeText(r));

/** Секунды из «45», «45s», «2m», «1h10m», «1:30» */
function seconds(s: string): number | null {
  const clock = /^(\d+):([0-5]\d)$/.exec(s);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Время: 45, "45s", "1:30", "5-7m" (диапазон с единицей на конце) */
export function parseDuration(v: unknown): Range | null {
  if (typeof v === 'number') return v >= 0 ? { min: v, max: v } : null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  const range = /^(\d+)\s*[-–—]\s*(\d+)\s*([smh])$/.exec(s);
  if (range) {
    const k = { s: 1, m: 60, h: 3600 }[range[3] as 's' | 'm' | 'h'];
    const a = Number(range[1]) * k;
    const b = Number(range[2]) * k;
    return a <= b ? { min: a, max: b } : null;
  }
  const one = seconds(s);
  return one === null ? null : { min: one, max: one };
}

const fmtSec = (n: number): string => {
  if (n < 60) return `${n} с`;
  if (n % 60 === 0) return `${n / 60} мин`;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

/** «30 с», «1:30», «5–7 мин» */
export function formatDuration(r: Range): string {
  if (r.min === r.max) return fmtSec(r.min);
  if (r.max < 60) return `${r.min}–${r.max} с`;
  if (r.min % 60 === 0 && r.max % 60 === 0) return `${r.min / 60}–${r.max / 60} мин`;
  return `${fmtSec(r.min)}–${fmtSec(r.max)}`;
}

/** Вес: 75, "75kg", "165lb", "7,5", "6-7"; без единицы берём `fallback` */
export function parseWeight(v: unknown, fallback: WeightUnit = 'kg'): Weight | null {
  if (typeof v === 'number') return v >= 0 ? { min: v, max: v, unit: fallback } : null;
  if (typeof v !== 'string') return null;
  const m = /^\s*([\d.,]+(?:\s*[-–—]\s*[\d.,]+)?)\s*(kg|lb)?\s*$/i.exec(v);
  if (!m) return null;
  const parts = m[1]!.split(DASH).map(num);
  if (parts.some((p) => p === null) || parts.length > 2) return null;
  const [a, b] = parts as number[];
  if (b !== undefined && a! > b) return null;
  return { min: a!, max: b ?? a!, unit: (m[2]?.toLowerCase() as WeightUnit | undefined) ?? fallback };
}

const WEIGHT_WORD: Record<WeightUnit, string> = { kg: 'кг', lb: 'lb' };
const fmtNum = (n: number) => String(n).replace('.', ',');

/** «75 кг», «7,5–9,5 кг» */
export const formatWeight = (w: Weight): string => `${rangeText(w, fmtNum)} ${WEIGHT_WORD[w.unit]}`;

/** Расстояние: "500m", "2km", "1.5mi" */
export function parseDistance(v: unknown): Distance | null {
  if (typeof v !== 'string') return null;
  const m = /^\s*([\d.,]+)\s*(m|km|mi)\s*$/i.exec(v);
  const value = m ? num(m[1]!) : null;
  return m && value !== null ? { value, unit: m[2]!.toLowerCase() as DistanceUnit } : null;
}

const DIST_WORD: Record<DistanceUnit, string> = { m: 'м', km: 'км', mi: 'миль' };
export const formatDistance = (d: Distance): string => `${fmtNum(d.value)} ${DIST_WORD[d.unit]}`;

export interface ShortLoad {
  sets: number;
  reps: Reps;
  weight?: Weight;
}

/** Короткая запись: "4x8 @ 75", "3x12", "3x8-12 @ 60", "5x5 @ 225lb", "3xmax" */
export function parseDo(v: unknown, fallback: WeightUnit = 'kg'): ShortLoad | null {
  if (typeof v !== 'string') return null;
  const m = /^\s*(\d+)\s*[x×хХ]\s*(\d+(?:\s*[-–—]\s*\d+)?|max)\s*(?:@\s*(.+?))?\s*$/i.exec(v);
  if (!m) return null;
  const reps = parseReps(m[2]);
  if (!reps || Number(m[1]) < 1) return null;
  const load: ShortLoad = { sets: Number(m[1]), reps };
  if (m[3]) {
    const weight = parseWeight(m[3], fallback);
    if (!weight) return null;
    load.weight = weight;
  }
  return load;
}
