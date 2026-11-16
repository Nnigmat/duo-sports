import { describe, expect, it } from 'vitest';
import { MEASUREMENT_KINDS } from '../../../../shared/measurements';
import type { MeasurementEntry } from '../../../../shared/types';
import {
  changeSeries,
  entriesInPeriod,
  formatChange,
  formatDateLong,
  formatDateShort,
  formatDateWithWeekday,
  formatDelta,
  formatValue,
  lastBefore,
  MEASUREMENT_FIELDS,
  parseInput,
  sanitizeInput,
} from './measurements';

const weights = [74.2, 73.8, 73.5, 72.9, 72.4, 72.0];
const dates = ['2026-09-05', '2026-09-19', '2026-10-03', '2026-10-17', '2026-10-31', '2026-11-14'];
const entries: MeasurementEntry[] = dates.map((date, i) => ({ date, values: { weight: weights[i] } }));

describe('formatValue', () => {
  it('запятая, «−», целое без «,0»', () => {
    expect(formatValue(72.4)).toBe('72,4');
    expect(formatValue(72)).toBe('72');
    expect(formatValue(-0.5)).toBe('−0,5');
  });
});

describe('formatDelta', () => {
  it('ноль, плюс и минус', () => {
    expect(formatDelta(0.04)).toBe('0');
    expect(formatDelta(1.5)).toBe('+1,5');
    expect(formatDelta(-0.5)).toBe('−0,5');
  });
});

describe('parseInput', () => {
  it('принимает запятую и точку', () => {
    expect(parseInput('72,4')).toBe(72.4);
    expect(parseInput('72.4')).toBe(72.4);
    expect(parseInput('72,')).toBe(72);
    expect(parseInput(' 7 2 ')).toBe(72);
  });
  it('мусор и границы дают null', () => {
    for (const bad of ['', ',', 'abc', '1e3', '-5', '0', '1000']) {
      expect(parseInput(bad)).toBeNull();
    }
  });
});

describe('sanitizeInput', () => {
  it('оставляет цифры, запятую и точку', () => {
    expect(sanitizeInput('7a2,4 кг')).toBe('72,4');
  });
});

describe('lastBefore', () => {
  it('предыдущее значение строго до даты', () => {
    expect(lastBefore(entries, 'weight', '2026-11-14')).toBe(72.4);
    expect(lastBefore(entries, 'weight', '2026-09-05')).toBeNull();
  });
  it('пропускает замеры без показателя', () => {
    const e: MeasurementEntry[] = [
      { date: '2026-10-01', values: { waist: 80 } },
      { date: '2026-10-10', values: { weight: 70 } },
    ];
    expect(lastBefore(e, 'waist', '2026-11-01')).toBe(80);
    expect(lastBefore(e, 'weight', '2026-10-10')).toBeNull();
  });
});

describe('даты', () => {
  it('короткая и длинная', () => {
    expect(formatDateShort('2026-11-14')).toBe('14 ноя');
    expect(formatDateLong('2026-11-14')).toBe('14 ноября');
    expect(formatDateLong('2026-09-05')).toBe('5 сентября');
  });
});

describe('formatDateWithWeekday', () => {
  it('день недели с заглавной и длинная дата', () => {
    expect(formatDateWithWeekday('2026-11-14')).toBe('Суббота, 14 ноября');
    expect(formatDateWithWeekday('2026-11-16')).toBe('Понедельник, 16 ноября');
  });
});

describe('MEASUREMENT_FIELDS', () => {
  it('восемь полей в порядке макета, как MEASUREMENT_KINDS', () => {
    expect(MEASUREMENT_FIELDS.map((f) => f.kind)).toEqual([...MEASUREMENT_KINDS]);
    expect(MEASUREMENT_FIELDS[0]).toMatchObject({ label: 'Вес', unit: 'кг' });
    expect(MEASUREMENT_FIELDS.at(-1)).toMatchObject({ kind: 'calf', label: 'Икры', unit: 'см' });
  });
  it('у каждого поля свой токен цвета линии', () => {
    for (const f of MEASUREMENT_FIELDS) expect(f.color).toBe(`var(--series-${f.kind})`);
  });
});

describe('entriesInPeriod', () => {
  it('месяц: замеры за 30 дней, всё: все', () => {
    expect(entriesInPeriod(entries, 'month', '2026-11-14').map((e) => e.date)).toEqual([
      '2026-10-17',
      '2026-10-31',
      '2026-11-14',
    ]);
    expect(entriesInPeriod(entries, 'all', '2026-11-14')).toHaveLength(6);
  });
  it('старые замеры: два последних; один замер: он же', () => {
    const old: MeasurementEntry[] = ['2026-08-01', '2026-08-15', '2026-09-01'].map((date) => ({
      date,
      values: { weight: 70 },
    }));
    expect(entriesInPeriod(old, 'month', '2026-11-14').map((e) => e.date)).toEqual(['2026-08-15', '2026-09-01']);
    expect(entriesInPeriod(old.slice(0, 1), 'month', '2026-11-14')).toHaveLength(1);
  });
  it('в окне один замер: два последних, включая старый', () => {
    const mixed: MeasurementEntry[] = ['2026-09-01', '2026-10-01', '2026-11-10'].map((date) => ({
      date,
      values: { weight: 70 },
    }));
    expect(entriesInPeriod(mixed, 'month', '2026-11-14').map((e) => e.date)).toEqual(['2026-10-01', '2026-11-10']);
  });
});

describe('changeSeries', () => {
  it('вес в кг и в процентах', () => {
    const u = changeSeries(entries, 'weight', 'units');
    expect(u[0]).toBe(0);
    expect(u[5]).toBeCloseTo(-2.2);
    expect(changeSeries(entries, 'weight', 'percent')[5]).toBeCloseTo(-2.965, 3);
  });
  it('пропуски дают null, база — первое заполненное', () => {
    const sparse: MeasurementEntry[] = dates.map((date, i) => ({
      date,
      values: i === 2 ? { waist: 80 } : i === 4 ? { waist: 78 } : {},
    }));
    const r = changeSeries(sparse, 'waist', 'units');
    expect(r).toEqual([null, null, 0, null, -2, null]);
  });
  it('нигде не заполнен: все null, без NaN', () => {
    const r = changeSeries(entries, 'arm', 'percent');
    expect(r).toEqual([null, null, null, null, null, null]);
  });
});

describe('formatChange', () => {
  it('проценты и единицы', () => {
    expect(formatChange(-4.27, 'percent', 'см')).toBe('−4,3 %');
    expect(formatChange(0.01, 'percent', 'см')).toBe('0 %');
    expect(formatChange(-4, 'units', 'см')).toBe('−4 см');
    expect(formatChange(1.5, 'units', 'кг')).toBe('+1,5 кг');
  });
});
