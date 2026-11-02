import { describe, expect, it } from 'vitest';
import { ACTIVE_WINDOW_SEC, activeComment, clampSeek, formatTime, nextSpeed, prevNext, speedLabel, type PlayerComment } from './player';

const c = (id: string, timecodeSec: number): PlayerComment => ({ id, timecodeSec, text: id, author: 'trainer' });
const list = [c('b', 21), c('a', 9), c('c', 31)];

describe('formatTime', () => {
  it('мм:сс без ведущего нуля у минут', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(21)).toBe('0:21');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
  it('мусор даёт 0:00', () => {
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });
});

describe('clampSeek', () => {
  it('держит в пределах видео', () => {
    expect(clampSeek(3, -5, 38)).toBe(0);
    expect(clampSeek(20, 5, 38)).toBe(25);
    expect(clampSeek(36, 5, 38)).toBe(38);
  });
  it('нулевая длительность', () => {
    expect(clampSeek(0, 5, 0)).toBe(0);
  });
});

describe('speed', () => {
  it('цикл 1 → 0,5 → 0,25 → 1', () => {
    expect(nextSpeed(1)).toBe(0.5);
    expect(nextSpeed(0.5)).toBe(0.25);
    expect(nextSpeed(0.25)).toBe(1);
    expect(nextSpeed(3)).toBe(1);
  });
  it('подписи', () => {
    expect([1, 0.5, 0.25].map(speedLabel)).toEqual(['1×', '0,5×', '0,25×']);
  });
});

describe('activeComment', () => {
  it('окно 6 с от метки, метка включена, конец нет', () => {
    expect(ACTIVE_WINDOW_SEC).toBe(6);
    expect(activeComment(list, 8.9)).toBeNull();
    expect(activeComment(list, 9)?.id).toBe('a');
    expect(activeComment(list, 14.9)?.id).toBe('a');
    expect(activeComment(list, 15)).toBeNull();
  });
  it('при пересечении окон берёт последнюю метку', () => {
    expect(activeComment([c('a', 10), c('b', 12)], 13)?.id).toBe('b');
  });
  it('пустой список', () => {
    expect(activeComment([], 5)).toBeNull();
  });
});

describe('prevNext', () => {
  it('до первой метки', () => {
    expect(prevNext(list, 2)).toEqual({ prev: null, next: 'a', position: 0, total: 3 });
  });
  it('на активной: предыдущая — соседняя в списке', () => {
    expect(prevNext(list, 22)).toEqual({ prev: 'a', next: 'c', position: 2, total: 3 });
  });
  it('между окнами: предыдущая — последняя пройденная', () => {
    expect(prevNext(list, 17)).toEqual({ prev: 'a', next: 'b', position: 1, total: 3 });
    expect(prevNext(list, 17).next).toBe('b');
  });
  it('после последней', () => {
    expect(prevNext(list, 37)).toEqual({ prev: 'c', next: null, position: 3, total: 3 });
  });
  it('пусто', () => {
    expect(prevNext([], 3)).toEqual({ prev: null, next: null, position: 0, total: 0 });
  });
});
