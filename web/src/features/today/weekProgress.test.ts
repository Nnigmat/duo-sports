import { describe, expect, it } from 'vitest';
import { weekProgress } from './weekProgress';

describe('weekProgress', () => {
  it('отдых не входит в план, пропущенные входят', () => {
    expect(
      weekProgress([
        { weekday: 'пн', status: 'done' },
        { weekday: 'вт', status: 'rest' },
        { weekday: 'ср', status: 'missed' },
        { weekday: 'чт', status: 'planned' },
      ]),
    ).toEqual({ done: 1, total: 3 });
  });
  it('перенесённый день не входит в план', () => {
    expect(
      weekProgress([
        { weekday: 'чт', status: 'moved' },
        { weekday: 'сб', status: 'planned' },
      ]),
    ).toEqual({ done: 0, total: 1 });
  });
  it('пустая неделя', () => {
    expect(weekProgress([])).toEqual({ done: 0, total: 0 });
  });
});
