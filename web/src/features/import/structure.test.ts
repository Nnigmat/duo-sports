import { describe, expect, it } from 'vitest';
import type { CircuitBlock, SetsBlock, TimedBlock } from '../../../../shared/types';
import { buildBlock, buildBlocks, DEFAULT_REST, groupSets, toKg, usesDistance, type RawBlock } from './structure';

const r = (n: number) => ({ min: n, max: n });
const kg = (n: number) => ({ min: n, max: n, unit: 'kg' as const });

describe('toKg', () => {
  it('килограммы не меняются, фунты округляются до половины', () => {
    expect(toKg(kg(75))).toEqual(r(75));
    expect(toKg({ min: 135, max: 135, unit: 'lb' })).toEqual({ min: 61, max: 61 });
    expect(toKg({ min: 225, max: 225, unit: 'lb' })).toEqual({ min: 102, max: 102 });
  });
});

describe('разминка и заминка → timed', () => {
  it('время и пояснение', () => {
    const b = buildBlock({ type: 'warmup', time: { min: 300, max: 420 }, text: 'Скакалка', exercises: [] }, 'b0') as TimedBlock;
    expect(b).toMatchObject({ id: 'b0', mode: 'timed', title: 'Разминка', note: 'Скакалка' });
    expect(b.exercises).toEqual([{ id: 'b0-e0', name: 'Разминка', kind: 'time', pose: 'stand', target: { min: 300, max: 420 } }]);
  });
  it('без времени — пять минут, заминка растягивается', () => {
    const b = buildBlock({ type: 'cooldown', exercises: [] }, 'b2') as TimedBlock;
    expect(b.exercises[0]).toMatchObject({ kind: 'time', pose: 'stretch', target: r(300) });
    expect(b.note).toBeUndefined();
  });
});

describe('sets', () => {
  const block = (ex: RawBlock['exercises'], rest?: number): SetsBlock => buildBlock({ type: 'sets', rest, exercises: ex }, 'b1') as SetsBlock;
  it('вес и повторы: подходов столько, сколько в файле, отдых по умолчанию 90 с', () => {
    const b = block([{ name: 'Жим', load: { sets: 4, reps: { min: 8, max: 8 }, weight: kg(75) } }]);
    expect(b.restSec).toBe(DEFAULT_REST.sets);
    expect(b.exercises).toEqual([{ id: 'b1-e0', name: 'Жим', kind: 'weight', target: r(8), weight: 75, sets: 4 }]);
  });
  it('без веса — повторы; диапазон сохраняется; отдых из файла', () => {
    const b = block([{ name: 'Подтягивания', load: { sets: 3, reps: { min: 8, max: 12 } } }], 120);
    expect(b.restSec).toBe(120);
    expect(b.exercises[0]).toMatchObject({ kind: 'reps', target: { min: 8, max: 12 }, sets: 3 });
    expect(b.exercises[0]!.weight).toBeUndefined();
  });
  it('max — цель 0 («макс.»), на время — секунды', () => {
    const b = block([{ name: 'Подтяг', load: { sets: 2, reps: 'max' } }, { name: 'Планка', load: { sets: 3, time: { min: 45, max: 45 } } }]);
    expect(b.exercises[0]).toMatchObject({ kind: 'reps', target: r(0), sets: 2 });
    expect(b.exercises[1]).toMatchObject({ kind: 'time', target: r(45), sets: 3 });
  });
  it('без числа подходов — один', () => {
    expect(block([{ name: 'Х', load: { reps: r(10) } }]).exercises[0]!.sets).toBe(1);
  });
  it('пирамида: подряд одинаковые подходы склеиваются, у каждой группы своё упражнение', () => {
    const b = block([{
      name: 'Жим ногами',
      load: { setList: [{ reps: r(15), weight: kg(60), warmup: true }, { reps: r(12), weight: kg(100) }, { reps: r(12), weight: kg(100) }, { reps: r(8), weight: kg(140) }] },
    }]);
    expect(b.exercises.map((e) => [e.id, e.name, e.sets, e.weight, e.target.min])).toEqual([
      ['b1-e0-0', 'Жим ногами', 1, 60, 15],
      ['b1-e0-1', 'Жим ногами', 2, 100, 12],
      ['b1-e0-2', 'Жим ногами', 1, 140, 8],
    ]);
  });
  it('groupSets', () => {
    expect(groupSets([{ reps: r(5) }, { reps: r(5) }, { reps: r(6) }]).map((g) => g.count)).toEqual([2, 1]);
    expect(groupSets([])).toEqual([]);
  });
});

describe('circuit и superset', () => {
  const ex = [{ name: 'А', load: { reps: { min: 18, max: 20 } } }, { name: 'Б', load: { time: { min: 30, max: 30 } } }];
  it('круг: круги и отдых из файла', () => {
    const b = buildBlock({ type: 'circuit', rounds: 3, rest: 90, exercises: ex }, 'b0') as CircuitBlock;
    expect(b).toMatchObject({ mode: 'circuit', title: 'Круг', rounds: 3, restSec: 90, videoRounds: [] });
    expect(b.exercises.map((e) => [e.id, e.kind, e.target])).toEqual([['b0-e0', 'reps', { min: 18, max: 20 }], ['b0-e1', 'time', r(30)]]);
  });
  it('без указаний — один круг и отдых 60 с; суперсет тоже круговой блок', () => {
    const c = buildBlock({ type: 'circuit', exercises: ex }, 'b0') as CircuitBlock;
    expect([c.rounds, c.restSec]).toEqual([1, 60]);
    const s = buildBlock({ type: 'superset', rounds: 2, exercises: ex }, 'b0') as CircuitBlock;
    expect(s).toMatchObject({ mode: 'circuit', title: 'Суперсет', rounds: 2 });
  });
  it('вес в фунтах переводится в килограммы', () => {
    const b = buildBlock({ type: 'circuit', exercises: [{ name: 'Х', load: { reps: r(5), weight: { min: 135, max: 135, unit: 'lb' } } }] }, 'b0') as CircuitBlock;
    expect(b.exercises[0]).toMatchObject({ kind: 'weight', weight: 61 });
  });
});

describe('расстояние', () => {
  it('считается по времени: пять минут, и об этом можно предупредить', () => {
    const raw: RawBlock = { type: 'sets', exercises: [{ name: 'Бег', load: { sets: 1, distance: { value: 5, unit: 'km' } } }] };
    expect(usesDistance(raw)).toEqual(['Бег']);
    expect((buildBlock(raw, 'b0') as SetsBlock).exercises[0]).toMatchObject({ kind: 'time', target: r(300) });
    expect(usesDistance({ type: 'sets', exercises: [{ name: 'Бег', load: { distance: { value: 5, unit: 'km' }, time: r(1500) } }] })).toEqual([]);
  });
});

describe('buildBlocks', () => {
  it('id блоков по порядку', () => {
    const blocks = buildBlocks([{ type: 'warmup', exercises: [] }, { type: 'sets', exercises: [] }, { type: 'cooldown', exercises: [] }]);
    expect(blocks.map((b) => b.id)).toEqual(['b0', 'b1', 'b2']);
  });
});
