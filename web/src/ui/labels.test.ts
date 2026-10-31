import { describe, expect, it } from 'vitest';
import { arrowTarget, dayLabel, medalLabel, streakText, weekDayLabel } from './labels';

describe('medalLabel', () => {
  it('римский уровень', () => {
    expect(medalLabel('Без пропусков', 1)).toBe('Без пропусков, уровень I');
    expect(medalLabel('Без пропусков', 3)).toBe('Без пропусков, уровень III');
  });
  it('уровень 0 — словами, не цветом', () => {
    expect(medalLabel('Без пропусков', 0)).toBe('Без пропусков, ещё не получено');
  });
});

describe('streakText', () => {
  it('недели', () => {
    expect([1, 2, 5, 11, 21].map((n) => streakText(n, 'weeks'))).toEqual(['1 неделя', '2 недели', '5 недель', '11 недель', '21 неделя']);
  });
  it('дни по умолчанию', () => {
    expect([1, 3, 7, 12].map((n) => streakText(n))).toEqual(['1 день', '3 дня', '7 дней', '12 дней']);
  });
});

describe('dayLabel', () => {
  it('свободный день', () => {
    expect(dayLabel({ date: '2026-11-04', weekday: 'ср', day: '4' })).toBe('ср, 4 ноября');
  });
  it('занятый день', () => {
    expect(dayLabel({ date: '2026-11-04', weekday: 'ср', day: '4', busy: 'Кардио и пресс' })).toBe('ср, 4 ноября, уже стоит: Кардио и пресс');
  });
});

describe('arrowTarget', () => {
  it('идёт по кругу', () => {
    expect(arrowTarget('ArrowRight', 6, 7)).toBe(0);
    expect(arrowTarget('ArrowLeft', 0, 7)).toBe(6);
    expect(arrowTarget('ArrowDown', 2, 7)).toBe(3);
    expect(arrowTarget('Home', 4, 7)).toBe(0);
    expect(arrowTarget('End', 4, 7)).toBe(6);
  });
  it('чужие клавиши игнорирует', () => {
    expect(arrowTarget('Enter', 1, 7)).toBeNull();
  });
});

describe('weekDayLabel', () => {
  it('статус и название словами', () => {
    expect(weekDayLabel({ weekday: 'пн', status: 'rest' })).toBe('пн, Отдых');
    expect(weekDayLabel({ weekday: 'чт', status: 'moved' })).toBe('чт, Перенесено');
    expect(weekDayLabel({ weekday: 'сб', date: '31', status: 'planned', today: true })).toBe('сб 31, сегодня, Запланировано');
    expect(weekDayLabel({ weekday: 'ср', status: 'planned', today: true, caption: 'Кардио и пресс' })).toBe('ср, сегодня, Запланировано, Кардио и пресс');
  });
});
