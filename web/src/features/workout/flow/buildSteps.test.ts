import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import type { CircuitBlock, SetsBlock, TimedBlock } from '../../../../../shared/types';
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

  describe('стороны', () => {
    const sides: [string, string] = ['вправо', 'влево'];
    const withSides: TimedBlock = {
      ...warmup,
      exercises: [
        { id: 'head', name: 'Вращения головой', kind: 'time', target: { min: 30, max: 30 }, sides },
        { id: 'shoulders', name: 'Вращения плечами', kind: 'time', target: { min: 30, max: 30 } },
      ],
    };

    it('timed-блок разворачивает упражнение с sides в два шага подряд', () => {
      const steps = buildSteps([withSides]);
      expect(steps.map((s) => s.exerciseId)).toEqual(['head', 'head', 'shoulders']);
      expect(steps[0]).toMatchObject({ side: { index: 1, label: 'вправо' }, indexInBlock: 1, blockSize: 3, round: 1, rounds: 1 });
      expect(steps[1]).toMatchObject({ side: { index: 2, label: 'влево' }, indexInBlock: 2, blockSize: 3, round: 1, rounds: 1 });
    });

    it('упражнение без sides остаётся одним шагом', () => {
      const steps = buildSteps([withSides]);
      expect(steps[2]).toMatchObject({ exerciseId: 'shoulders', indexInBlock: 3 });
      expect(steps[2].side).toBeUndefined();
    });

    it('sides не разворачиваются в sets и circuit', () => {
      const c: CircuitBlock = { ...circuit, exercises: circuit.exercises.map((e) => ({ ...e, sides })) };
      const s: SetsBlock = { ...setsBlock, exercises: setsBlock.exercises.map((e) => ({ ...e, sides })) };
      expect(buildSteps([c])).toHaveLength(9);
      expect(buildSteps([s])).toHaveLength(5);
      expect(buildSteps([c, s]).every((st) => st.side === undefined)).toBe(true);
    });
  });
});
