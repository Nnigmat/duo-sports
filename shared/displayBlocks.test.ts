import { describe, expect, it } from 'vitest';
import { displayBlocks } from './displayBlocks';

describe('displayBlocks', () => {
  it('builds display list from structure: sets, circuit and timed warmup', () => {
    expect(
      displayBlocks([
        { id: 'w', mode: 'timed', kind: 'warmup', title: 'Разминка', exercises: [{ id: 'a', name: 'Вращение руками', kind: 'time', target: { min: 30, max: 45 } }] },
        { id: 's', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [{ id: 'b', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 4 }] },
        { id: 'c', mode: 'circuit', title: 'Круг', rounds: 3, restSec: 60, videoRounds: [], exercises: [{ id: 'd', name: 'Отжимания', kind: 'reps', target: { min: 0, max: 0 } }] },
      ]),
    ).toEqual([
      { kind: 'warmup', heading: 'Разминка', items: [{ name: 'Вращение руками', value: '00:30–00:45' }] },
      { kind: 'exercises', heading: 'Подходами', items: [{ name: 'Жим лёжа', value: '4 × 60 кг × 8' }] },
      { kind: 'exercises', heading: 'Круг', items: [{ name: 'Отжимания', value: 'макс. повт' }] },
    ]);
  });
});
