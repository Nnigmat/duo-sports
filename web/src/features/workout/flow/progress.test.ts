import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { blockProgress, segmentStates } from './progress';
import { circuit, warmup } from './fixtures';

const steps = buildSteps([warmup, circuit]);

describe('blockProgress', () => {
  it('сегментов столько, сколько шагов в блоке', () => {
    expect(blockProgress(steps, 0)).toEqual({ total: 2, current: 1 });
    expect(blockProgress(steps, 2)).toEqual({ total: 9, current: 1 });
    expect(blockProgress(steps, 10)).toEqual({ total: 9, current: 9 });
  });
});

describe('segmentStates', () => {
  it('пройденные, текущий, оставшиеся', () => {
    expect(segmentStates(steps, 5)).toEqual([
      'done', 'done', 'done', 'current', 'todo', 'todo', 'todo', 'todo', 'todo',
    ]);
  });

  it('первый шаг блока: нет пройденных', () => {
    expect(segmentStates(steps, 0)).toEqual(['current', 'todo']);
  });
});
