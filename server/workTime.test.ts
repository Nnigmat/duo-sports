import { describe, expect, it } from 'vitest';
import { workTimeStats } from './workTime';

const step = (completed: boolean, restSec?: number) => ({ completed, ...(restSec !== undefined && { restSec }) });

describe('workTimeStats', () => {
  it('вычитает отдых из длительности и делит на выполненные подходы', () => {
    // 600 с всего, отдыха 60 + 90 = 150, активных 450 на 3 подхода
    expect(workTimeStats(600, [step(true, 60), step(true, 90), step(true), step(false)])).toEqual({ sets: 3, restSec: 150, activeSec: 450, perSetSec: 150, setsSec: null, gapSec: null });
  });
  it('с метками отделяет подходы от шторок и переходов', () => {
    const marked = (startedAt: number, endedAt: number, restSec?: number) => ({ completed: true, startedAt, endedAt, ...(restSec !== undefined && { restSec }) });
    // подходы 40 + 50 = 90 с, отдых 60, активных 600 − 60 = 540, между ними 450
    expect(workTimeStats(600, [marked(0, 40000, 60), marked(100000, 150000)])).toMatchObject({ setsSec: 90, gapSec: 450 });
  });
  it('без длительности или без выполненных подходов — null', () => {
    expect(workTimeStats(null, [step(true)])).toBeNull();
    expect(workTimeStats(600, [step(false)])).toBeNull();
  });
  it('отдых больше длительности не даёт отрицательного времени', () => {
    expect(workTimeStats(100, [step(true, 300)])?.activeSec).toBe(0);
  });
});
