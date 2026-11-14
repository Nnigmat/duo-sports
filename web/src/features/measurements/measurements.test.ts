import { describe, expect, it } from 'vitest';
import type { MeasurementEntry } from '../../../../shared/types';
import {
  chartGeometry,
  formatDateLong,
  formatDateShort,
  formatDateWithWeekday,
  formatDelta,
  formatValue,
  lastBefore,
  MEASUREMENT_FIELDS,
  parseInput,
  sanitizeInput,
  seriesOf,
  sliceByPeriod,
} from './measurements';

const weights = [74.2, 73.8, 73.5, 72.9, 72.4, 72.0];
const dates = ['2026-09-05', '2026-09-19', '2026-10-03', '2026-10-17', '2026-10-31', '2026-11-14'];
const entries: MeasurementEntry[] = dates.map((date, i) => ({ date, values: { weight: weights[i] } }));
const series6 = seriesOf(entries, 'weight');
const size = { w: 326, h: 120, padX: 16, padY: 14 };

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

describe('seriesOf', () => {
  it('пропускает замеры без показателя', () => {
    const mixed: MeasurementEntry[] = [
      { date: '2026-10-01', values: { weight: 70 } },
      { date: '2026-10-02', values: { waist: 80 } },
      { date: '2026-10-03', values: { weight: 69 } },
    ];
    expect(seriesOf(mixed, 'weight')).toEqual([
      { date: '2026-10-01', value: 70 },
      { date: '2026-10-03', value: 69 },
    ]);
    expect(seriesOf(mixed, 'arm')).toEqual([]);
  });
});

describe('sliceByPeriod', () => {
  it('месяц на данных макета: три точки', () => {
    expect(sliceByPeriod(series6, 'month', '2026-11-14').map((p) => p.date)).toEqual([
      '2026-10-17',
      '2026-10-31',
      '2026-11-14',
    ]);
  });
  it('месяц без замеров за месяц берёт последние две', () => {
    expect(sliceByPeriod(series6, 'month', '2027-03-01').map((p) => p.date)).toEqual(['2026-10-31', '2026-11-14']);
  });
  it('одна точка и пустая серия возвращаются как есть', () => {
    expect(sliceByPeriod(series6.slice(0, 1), 'month', '2026-11-14')).toEqual(series6.slice(0, 1));
    expect(sliceByPeriod([], 'month', '2026-11-14')).toEqual([]);
  });
  it('всё время не режет', () => {
    expect(sliceByPeriod(series6, 'all', '2026-11-14')).toHaveLength(6);
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

describe('chartGeometry', () => {
  it('одна точка: по центру, конечные числа', () => {
    const g = chartGeometry([5], size);
    expect(g.xs).toHaveLength(1);
    expect(g.xs[0]).toBe(163);
    for (const n of [...g.xs, ...g.ys]) expect(Number.isFinite(n)).toBe(true);
    expect(g.line.startsWith('M')).toBe(true);
  });
  it('плоская линия: ось не нулевая', () => {
    const g = chartGeometry([3, 3, 3], size);
    for (const n of g.ys) expect(Number.isFinite(n)).toBe(true);
    expect(g.ys[0]).toBe(60);
  });
  it('по формуле макета', () => {
    const g = chartGeometry(weights, size);
    expect(g.xs[0]).toBe(16);
    expect(g.xs[5]).toBe(310);
    expect(g.ys[0]).toBeCloseTo(14, 5);
    expect(g.ys[5]).toBeCloseTo(106, 5);
    expect(g.area.endsWith('Z')).toBe(true);
  });
  it('пустой список не падает', () => {
    expect(chartGeometry([], size).xs).toEqual([]);
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
  it('семь полей в порядке макета', () => {
    expect(MEASUREMENT_FIELDS.map((f) => f.kind)).toEqual(['weight', 'chest', 'waist', 'belly', 'hips', 'thigh', 'arm']);
    expect(MEASUREMENT_FIELDS[0]).toMatchObject({ label: 'Вес', unit: 'кг' });
  });
});
