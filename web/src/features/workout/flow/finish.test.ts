import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { finishStats, formatFinishStats, sessionSteps } from './finish';
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

describe('sessionSteps', () => {
  const steps = buildSteps([warmup, circuit]);
  it('по записи на каждый шаг, с планом и отметкой выполнения', () => {
    const completed = all(steps, true);
    completed[2] = false;
    const out = sessionSteps(steps, completed);
    expect(out).toHaveLength(steps.length);
    expect(out[0]).toMatchObject({ exerciseId: steps[0]!.exerciseId, blockIndex: 0, round: 1, completed: true });
    expect(out[2]!.completed).toBe(false);
    expect(out[3]).toEqual({
      exerciseId: steps[3]!.exerciseId,
      exerciseName: steps[3]!.exerciseName,
      blockIndex: steps[3]!.blockIndex,
      round: steps[3]!.round,
      rounds: steps[3]!.rounds,
      kind: steps[3]!.kind,
      plan: steps[3]!.plan,
      completed: true,
    });
  });
  it('шаг без отметки считается невыполненным', () => {
    expect(sessionSteps(steps, []).every((s) => !s.completed)).toBe(true);
  });
});

describe('sessionSteps: видео подходов', () => {
  const steps = buildSteps([warmup, circuit]);
  it('videoId попадает в свой подход, у остальных поля нет', () => {
    const out = sessionSteps(steps, steps.map(() => true), steps.map((_, i) => (i === 1 ? 'v-1' : null)));
    expect(out[1]!.videoId).toBe('v-1');
    expect('videoId' in out[0]!).toBe(false);
  });
});

describe('sessionSteps: фактический отдых', () => {
  const steps = buildSteps([warmup, circuit]);
  it('restSec попадает в свой подход, у остальных поля нет', () => {
    const rest = steps.map((_, i) => (i === 3 ? 72 : null));
    const out = sessionSteps(steps, steps.map(() => true), [], rest);
    expect(out[3]!.restSec).toBe(72);
    expect('restSec' in out[2]!).toBe(false);
  });
  it('ноль секунд сохраняется как есть', () => {
    const out = sessionSteps(steps, steps.map(() => true), [], steps.map(() => 0));
    expect(out[3]!.restSec).toBe(0);
  });
});
