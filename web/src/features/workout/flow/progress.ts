import type { Step } from './buildSteps';

export type SegmentState = 'done' | 'current' | 'todo';

/** Сегменты полоски: по одному на шаг текущего блока. */
export function blockProgress(steps: Step[], index: number): { total: number; current: number } {
  const s = steps[index];
  return { total: s.blockSize, current: s.indexInBlock };
}

export function segmentStates(steps: Step[], index: number): SegmentState[] {
  const { total, current } = blockProgress(steps, index);
  return Array.from({ length: total }, (_, i) =>
    i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'todo',
  );
}
