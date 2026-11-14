export function chartGeometry(
  values: number[],
  size: { w: number; h: number; padX: number; padY: number },
): { xs: number[]; ys: number[]; line: string; area: string } {
  const { w, h, padX, padY } = size;
  const n = values.length;
  if (n === 0) return { xs: [], ys: [], line: '', area: '' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mid = (min + max) / 2;
  const span = Math.max(max - min, 2);
  const lo = mid - span / 2;
  const hi = mid + span / 2;
  const xs = values.map((_, i) => (n === 1 ? w / 2 : padX + (i * (w - 2 * padX)) / (n - 1)));
  const ys = values.map((v) => padY + ((hi - v) / (hi - lo)) * (h - 2 * padY));
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${line} L${xs[n - 1].toFixed(1)} ${h - padY} L${xs[0].toFixed(1)} ${h - padY} Z`;
  return { xs, ys, line, area };
}
