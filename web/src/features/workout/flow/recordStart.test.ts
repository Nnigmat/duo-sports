import { describe, expect, it } from 'vitest';
import { LONG_BEEP_MS, POLL_MARGIN_MS, recordStartView, startSignalAt } from './recordStart';

describe('recordStartView', () => {
  it('в начале показывает 5, запись не стартует', () => {
    expect(recordStartView(5, 0)).toEqual({ left: 5, record: false });
  });

  it('число уменьшается каждую секунду', () => {
    expect(recordStartView(5, 999).left).toBe(5);
    expect(recordStartView(5, 1000).left).toBe(4);
    expect(recordStartView(5, 4500).left).toBe(1);
  });

  it('после пятой секунды держит 0 на время длинного сигнала, запись ещё не идёт', () => {
    expect(recordStartView(5, 5000)).toEqual({ left: 0, record: false });
    expect(recordStartView(5, 5000 + LONG_BEEP_MS + POLL_MARGIN_MS - 1).record).toBe(false);
  });

  it('запись стартует, когда длинный сигнал закончился, с запасом на опрос', () => {
    expect(recordStartView(5, 5000 + LONG_BEEP_MS + POLL_MARGIN_MS).record).toBe(true);
  });

  it('без задержки запись стартует сразу', () => {
    expect(recordStartView(0, 0).record).toBe(true);
  });
});

describe('startSignalAt', () => {
  it('короткие на секундах 0–4, длинный на 5', () => {
    expect([0, 1, 2, 3, 4].map((s) => startSignalAt(5, s))).toEqual(['short', 'short', 'short', 'short', 'short']);
    expect(startSignalAt(5, 5)).toBe('long');
  });

  it('дальше тишина', () => {
    expect(startSignalAt(5, 6)).toBeNull();
  });

  it('без задержки сигналов нет', () => {
    expect(startSignalAt(0, 0)).toBeNull();
  });
});
