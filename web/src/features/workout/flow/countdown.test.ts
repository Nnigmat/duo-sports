import { describe, expect, it } from 'vitest';
import {
  addTime,
  isFinished,
  isPaused,
  pause,
  remainingSec,
  resume,
  startCountdown,
} from './countdown';

const T0 = 1_000_000;

describe('startCountdown', () => {
  it('сразу идёт, осталось всё время', () => {
    const c = startCountdown(30, T0);
    expect(remainingSec(c, T0)).toBe(30);
    expect(isPaused(c)).toBe(false);
  });

  it('autoStart выключен: стоит на паузе', () => {
    const c = startCountdown(30, T0, false);
    expect(isPaused(c)).toBe(true);
    expect(remainingSec(c, T0 + 5000)).toBe(30);
  });
});

describe('remainingSec', () => {
  it('считает по часам, а не по числу тиков', () => {
    const c = startCountdown(30, T0);
    expect(remainingSec(c, T0 + 10_000)).toBe(20);
  });

  it('округляет вверх: 00:01 держится до последней миллисекунды', () => {
    const c = startCountdown(30, T0);
    expect(remainingSec(c, T0 + 29_001)).toBe(1);
    expect(remainingSec(c, T0 + 30_000)).toBe(0);
  });

  it('не уходит ниже нуля', () => {
    const c = startCountdown(30, T0);
    expect(remainingSec(c, T0 + 99_000)).toBe(0);
  });
});

describe('isFinished', () => {
  it('true, когда время вышло', () => {
    const c = startCountdown(30, T0);
    expect(isFinished(c, T0 + 29_999)).toBe(false);
    expect(isFinished(c, T0 + 30_000)).toBe(true);
  });

  it('на паузе время не выходит', () => {
    const c = pause(startCountdown(30, T0), T0 + 10_000);
    expect(isFinished(c, T0 + 999_000)).toBe(false);
  });
});

describe('pause и resume', () => {
  it('пауза замораживает остаток', () => {
    const c = pause(startCountdown(30, T0), T0 + 10_000);
    expect(isPaused(c)).toBe(true);
    expect(remainingSec(c, T0 + 60_000)).toBe(20);
  });

  it('возобновление продолжает с остатка', () => {
    const paused = pause(startCountdown(30, T0), T0 + 10_000);
    const c = resume(paused, T0 + 60_000);
    expect(isPaused(c)).toBe(false);
    expect(remainingSec(c, T0 + 65_000)).toBe(15);
  });

  it('повторные пауза и возобновление ничего не ломают', () => {
    const running = startCountdown(30, T0);
    expect(remainingSec(resume(running, T0 + 5000), T0 + 10_000)).toBe(20);
    const paused = pause(running, T0 + 10_000);
    expect(remainingSec(pause(paused, T0 + 20_000), T0 + 30_000)).toBe(20);
  });

  it('после конца пауза и возобновление не оживляют отсчёт', () => {
    const done = startCountdown(30, T0);
    const c = resume(pause(done, T0 + 40_000), T0 + 50_000);
    expect(remainingSec(c, T0 + 60_000)).toBe(0);
    expect(isFinished(c, T0 + 60_000)).toBe(true);
  });

  it('не мутирует исходное состояние', () => {
    const c = startCountdown(30, T0);
    pause(c, T0 + 10_000);
    expect(isPaused(c)).toBe(false);
  });
});

describe('addTime', () => {
  it('+15 с к идущему отсчёту', () => {
    const c = addTime(startCountdown(60, T0), 15, T0 + 10_000);
    expect(remainingSec(c, T0 + 10_000)).toBe(65);
    expect(remainingSec(c, T0 + 20_000)).toBe(55);
  });

  it('+15 с на паузе: остаётся на паузе', () => {
    const c = addTime(pause(startCountdown(60, T0), T0 + 10_000), 15, T0 + 20_000);
    expect(isPaused(c)).toBe(true);
    expect(remainingSec(c, T0 + 90_000)).toBe(65);
  });

  it('общее время растёт, чтобы доля на кольце не превышала 1', () => {
    const c = addTime(startCountdown(60, T0), 15, T0 + 5000);
    expect(c.totalSec).toBe(70);
  });

  it('если остаток после добавления меньше общего времени, оно не меняется', () => {
    const c = addTime(startCountdown(60, T0), 15, T0 + 40_000);
    expect(c.totalSec).toBe(60);
  });
});
