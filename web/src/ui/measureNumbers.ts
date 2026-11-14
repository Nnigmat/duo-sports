import { normalizeMeasurement } from '../../../shared/measurements';

/** Числа замеров: запятая как разделитель, «−» вместо дефиса. Лежат в ui, чтобы ui не зависел от features. */
export function formatValue(n: number): string {
  const r = Math.round(n * 10) / 10;
  const s = String(Math.abs(r)).replace('.', ',');
  return r < 0 ? `−${s}` : s;
}

export function formatDelta(d: number): string {
  if (Math.abs(d) < 0.05) return '0';
  return `${d > 0 ? '+' : '−'}${formatValue(Math.abs(d))}`;
}

export function sanitizeInput(raw: string): string {
  return raw.replace(/[^0-9.,]/g, '');
}

export function parseInput(raw: string): number | null {
  const s = raw.replace(/\s+/g, '');
  if (!/^\d*[.,]?\d*$/.test(s) || !/\d/.test(s)) return null;
  return normalizeMeasurement(Number(s.replace(',', '.')));
}
