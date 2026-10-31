import { describe, expect, it } from 'vitest';
import type { Achievement, AchievementCategory } from '../../data/types';
import {
  categoryCount,
  categoryTabs,
  closestGoal,
  isMaxed,
  nextGoal,
  tierLine,
  totalCount,
  visibleCategories,
} from './achievements';

const base: Achievement = {
  id: 'a',
  name: 'Без пропусков',
  icon: 'flame',
  description: '',
  tier: 1,
  earnedDates: ['26 окт'],
  levels: [4, 8, 16],
  levelLabels: ['4 нед', '8 нед', '16 нед'],
  current: 5,
  unit: 'нед',
};
const NB = '\u00a0';

describe('tierLine', () => {
  it('называет уровень, степень и дату получения', () => {
    expect(tierLine({ ...base, tier: 2, earnedDates: ['9 авг', '12 окт'] })).toBe('Серебро · средний · 12 окт');
  });
  it('без уровня и у секретных', () => {
    expect(tierLine({ ...base, tier: 0, earnedDates: [] })).toBe('Нет · уровень отсутствует');
    expect(tierLine({ ...base, tier: 0, earnedDates: [], secret: true })).toBe('Условие скрыто');
  });
});

describe('nextGoal', () => {
  it('считает цель следующего уровня', () => {
    expect(nextGoal(base)).toEqual({
      tier: 2,
      tierWord: 'серебро',
      pct: 63,
      chipText: 'Цель: Серебро · 8 нед',
      untilText: 'До серебра',
      progressText: `5 из 8${NB}нед`,
      barLabel: 'Без пропусков, до серебра',
    });
  });
  it('группирует разряды и не превышает 100 %', () => {
    const g = nextGoal({ ...base, tier: 2, earnedDates: ['a', 'b'], levels: [1000, 3000, 5000], levelLabels: ['1 т', '3 т', '5 т'], current: 5200, unit: 'кг' });
    expect(g?.progressText).toBe(`5${NB}200 из 5${NB}000${NB}кг`);
    expect(g?.pct).toBe(100);
  });
  it('без единицы пишет просто число', () => {
    expect(nextGoal({ ...base, unit: undefined, current: 31, levels: [10, 50, 100] })?.progressText).toBe('31 из 50');
  });
  it('нет цели у золота и секретных', () => {
    expect(nextGoal({ ...base, tier: 3 })).toBeNull();
    expect(nextGoal({ ...base, secret: true, levels: undefined })).toBeNull();
  });
});

describe('isMaxed', () => {
  it('только золото без секрета', () => {
    expect(isMaxed({ ...base, tier: 3 })).toBe(true);
    expect(isMaxed(base)).toBe(false);
    expect(isMaxed({ ...base, tier: 3, secret: true })).toBe(false);
  });
});

const secret: Achievement = { ...base, id: 's', secret: true, tier: 0, earnedDates: [], levels: undefined, levelLabels: undefined };
const cats: AchievementCategory[] = [
  { id: 'streak', name: 'Регулярность', items: [base, { ...base, id: 'b', tier: 3, earnedDates: ['1', '2', '3'] }] },
  { id: 'special', name: 'Особые', items: [{ ...base, id: 'c', tier: 0, earnedDates: [], current: 80, levels: [82, 90, 100] }, secret] },
];

describe('счётчики', () => {
  it('раздел: секретные не входят в общее число', () => {
    expect(categoryCount(cats[0]!)).toEqual({ got: 4, total: 6 });
    expect(categoryCount(cats[1]!)).toEqual({ got: 0, total: 3 });
  });
  it('итог и чипы', () => {
    expect(totalCount(cats)).toEqual({ got: 4, total: 9 });
    expect(categoryTabs(cats)).toEqual([
      { id: 'all', name: 'Все', count: '4/9' },
      { id: 'streak', name: 'Регулярность', count: '4/6' },
      { id: 'special', name: 'Особые', count: '0/3' },
    ]);
  });
});

describe('visibleCategories', () => {
  it('all — все разделы, id — один', () => {
    expect(visibleCategories(cats, 'all')).toHaveLength(2);
    expect(visibleCategories(cats, 'special').map((c) => c.id)).toEqual(['special']);
  });
  it('неизвестный раздел — пусто', () => {
    expect(visibleCategories(cats, 'nope')).toEqual([]);
  });
});

describe('closestGoal', () => {
  it('берёт достижение с наибольшим процентом до следующего уровня', () => {
    expect(closestGoal(cats)?.achievement.id).toBe('c');
  });
  it('null, если всё получено', () => {
    expect(closestGoal([{ id: 'x', name: 'X', items: [{ ...base, tier: 3 }, secret] }])).toBeNull();
  });
});
