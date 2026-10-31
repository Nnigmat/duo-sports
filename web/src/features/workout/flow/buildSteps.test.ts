import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit, setsBlock, warmup } from './fixtures';

describe('buildSteps', () => {
  it('timed: упражнения подряд, без отдыха и записи', () => {
    const steps = buildSteps([warmup]);
    expect(steps.map((s) => s.exerciseId)).toEqual(['head', 'shoulders']);
    expect(steps.every((s) => s.restAfterSec === 0 && !s.record)).toBe(true);
    expect(steps[1]).toMatchObject({ indexInBlock: 2, blockSize: 2, mode: 'timed' });
  });

  it('circuit: по кругу, 3 упражнения × 3 круга = 9 шагов', () => {
    const steps = buildSteps([circuit]);
    expect(steps).toHaveLength(9);
    expect(steps.slice(0, 4).map((s) => [s.round, s.exerciseId])).toEqual([
      [1, 'dips'],
      [1, 'scissors'],
      [1, 'lunge'],
      [2, 'dips'],
    ]);
    expect(steps[0]).toMatchObject({ rounds: 3, indexInBlock: 1, blockSize: 9 });
  });

  it('circuit: отдых после каждого подхода, кроме последнего в блоке', () => {
    const steps = buildSteps([circuit]);
    expect(steps.slice(0, 8).every((s) => s.restAfterSec === 60)).toBe(true);
    expect(steps[8].restAfterSec).toBe(0);
  });

  it('sets: все подходы упражнения, потом следующее', () => {
    const steps = buildSteps([setsBlock]);
    expect(steps.map((s) => `${s.exerciseId}:${s.round}/${s.rounds}`)).toEqual([
      'squat:1/3',
      'squat:2/3',
      'squat:3/3',
      'plank:1/2',
      'plank:2/2',
    ]);
  });

  it('несколько блоков: индексы и размеры считаются внутри блока', () => {
    const steps = buildSteps([warmup, circuit]);
    expect(steps).toHaveLength(11);
    expect(steps[2]).toMatchObject({ blockIndex: 1, indexInBlock: 1, blockSize: 9 });
  });

  it('шаг несёт позу упражнения; без позы — undefined', () => {
    const steps = buildSteps([circuit]);
    expect(steps[0].pose).toBe('dips');
    expect(steps[1].pose).toBeUndefined();
  });

  it('план шага копирует цель и вес упражнения, не делит ссылку', () => {
    const steps = buildSteps([setsBlock]);
    expect(steps[0].plan).toEqual({ target: { min: 12, max: 12 }, weight: 12 });
    expect(steps[0].plan.target).not.toBe(setsBlock.exercises[0].target);
    expect(steps[0].plan.target).not.toBe(steps[1].plan.target);
  });
});
