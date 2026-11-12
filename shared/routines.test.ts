import { describe, expect, it } from 'vitest';
import { composeBlocks, routineBlock } from './routines';
import type { Routine, SetsBlock, TimedBlock } from './types';

const sets = (id: string): SetsBlock => ({
  id,
  mode: 'sets',
  title: id,
  exercises: [],
  restSec: 60,
  videoRounds: [],
});

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'legs-light',
  kind: 'warmup',
  title: 'Ноги лёгкая',
  items: [
    { exercise: 'neck', name: 'Шея', sec: { min: 30, max: 30 } },
    { exercise: 'hip', name: 'Бедро', sec: { min: 20, max: 30 }, sides: ['вправо', 'влево'] },
  ],
  totalSec: 90,
  ...over,
});

describe('composeBlocks', () => {
  const a = sets('a');
  const b = sets('b');
  const w = routineBlock(routine(), 1);
  const c = routineBlock(routine({ kind: 'cooldown', title: 'Растяжка' }), 2);

  it('puts warmup first and cooldown last', () => {
    expect(composeBlocks([a, b], w, c)).toEqual([w, a, b, c]);
  });

  it('without links returns main unchanged', () => {
    expect(composeBlocks([a, b], null, null)).toEqual([a, b]);
  });

  it('skips blocks with no exercises', () => {
    const empty = routineBlock(routine({ items: [], totalSec: 0 }), 3);
    expect(composeBlocks([a], empty, null)).toEqual([a]);
  });
});

describe('routineBlock', () => {
  it('gives stable exercise ids and poses', () => {
    const w = routineBlock(routine(), 7);
    expect(w.id).toBe('r7');
    expect(w.kind).toBe('warmup');
    expect(w.mode).toBe('timed');
    expect(w.exercises.map((e) => e.id)).toEqual(['r7-e0', 'r7-e1']);
    expect(w.exercises.every((e) => e.pose === 'stand')).toBe(true);
    const c = routineBlock(routine({ kind: 'cooldown' }), 8);
    expect(c.exercises.every((e) => e.pose === 'stretch')).toBe(true);
  });

  it('keeps sides and note', () => {
    const w: TimedBlock = routineBlock(routine({ note: 'Повторяйте за персонажем' }), 1);
    expect(w.note).toBe('Повторяйте за персонажем');
    expect(w.title).toBe('Ноги лёгкая');
    expect(w.exercises[1].sides).toEqual(['вправо', 'влево']);
    expect(w.exercises[1].target).toEqual({ min: 20, max: 30 });
    expect(w.exercises[0].kind).toBe('time');
  });

  it('of an empty routine returns a block with no exercises', () => {
    const w = routineBlock(routine({ items: [], totalSec: 0 }), 5);
    expect(w.exercises).toEqual([]);
  });
});

