import { plural } from '../features/workout/flow/ru';

const NBSP = ' ';

/** 5840 → «5 840» с неразрывным пробелом между разрядами */
export function groupDigits(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** «≈ 50 мин» */
export function formatApproxMinutes(min: number): string {
  return `≈${NBSP}${min}${NBSP}мин`;
}

/** «48 мин» */
export function formatMinutes(min: number): string {
  return `${min}${NBSP}мин`;
}

/** «5 840 кг» */
export function formatVolume(kg: number): string {
  return `${groupDigits(kg)}${NBSP}кг`;
}

/** «5 упражнений», «2 рекорда» */
export function exerciseCount(n: number): string {
  return `${n} ${plural(n, ['упражнение', 'упражнения', 'упражнений'])}`;
}

export function recordsWord(n: number): string {
  return plural(n, ['рекорд', 'рекорда', 'рекордов']);
}

/** 95 → «1 ч 35 мин», 120 → «2 ч», 40 → «40 мин» */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return formatMinutes(m);
  return m === 0 ? `${h}${NBSP}ч` : `${h}${NBSP}ч${NBSP}${m}${NBSP}мин`;
}
