import { describe, expect, it } from 'vitest';
import { formatLongDate, plural } from './ru';

const SETS: [string, string, string] = ['подход', 'подхода', 'подходов'];

describe('plural', () => {
  it('1, 21, 101 — единственное число', () => {
    expect([1, 21, 101].map((n) => plural(n, SETS))).toEqual(['подход', 'подход', 'подход']);
  });
  it('2–4, 22–24 — родительный единственного', () => {
    expect([2, 3, 4, 22, 24].map((n) => plural(n, SETS))).toEqual(Array(5).fill('подхода'));
  });
  it('0, 5–20, 25, 111 — родительный множественного', () => {
    expect([0, 5, 9, 11, 12, 14, 20, 25, 111].map((n) => plural(n, SETS))).toEqual(Array(9).fill('подходов'));
  });
});

describe('formatLongDate', () => {
  it('день недели с большой буквы, число и месяц', () => {
    expect(formatLongDate(new Date('2026-10-30T12:00:00'))).toBe('Пятница, 30 октября');
    expect(formatLongDate(new Date('2026-11-01T12:00:00'))).toBe('Воскресенье, 1 ноября');
  });
});
