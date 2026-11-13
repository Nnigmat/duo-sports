import { describe, expect, it } from 'vitest';
import type { CircuitBlock, SetsBlock } from '../../../../../shared/types';
import { circuit, setsBlock, warmup } from './fixtures';
import { gearList } from './gear';

const sets = (...exercises: SetsBlock['exercises']): SetsBlock => ({ ...setsBlock, exercises });
const ex = (id: string, weight?: number): SetsBlock['exercises'][number] => ({
  id,
  name: id,
  kind: weight === undefined ? 'reps' : 'weight',
  target: { min: 10, max: 10 },
  sets: 3,
  ...(weight === undefined ? {} : { weight }),
});

describe('gearList', () => {
  it('нет инвентаря у упражнений: список пуст', () => {
    expect(gearList([warmup, circuit], {})).toEqual([]);
  });

  it('снаряд с весом: вес рядом, с запятой у дробного', () => {
    expect(gearList([sets(ex('a', 8), ex('b', 2.5))], { a: ['2 гантели'], b: ['Гантель'] })).toEqual(['2 гантели 8 кг', 'Гантель 2,5 кг']);
  });

  it('скамья и коврик идут без веса, даже если у упражнения он есть', () => {
    expect(gearList([sets(ex('a', 40))], { a: ['Штанга', 'Скамья'] })).toEqual(['Штанга 40 кг', 'Скамья']);
  });

  it('тренажёр без веса: вес не нужен, чтобы его найти', () => {
    expect(gearList([sets(ex('a', 50))], { a: ['Тренажёр'] })).toEqual(['Тренажёр']);
  });

  it('одинаковое не повторяется; разные веса одного снаряда — отдельные строки по возрастанию', () => {
    const list = gearList([sets(ex('a', 12), ex('b', 8), ex('c', 8), ex('d'))], { a: ['2 гантели'], b: ['2 гантели', 'Скамья'], c: ['2 гантели'], d: ['Скамья', 'Коврик'] });
    expect(list).toEqual(['2 гантели 8 кг', '2 гантели 12 кг', 'Скамья', 'Коврик']);
  });

  it('вес снаряда, которому он нужен, но не задан: только название', () => {
    expect(gearList([sets(ex('a'))], { a: ['Гантель'] })).toEqual(['Гантель']);
  });

  it('берёт упражнения всех блоков, включая разминку и круги', () => {
    const ring: CircuitBlock = { ...circuit, exercises: [{ id: 'mat', name: 'Мост', kind: 'reps', target: { min: 10, max: 10 } }] };
    const warm = { ...warmup, exercises: [{ id: 'rope', name: 'Скакалка', kind: 'time' as const, target: { min: 30, max: 30 } }] };
    expect(gearList([warm, ring], { rope: ['Скакалка'], mat: ['Коврик'] })).toEqual(['Скакалка', 'Коврик']);
  });
});
