import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import {
  isOpenTime,
  isStopwatchPaused,
  pauseStopwatch,
  resumeStopwatch,
  startStopwatch,
  stopwatchElapsedSec,
  stopwatchView,
  usesStopwatch,
} from './stopwatch';

describe('isOpenTime', () => {
  it('только цель 0–0', () => {
    expect(isOpenTime({ target: { min: 0, max: 0 } })).toBe(true);
    expect(isOpenTime({ target: { min: 0, max: 30 } })).toBe(false);
    expect(isOpenTime({ target: { min: 45, max: 45 } })).toBe(false);
  });
});

describe('usesStopwatch', () => {
  const steps = (blocks: Parameters<typeof buildSteps>[0]) => buildSteps(blocks);
  const max = { kind: 'time' as const, target: { min: 0, max: 0 } };
  it('время на максимум в подходах и круге', () => {
    const sets = steps([{ id: 's', mode: 'sets', title: 'S', restSec: 30, videoRounds: [], exercises: [{ id: 'p', name: 'Планка', ...max, sets: 1 }] }]);
    const circuit = steps([{ id: 'c', mode: 'circuit', title: 'C', rounds: 1, restSec: 30, videoRounds: [], exercises: [{ id: 'p', name: 'Планка', ...max }] }]);
    expect(usesStopwatch(sets[0])).toBe(true);
    expect(usesStopwatch(circuit[0])).toBe(true);
  });
  it('в таймерном блоке и при обычной цели нет', () => {
    const timed = steps([{ id: 't', mode: 'timed', title: 'T', exercises: [{ id: 'p', name: 'Планка', ...max }] }]);
    const plain = steps([{ id: 's', mode: 'sets', title: 'S', restSec: 30, videoRounds: [], exercises: [{ id: 'p', name: 'Планка', kind: 'time', target: { min: 30, max: 30 }, sets: 1 }] }]);
    expect(usesStopwatch(timed[0])).toBe(false);
    expect(usesStopwatch(plain[0])).toBe(false);
  });
});

describe('stopwatchView', () => {
  it('минуты и секунды', () => {
    expect(stopwatchView(75).label).toBe('01:15');
    expect(stopwatchView(0).label).toBe('00:00');
    expect(stopwatchView(9).label).toBe('00:09');
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
