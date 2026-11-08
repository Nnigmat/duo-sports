import { describe, expect, it } from 'vitest';
import { elapsedSec, formatElapsed, totalSec } from './elapsed';

describe('elapsedSec', () => {
  it('целые секунды от метки старта', () => {
    expect(elapsedSec(1_000, 1_000)).toBe(0);
    expect(elapsedSec(1_000, 62_999)).toBe(61);
  });

  it('часы системы ушли назад: не меньше нуля', () => {
    expect(elapsedSec(5_000, 1_000)).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('мм:сс до часа', () => {
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(65)).toBe('01:05');
    expect(formatElapsed(3599)).toBe('59:59');
  });

  it('ч:мм:сс от часа', () => {
    expect(formatElapsed(3600)).toBe('1:00:00');
    expect(formatElapsed(3600 + 12 * 60 + 7)).toBe('1:12:07');
    expect(formatElapsed(10 * 3600)).toBe('10:00:00');
  });
});

describe('totalSec', () => {
  it('пока финиша нет, идёт вместе с часами', () => {
    expect(totalSec(1_000, null, 62_999)).toBe(61);
    expect(totalSec(1_000, undefined, 10_000)).toBe(9);
  });

  it('после финиша замирает на моменте финиша', () => {
    expect(totalSec(1_000, 31_000, 31_000)).toBe(30);
    expect(totalSec(1_000, 31_000, 9_999_999)).toBe(30);
  });
});
