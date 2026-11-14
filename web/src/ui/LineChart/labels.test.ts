import { describe, expect, it } from 'vitest';
import { visibleLabels } from './labels';

const shown = (flags: boolean[]) => flags.flatMap((f, i) => (f ? [i] : []));

describe('visibleLabels', () => {
  it('влезают все: показаны все', () => {
    expect(shown(visibleLabels(4, 3, 326))).toEqual([0, 1, 2, 3]);
  });
  it('шесть точек на 224 px: подписи не ближе 52 px друг к другу', () => {
    const idx = shown(visibleLabels(6, 5, 224));
    expect(idx).toContain(5);
    const gap = (224 * 294) / 326 / 5;
    for (let k = 1; k < idx.length; k++) expect((idx[k] - idx[k - 1]) * gap).toBeGreaterThanOrEqual(52);
  });
  it('выбранная подпись всегда видна, соседи рядом с ней скрыты', () => {
    const flags = visibleLabels(12, 1, 224);
    expect(flags[1]).toBe(true);
    expect(flags[0]).toBe(false);
    expect(flags[2]).toBe(false);
  });
  it('одна точка и пустой список', () => {
    expect(visibleLabels(1, 0, 224)).toEqual([true]);
    expect(visibleLabels(0, 0, 224)).toEqual([]);
  });
});
