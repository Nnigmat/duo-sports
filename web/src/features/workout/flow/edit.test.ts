import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { applyToFollowing, updatePlan } from './edit';
import { circuit, setsBlock } from './fixtures';

describe('updatePlan', () => {
  it('меняет только выбранный шаг и не мутирует исходный массив', () => {
    const steps = buildSteps([circuit]);
    const next = updatePlan(steps, 0, { target: { min: 17, max: 17 } });
    expect(next[0].plan.target).toEqual({ min: 17, max: 17 });
    expect(next[3].plan.target).toEqual({ min: 18, max: 20 });
    expect(steps[0].plan.target).toEqual({ min: 18, max: 20 });
  });
});

describe('applyToFollowing', () => {
  it('circuit: то же упражнение в следующих кругах (подходы 4 и 7)', () => {
    const steps = buildSteps([circuit]);
    const next = applyToFollowing(steps, 0, { target: { min: 16, max: 16 }, weight: 2.5 });
    const changed = next.flatMap((s, i) => (s.plan.target.min === 16 ? [i] : []));
    expect(changed).toEqual([0, 3, 6]);
    expect(next[6].plan.weight).toBe(2.5);
  });

  it('не трогает предыдущие круги', () => {
    const steps = buildSteps([circuit]);
    const next = applyToFollowing(steps, 3, { target: { min: 15, max: 15 } });
    expect(next[0].plan.target.min).toBe(18);
    expect(next.flatMap((s, i) => (s.plan.target.min === 15 ? [i] : []))).toEqual([3, 6]);
  });

  it('sets: следующие подходы того же упражнения, не следующего', () => {
    const steps = buildSteps([setsBlock]);
    const next = applyToFollowing(steps, 0, { target: { min: 10, max: 10 }, weight: 14 });
    expect(next.map((s) => s.plan.weight)).toEqual([14, 14, 14, undefined, undefined]);
  });

  it('time: меняет секунды следующих подходов', () => {
    const steps = buildSteps([setsBlock]);
    const next = applyToFollowing(steps, 3, { target: { min: 30, max: 30 } });
    expect(next[4].plan.target).toEqual({ min: 30, max: 30 });
  });

  it('не мутирует исходные шаги', () => {
    const steps = buildSteps([circuit]);
    applyToFollowing(steps, 0, { target: { min: 1, max: 1 } });
    expect(steps[3].plan.target).toEqual({ min: 18, max: 20 });
  });
});
