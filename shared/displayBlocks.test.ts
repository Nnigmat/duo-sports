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

describe('displayBlocks: блок-заметка', () => {
  it('в список блоков не попадает', () => {
    expect(displayBlocks([{ id: 'n', mode: 'note', title: 'Важно', text: 'Текст' }])).toEqual([]);
  });
});

describe('displayBlocks: макс. и стороны', () => {
  it('время на максимум — «макс.», а не 00:00', () => {
    const [b] = displayBlocks([{ id: 's', mode: 'sets', title: 'С', restSec: 60, videoRounds: [], exercises: [{ id: 'a', name: 'Планка', kind: 'time', target: { min: 0, max: 0 }, sets: 3 }] }]);
    expect(b!.items[0]!.value).toBe('3 × макс.');
  });
  it('упражнение со сторонами в подходах и круге — «на сторону»', () => {
    const out = displayBlocks([
      { id: 's', mode: 'sets', title: 'С', restSec: 60, videoRounds: [], exercises: [{ id: 'a', name: 'Выпады', kind: 'reps', target: { min: 10, max: 10 }, sets: 3, sides: ['л', 'п'] }] },
      { id: 'c', mode: 'circuit', title: 'К', rounds: 2, restSec: 60, videoRounds: [], exercises: [{ id: 'b', name: 'Планка', kind: 'time', target: { min: 30, max: 30 }, sides: ['л', 'п'] }] },
    ]);
    expect(out.map((b) => b.items[0]!.value)).toEqual(['3 × 10 повт на сторону', '00:30 на сторону']);
  });
  it('в разминке сторон нет, как на экране тренировки', () => {
    const [b] = displayBlocks([{ id: 'w', mode: 'timed', kind: 'warmup', title: 'Р', exercises: [{ id: 'a', name: 'Круги', kind: 'time', target: { min: 30, max: 30 }, sides: ['л', 'п'] }] }]);
    expect(b!.items[0]!.value).toBe('00:30');
  });
});
