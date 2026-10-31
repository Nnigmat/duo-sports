import { describe, expect, it } from 'vitest';
import { exerciseCount, formatDuration, formatApproxMinutes, formatMinutes, formatVolume, groupDigits, recordsWord } from './format';

describe('format', () => {
  it('разряды через неразрывный пробел', () => {
    expect(groupDigits(5840)).toBe('5 840');
    expect(groupDigits(950)).toBe('950');
    expect(groupDigits(1234567)).toBe('1 234 567');
  });
  it('число с единицей через пробел', () => {
    expect(formatMinutes(48)).toBe('48 мин');
    expect(formatApproxMinutes(50)).toBe('≈ 50 мин');
    expect(formatVolume(5840)).toBe('5 840 кг');
  });
  it('склонения', () => {
    expect([1, 2, 5, 11, 21].map(exerciseCount)).toEqual([
      '1 упражнение', '2 упражнения', '5 упражнений', '11 упражнений', '21 упражнение',
    ]);
    expect([1, 2, 5].map(recordsWord)).toEqual(['рекорд', 'рекорда', 'рекордов']);
  });
  it('длительность', () => {
    expect([40, 95, 120].map(formatDuration)).toEqual(['40\u00a0мин', '1\u00a0ч\u00a035\u00a0мин', '2\u00a0ч']);
  });
});
