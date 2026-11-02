import { describe, expect, it } from 'vitest';
import { commentsCount, formatReviewedAt, formatShortDate, exerciseCount, formatDuration, formatApproxMinutes, formatMinutes, formatVolume, groupDigits, recordsWord } from './format';

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

describe('разбор: даты и склонения', () => {
  it('короткая дата без часового пояса', () => {
    expect(formatShortDate('2026-10-12')).toBe('12 окт');
    expect(formatShortDate('2026-01-05T23:30:00Z')).toBe('5 янв');
    expect(formatShortDate('мусор')).toBe('');
  });
  it('комментарии', () => {
    expect([1, 2, 4, 5, 11, 21].map(commentsCount)).toEqual([
      '1 комментарий', '2 комментария', '4 комментария', '5 комментариев', '11 комментариев', '21 комментарий',
    ]);
  });
  it('когда разобрано: сегодня, вчера, дата', () => {
    const now = new Date(2026, 10, 2, 12, 0);
    expect(formatReviewedAt(new Date(2026, 10, 2, 9, 5).toISOString(), now)).toBe('сегодня в 9:05');
    expect(formatReviewedAt(new Date(2026, 10, 1, 19, 40).toISOString(), now)).toBe('вчера в 19:40');
    expect(formatReviewedAt(new Date(2026, 9, 31, 19, 40).toISOString(), now)).toBe('31 окт в 19:40');
    expect(formatReviewedAt('мусор', now)).toBe('');
  });
});
