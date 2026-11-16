export { formatDelta, formatValue, parseInput, sanitizeInput } from '../../ui/measureNumbers';
import { formatDelta } from '../../ui/measureNumbers';
import type { MeasurementEntry, MeasurementKind } from '../../../../shared/types';

export type MeasurementField = {
  kind: MeasurementKind;
  label: string;
  unit: 'кг' | 'см';
  hint: string;
  /** Цвет линии на общем графике: var(--series-…) */
  color: string;
};

export const MEASUREMENT_FIELDS: ReadonlyArray<MeasurementField> = [
  {
    kind: 'weight',
    label: 'Вес',
    unit: 'кг',
    hint: 'Утром натощак, после туалета, в одной и той же одежде.',
    color: 'var(--series-weight)',
  },
  {
    kind: 'chest',
    label: 'Грудь',
    unit: 'см',
    hint: 'По самой выступающей точке, лента под мышками. На спокойном выдохе.',
    color: 'var(--series-chest)',
  },
  {
    kind: 'waist',
    label: 'Талия',
    unit: 'см',
    hint: 'Самое узкое место, чуть выше пупка. Лента параллельно полу, живот не втягивать.',
    color: 'var(--series-waist)',
  },
  {
    kind: 'belly',
    label: 'Живот',
    unit: 'см',
    hint: 'Ровно по линии пупка, на спокойном выдохе.',
    color: 'var(--series-belly)',
  },
  {
    kind: 'hips',
    label: 'Ягодицы',
    unit: 'см',
    hint: 'По самой выступающей точке ягодиц, ноги вместе.',
    color: 'var(--series-hips)',
  },
  {
    kind: 'thigh',
    label: 'Бедро',
    unit: 'см',
    hint: 'Самая широкая часть, сразу под ягодицей. Всегда одна и та же нога.',
    color: 'var(--series-thigh)',
  },
  {
    kind: 'arm',
    label: 'Рука',
    unit: 'см',
    hint: 'Середина плеча, рука расслаблена и опущена. Всегда одна и та же рука.',
    color: 'var(--series-arm)',
  },
  {
    kind: 'calf',
    label: 'Икры',
    unit: 'см',
    hint: 'Самая широкая часть голени, стоя, вес на обе ноги. Всегда одна и та же нога.',
    color: 'var(--series-calf)',
  },
];

export type Period = 'month' | 'all';

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

export function entriesInPeriod(entries: MeasurementEntry[], period: Period, today: string): MeasurementEntry[] {
  if (period === 'all' || entries.length < 2) return entries;
  const from = dayNumber(today) - 30;
  const recent = entries.filter((e) => dayNumber(e.date) >= from);
  return recent.length >= 2 ? recent : entries.slice(-2);
}

export type ChangeMode = 'percent' | 'units';

/** Изменение показателя относительно первого заполненного значения; null там, где не заполнен. */
export function changeSeries(entries: MeasurementEntry[], kind: MeasurementKind, mode: ChangeMode): Array<number | null> {
  let base: number | null = null;
  return entries.map((e) => {
    const v = e.values[kind];
    if (typeof v !== 'number') return null;
    if (base === null) base = v;
    if (mode === 'units') return v - base;
    return base === 0 ? null : ((v - base) / base) * 100;
  });
}

export function formatChange(d: number, mode: ChangeMode, unit: 'кг' | 'см'): string {
  return mode === 'percent' ? `${formatDelta(d)} %` : `${formatDelta(d)} ${unit}`;
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
