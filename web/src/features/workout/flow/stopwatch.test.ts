import { describe, expect, it } from 'vitest';
import {
  isOpenTime,
  isStopwatchPaused,
  pauseStopwatch,
  resumeStopwatch,
  startStopwatch,
  stopwatchElapsedSec,
  stopwatchView,
} from './stopwatch';

describe('isOpenTime', () => {
  it('только цель 0–0', () => {
    expect(isOpenTime({ target: { min: 0, max: 0 } })).toBe(true);
    expect(isOpenTime({ target: { min: 0, max: 30 } })).toBe(false);
    expect(isOpenTime({ target: { min: 45, max: 45 } })).toBe(false);
  });
});

describe('stopwatchView', () => {
  it('минуты и секунды', () => {
    expect(stopwatchView(75).label).toBe('1:15');
    expect(stopwatchView(0).label).toBe('0:00');
    expect(stopwatchView(9).label).toBe('0:09');
    expect(stopwatchView(3700).label).toBe('61:40');
  });
});

describe('секундомер на метках времени', () => {
  it('считает вверх по часам, а не по тикам', () => {
    const w = startStopwatch(1_000);
    expect(stopwatchElapsedSec(w, 1_000)).toBe(0);
    expect(stopwatchElapsedSec(w, 1_999)).toBe(0);
    // вкладка спала: одно обновление через 90 с даёт верное время
    expect(stopwatchElapsedSec(w, 91_000)).toBe(90);
  });

  it('пауза замораживает время, продолжение идёт дальше', () => {
    const paused = pauseStopwatch(startStopwatch(0), 10_000);
    expect(isStopwatchPaused(paused)).toBe(true);
    expect(stopwatchElapsedSec(paused, 60_000)).toBe(10);
    const resumed = resumeStopwatch(paused, 60_000);
    expect(stopwatchElapsedSec(resumed, 65_000)).toBe(15);
  });

  it('повторные пауза и продолжение ничего не меняют', () => {
    const w = startStopwatch(0);
    expect(resumeStopwatch(w, 5_000)).toBe(w);
    const p = pauseStopwatch(w, 5_000);
    expect(pauseStopwatch(p, 9_000)).toBe(p);
  });
});
