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

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** '2026-10-12' или ISO-время → «12 окт»; день берётся из записи, без пересчёта в пояс */
export function formatShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
}

/** «1 комментарий», «4 комментария», «5 комментариев» */
export function commentsCount(n: number): string {
  return `${n} ${plural(n, ['комментарий', 'комментария', 'комментариев'])}`;
}

/** «сегодня в 9:05», «вчера в 19:40», «31 окт в 19:40»; по местному времени */
export function formatReviewedAt(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return `сегодня в ${time}`;
  if (diff === 1) return `вчера в ${time}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} в ${time}`;
}
