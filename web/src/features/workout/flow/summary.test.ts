import { describe, expect, it } from 'vitest';
import type { CircuitBlock, SetsBlock } from '../../../../../shared/types';
import { circuit, setsBlock, warmup } from './fixtures';
import { blockItems, restLabel, timedHeadline, videoLabel, workoutMeta } from './summary';

describe('workoutMeta', () => {
  it('круги и подходы; разминка в подходы не входит', () => {
    expect(workoutMeta([warmup, circuit])).toBe('3 круга · 9 подходов');
  });
  it('только подходами: без кругов', () => {
    expect(workoutMeta([setsBlock])).toBe('5 подходов');
  });
  it('круги и подходы вместе', () => {
    expect(workoutMeta([circuit, setsBlock])).toBe('3 круга · 14 подходов');
  });
  it('только таймерные блоки: упражнения', () => {
    expect(workoutMeta([warmup])).toBe('2 упражнения');
  });
});

describe('timedHeadline', () => {
  it('одинаковое время: «по 30 с»', () => {
    expect(timedHeadline(warmup)).toBe('2 упражнения по 30 с');
  });
  it('разное время: без «по»', () => {
    const mixed = { ...warmup, exercises: [warmup.exercises[0], { ...warmup.exercises[1], target: { min: 45, max: 45 } }] };
    expect(timedHeadline(mixed)).toBe('2 упражнения');
  });
  it('блок со сторонами показывает общее время обеих сторон', () => {
    const [a, b] = warmup.exercises;
    const sided = { ...warmup, exercises: [a, { ...b, sides: ['вправо', 'влево'] as [string, string] }, { ...a, id: 'c' }] };
    expect(timedHeadline(sided)).toBe('3 упражнения · 02:00');
  });
  it('блок без сторон не меняется', () => {
    expect(timedHeadline(warmup)).toBe('2 упражнения по 30 с');
  });
  it('склонение: 1, 4 и 6 упражнений', () => {
    const n = (k: number) => ({ ...warmup, exercises: Array.from({ length: k }, () => warmup.exercises[0]) });
    expect(timedHeadline(n(1))).toBe('1 упражнение по 30 с');
    expect(timedHeadline(n(4))).toBe('4 упражнения по 30 с');
    expect(timedHeadline(n(6))).toBe('6 упражнений по 30 с');
  });
});

describe('blockItems', () => {
  it('circuit: название и цель с единицей', () => {
    expect(blockItems(circuit)).toEqual([
      { name: 'Обратные отжимания', target: '18–20 повт' },
      { name: 'Ножницы лёжа', target: '30–34 повт' },
      { name: 'Выпады', target: '14–16 повт' },
    ]);
  });
  it('sets: число подходов перед целью', () => {
    expect(blockItems(setsBlock)).toEqual([
      { name: 'Приседания', target: '3 × 12 кг × 12' },
      { name: 'Планка', target: '2 × 00:45–01:00' },
    ]);
  });
});

describe('restLabel', () => {
  it('circuit: после каждого подхода', () => {
    expect(restLabel(circuit)).toBe('Отдых 60 с после каждого подхода');
  });
  it('sets: между подходами', () => {
    expect(restLabel(setsBlock)).toBe('Отдых 90 с между подходами');
  });
  it('без отдыха: undefined', () => {
    expect(restLabel({ ...(circuit as CircuitBlock), restSec: 0 })).toBeUndefined();
  });
});

describe('videoLabel', () => {
  it('один круг', () => {
    expect(videoLabel(circuit)).toBe('Круг 2 записываем на видео');
  });
  it('несколько кругов', () => {
    expect(videoLabel({ ...circuit, videoRounds: [2, 3] })).toBe('Круги 2 и 3 записываем на видео');
    expect(videoLabel({ ...circuit, videoRounds: [1, 2, 3] })).toBe('Круги 1, 2 и 3 записываем на видео');
  });
  it('sets: подходы упражнения', () => {
    expect(videoLabel(setsBlock)).toBe('Подход 3 записываем на видео');
    expect(videoLabel({ ...(setsBlock as SetsBlock), videoRounds: [2, 3] })).toBe('Подходы 2 и 3 записываем на видео');
  });
  it('ничего не помечено: undefined', () => {
    expect(videoLabel({ ...circuit, videoRounds: [] })).toBeUndefined();
  });
});
