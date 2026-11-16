export type ChartSize = { w: number; h: number; padX: number; padY: number };

/** Размер в единицах viewBox */
export const SIZE: ChartSize = { w: 326, h: 160, padX: 16, padY: 14 };

/**
 * Геометрия нескольких линий на общей шкале. Диапазон включает ноль и все значения,
 * размах не меньше minSpan. Пропуски (null) линия перешагивает.
 */
export function multiChartGeometry(
  lines: Array<Array<number | null>>,
  size: ChartSize,
  minSpan: number,
): { xs: number[]; ys: Array<Array<number | null>>; paths: string[]; zeroY: number; lo: number; hi: number } {
  const { w, h, padX, padY } = size;
  const n = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const all = lines.flat().filter((v): v is number => v !== null);
  const min = Math.min(0, ...all);
  const max = Math.max(0, ...all);
  const mid = (min + max) / 2;
  const span = Math.max(max - min, minSpan);
  const lo = mid - span / 2;
  const hi = mid + span / 2;
  const yOf = (v: number) => padY + ((hi - v) / (hi - lo)) * (h - 2 * padY);
  const xs = Array.from({ length: n }, (_, i) => (n === 1 ? w / 2 : padX + (i * (w - 2 * padX)) / (n - 1)));
  const ys = lines.map((l) => l.map((v) => (v === null ? null : yOf(v))));
  const paths = ys.map((l) => {
    const pts: string[] = [];
    l.forEach((y, i) => {
      if (y !== null) pts.push(`${pts.length === 0 ? 'M' : 'L'}${xs[i].toFixed(1)} ${y.toFixed(1)}`);
    });
    return pts.join(' ');
  });
  return { xs, ys, paths, zeroY: yOf(0), lo, hi };
}

/** Высота подписи оси в единицах viewBox: 11 px × line-height 1.2, с запасом. Высота графика фиксирована, единицы равны пикселям. */
export const TICK_HEIGHT = 14;

/** Подписи оси: верх, ноль, низ. Подпись края, ближе высоты подписи к нулю, не рисуем: остаётся «0». */
export function axisTicks(g: { lo: number; hi: number; zeroY: number }, size: ChartSize): Array<{ v: number; y: number }> {
  const top = size.padY;
  const bottom = size.h - size.padY;
  const ticks: Array<{ v: number; y: number }> = [];
  if (Math.abs(g.zeroY - top) >= TICK_HEIGHT) ticks.push({ v: g.hi, y: top });
  ticks.push({ v: 0, y: g.zeroY });
  if (Math.abs(g.zeroY - bottom) >= TICK_HEIGHT) ticks.push({ v: g.lo, y: bottom });
  return ticks;
}
