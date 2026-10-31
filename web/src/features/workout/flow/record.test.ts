import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { needsRecording } from './record';
import { circuit, setsBlock, warmup } from './fixtures';

describe('needsRecording', () => {
  it('circuit: только помеченные круги', () => {
    expect(needsRecording(circuit, 1)).toBe(false);
    expect(needsRecording(circuit, 2)).toBe(true);
    expect(needsRecording(circuit, 3)).toBe(false);
  });

  it('sets: помечен третий подход упражнения', () => {
    expect(needsRecording(setsBlock, 3)).toBe(true);
    expect(needsRecording(setsBlock, 2)).toBe(false);
  });

  it('timed: запись не нужна никогда', () => {
    expect(needsRecording(warmup, 1)).toBe(false);
  });

  it('шаги круга 2 помечены записью, остальные нет', () => {
    const rec = buildSteps([circuit]).map((s) => s.record);
    expect(rec).toEqual([false, false, false, true, true, true, false, false, false]);
  });
});
