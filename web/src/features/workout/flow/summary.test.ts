import { describe, expect, it } from 'vitest';
import type { CircuitBlock, SetsBlock } from '../../../../../shared/types';
import { circuit, setsBlock, warmup } from './fixtures';
import { blockItems, restLabel, timedTotal, videoLabel, workoutMeta } from './summary';

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

describe('timedTotal', () => {
  it('сумма времени упражнений', () => {
    expect(timedTotal(warmup)).toBe('01:00');
  });
  it('упражнение со сторонами считается дважды', () => {
    const [a, b] = warmup.exercises;
    const sided = { ...warmup, exercises: [a, { ...b, sides: ['вправо', 'влево'] as [string, string] }, { ...a, id: 'c' }] };
    expect(timedTotal(sided)).toBe('02:00');
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
