import { SOUND_STYLES } from '../../../../../shared/types';
import { describe, expect, it } from 'vitest';
import { partialGains, peakGain, toneFor } from './styles';

describe('стили сигналов', () => {
  it('у каждого стиля есть короткий и длинный, длинный не дольше 0,5 с', () => {
    for (const style of SOUND_STYLES) {
      expect(toneFor(style, 'short').sec).toBeGreaterThan(0);
      expect(toneFor(style, 'long').sec).toBeLessThanOrEqual(0.5);
      expect(toneFor(style, 'long').hz).toBeGreaterThan(toneFor(style, 'short').hz);
    }
  });

  it('classic остаётся прежним: 660 Гц и 990 Гц одним тоном', () => {
    expect(toneFor('classic', 'short')).toMatchObject({ hz: 660, sec: 0.15 });
    expect(toneFor('classic', 'long')).toMatchObject({ hz: 990, sec: 0.5 });
    expect(toneFor('classic', 'short').partials).toHaveLength(1);
  });

  it('доли обертонов в сумме дают 1', () => {
    for (const style of SOUND_STYLES) expect(partialGains(toneFor(style, 'long')).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe('peakGain', () => {
  it('80 % — прежние 0,4, 0 % — тишина, 100 % — 0,5', () => {
    expect(peakGain(80)).toBeCloseTo(0.4);
    expect(peakGain(0)).toBe(0);
    expect(peakGain(100)).toBe(0.5);
  });
  it('значения вне 0–100 обрезаются', () => {
    expect(peakGain(-5)).toBe(0);
    expect(peakGain(250)).toBe(0.5);
  });
});
