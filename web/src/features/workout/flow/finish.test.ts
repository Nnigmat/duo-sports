import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { finishStats, formatFinishStats } from './finish';
import { circuit, setsBlock, warmup } from './fixtures';

const all = (steps: unknown[], v: boolean) => steps.map(() => v);

describe('finishStats', () => {
  const steps = buildSteps([warmup, circuit]);

  it('подходы без разминки, круги и видео', () => {
    expect(finishStats(steps, all(steps, true), 3)).toEqual({ setsDone: 9, setsTotal: 9, rounds: 3, videos: 3 });
  });

  it('пропущенные подходы не считаются сделанными', () => {
    const completed = all(steps, true);
    completed[3] = false;
    completed[4] = false;
    expect(finishStats(steps, completed, 0)).toMatchObject({ setsDone: 7, setsTotal: 9 });
  });

  it('без круговых блоков кругов нет', () => {
    const s = buildSteps([setsBlock]);
    expect(finishStats(s, all(s, true), 0)).toEqual({ setsDone: 5, setsTotal: 5, rounds: 0, videos: 0 });
  });
});

describe('formatFinishStats', () => {
  it('три показателя как в макете', () => {
    expect(formatFinishStats({ setsDone: 9, setsTotal: 9, rounds: 3, videos: 3 })).toEqual([
      { value: '9 из 9', label: 'подходов' },
      { value: '3', label: 'круга' },
      { value: '3', label: 'видео записано' },
    ]);
  });

  it('нет кругов или видео: показателя нет', () => {
    expect(formatFinishStats({ setsDone: 5, setsTotal: 5, rounds: 0, videos: 0 })).toEqual([
      { value: '5 из 5', label: 'подходов' },
    ]);
  });

  it('склонение кругов', () => {
    expect(formatFinishStats({ setsDone: 1, setsTotal: 1, rounds: 1, videos: 0 })[1]).toEqual({ value: '1', label: 'круг' });
    expect(formatFinishStats({ setsDone: 1, setsTotal: 1, rounds: 5, videos: 0 })[1]).toEqual({ value: '5', label: 'кругов' });
  });
});
