export { chartGeometry } from '../../ui/LineChart/geometry';
export { formatDelta, formatValue, parseInput, sanitizeInput } from '../../ui/measureNumbers';
import type { MeasurementEntry, MeasurementKind } from '../../../../shared/types';

export type MeasurementField = { kind: MeasurementKind; label: string; unit: 'кг' | 'см'; hint: string };

export const MEASUREMENT_FIELDS: ReadonlyArray<MeasurementField> = [
  { kind: 'weight', label: 'Вес', unit: 'кг', hint: 'Утром натощак, после туалета, в одной и той же одежде.' },
  { kind: 'chest', label: 'Грудь', unit: 'см', hint: 'По самой выступающей точке, лента под мышками. На спокойном выдохе.' },
  {
    kind: 'waist',
    label: 'Талия',
    unit: 'см',
    hint: 'Самое узкое место, чуть выше пупка. Лента параллельно полу, живот не втягивать.',
  },
  { kind: 'belly', label: 'Живот', unit: 'см', hint: 'Ровно по линии пупка, на спокойном выдохе.' },
  { kind: 'hips', label: 'Ягодицы', unit: 'см', hint: 'По самой выступающей точке ягодиц, ноги вместе.' },
  {
    kind: 'thigh',
    label: 'Бедро',
    unit: 'см',
    hint: 'Самая широкая часть, сразу под ягодицей. Всегда одна и та же нога.',
  },
  {
    kind: 'arm',
    label: 'Рука',
    unit: 'см',
    hint: 'Середина плеча, рука расслаблена и опущена. Всегда одна и та же рука.',
  },
];

export type SeriesPoint = { date: string; value: number };
export type Period = 'month' | 'all';

export function seriesOf(entries: MeasurementEntry[], kind: MeasurementKind): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const e of entries) {
    const value = e.values[kind];
    if (typeof value === 'number') out.push({ date: e.date, value });
  }
  return out;
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

export function sliceByPeriod(series: SeriesPoint[], period: Period, today: string): SeriesPoint[] {
  if (period === 'all' || series.length < 2) return series;
  const from = dayNumber(today) - 30;
  const recent = series.filter((p) => dayNumber(p.date) >= from);
  return recent.length >= 2 ? recent : series.slice(-2);
}

export function lastBefore(entries: MeasurementEntry[], kind: MeasurementKind, date: string): number | null {
  let found: number | null = null;
  for (const e of entries) {
    const v = e.values[kind];
    if (e.date < date && typeof v === 'number') found = v;
  }
  return found;
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_LONG = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function formatDateLong(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_LONG[m - 1]}`;
}

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/** «Суббота, 14 ноября» */
export function formatDateWithWeekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${formatDateLong(iso)}`;
}
