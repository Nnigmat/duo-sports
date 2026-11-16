import { describe, expect, it } from 'vitest';
import { axisTicks, multiChartGeometry, TICK_HEIGHT } from './geometry';

const SIZE = { w: 326, h: 160, padX: 16, padY: 14 };

describe('multiChartGeometry', () => {
  it('держит размах не меньше minSpan, когда все значения нули', () => {
    const g = multiChartGeometry([[0, 0, 0], [0, 0, 0]], SIZE, 2);
    expect(g.hi - g.lo).toBeGreaterThanOrEqual(2);
    for (const line of g.ys) for (const y of line) expect(Number.isFinite(y)).toBe(true);
    expect(Number.isFinite(g.zeroY)).toBe(true);
  });

  it('соединяет только не-null точки', () => {
    const g = multiChartGeometry([[null, 2, null, -3]], SIZE, 2);
    expect(g.paths[0].startsWith('M')).toBe(true);
    expect(g.paths[0].match(/L/g)).toHaveLength(1);
    expect(g.ys[0][0]).toBeNull();
  });

  it('даёт пустой путь для линии без значений', () => {
    expect(multiChartGeometry([[null, null]], SIZE, 2).paths[0]).toBe('');
  });

  it('ставит единственную дату в центр', () => {
    expect(multiChartGeometry([[1]], SIZE, 2).xs).toEqual([163]);
  });

  it('держит ноль внутри поля, когда все значения отрицательные', () => {
    const g = multiChartGeometry([[-5, -3, -1]], SIZE, 2);
    expect(g.zeroY).toBeGreaterThanOrEqual(SIZE.padY);
    expect(g.zeroY).toBeLessThanOrEqual(SIZE.h - SIZE.padY);
  });
});

describe('axisTicks', () => {
  it('не повторяет ноль, когда все значения отрицательные', () => {
    const g = multiChartGeometry([[0, -1, -3]], SIZE, 2);
    const ticks = axisTicks(g, SIZE);
    expect(ticks).toHaveLength(2);
    expect(ticks.filter((t) => t.v === 0)).toHaveLength(1);
    expect(new Set(ticks.map((t) => t.y)).size).toBe(ticks.length);
  });

  it('не повторяет ноль, когда все значения положительные', () => {
    const ticks = axisTicks(multiChartGeometry([[0, 1, 3]], SIZE, 2), SIZE);
    expect(ticks).toHaveLength(2);
    expect(ticks.filter((t) => t.v === 0)).toHaveLength(1);
  });

  it('даёт три подписи, когда ноль внутри', () => {
    expect(axisTicks(multiChartGeometry([[-2, 3]], SIZE, 2), SIZE)).toHaveLength(3);
  });

  const apart = (ticks: Array<{ y: number }>) => {
    for (let i = 1; i < ticks.length; i++) expect(ticks[i].y - ticks[i - 1].y).toBeGreaterThanOrEqual(TICK_HEIGHT);
  };

  it('ноль у нижнего края (мелкий разброс вниз): подписи не налезают, ноль остаётся', () => {
    const ticks = axisTicks(multiChartGeometry([[0, 2, 5], [0, -0.3]], SIZE, 2), SIZE);
    apart(ticks);
    expect(ticks.filter((t) => t.v === 0)).toHaveLength(1);
  });

  it('перебор диапазонов: соседние подписи не ближе высоты строки, ноль всегда есть', () => {
    const values = [-50, -5, -1, -0.3, -0.1, 0, 0.1, 0.3, 1, 5, 50];
    for (const a of values)
      for (const b of values) {
        const ticks = axisTicks(multiChartGeometry([[0, a], [b]], SIZE, 2), SIZE);
        apart(ticks);
        expect(ticks.filter((t) => t.v === 0)).toHaveLength(1);
      }
  });

  it('ноль у верхнего края (мелкий разброс вверх): подписи не налезают, ноль остаётся', () => {
    const ticks = axisTicks(multiChartGeometry([[0, -2, -5], [0, 0.1, 0.3]], SIZE, 2), SIZE);
    apart(ticks);
    expect(ticks.filter((t) => t.v === 0)).toHaveLength(1);
  });
});
