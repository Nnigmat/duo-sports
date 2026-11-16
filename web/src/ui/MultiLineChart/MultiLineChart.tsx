import { useEffect, useRef, useState } from 'react';
import { cx } from '../cx';
import { axisTicks, multiChartGeometry, SIZE } from './geometry';
import { hitWidth, visibleLabels } from './labels';
import styles from './MultiLineChart.module.css';

export type MultiLineDate = { shortLabel: string; ariaLabel: string };
export type MultiLine = {
  id: string;
  values: Array<number | null>;
  /** var(--series-…) */
  color: string;
  /** Жирная линия поверх остальных */
  emphasis?: boolean;
};

type Props = {
  /** От старых к новым */
  dates: MultiLineDate[];
  lines: MultiLine[];
  selected: number;
  onSelect: (i: number) => void;
  /** Описание графика для скринридера */
  label: string;
  /** Минимальный размах шкалы в единицах значений */
  minSpan: number;
  formatTick: (v: number) => string;
  className?: string;
};

/** Несколько линий изменений на одной шкале. Дата выбирается вертикальной полосой-кнопкой на всю высоту. */
export function MultiLineChart({ dates, lines, selected, onSelect, label, minSpan, formatTick, className }: Props) {
  const { xs, ys, paths, zeroY, lo, hi } = multiChartGeometry(
    lines.map((l) => l.values),
    SIZE,
    minSpan,
  );
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(SIZE.w);
  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || SIZE.w));
    ro.observe(el);
    setWidth(el.clientWidth || SIZE.w);
    return () => ro.disconnect();
  }, []);
  const showLabel = visibleLabels(dates.length, selected, width);
  const hit = hitWidth(dates.length, width);
  const pct = (x: number) => `${(x / SIZE.w) * 100}%`;
  const order = lines.map((_, i) => i).sort((a, b) => Number(!!lines[a].emphasis) - Number(!!lines[b].emphasis));
  const ticks = axisTicks({ lo, hi, zeroY }, SIZE);
  return (
    <div role="group" aria-label={label} className={cx(styles.root, className)}>
      <div ref={plotRef} className={styles.plot}>
        <svg className={styles.svg} viewBox={`0 0 ${SIZE.w} ${SIZE.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <line className={styles.grid} x1="0" x2={SIZE.w} y1={SIZE.padY} y2={SIZE.padY} />
          <line className={styles.grid} x1="0" x2={SIZE.w} y1={SIZE.h - SIZE.padY} y2={SIZE.h - SIZE.padY} />
          <line className={styles.zero} x1="0" x2={SIZE.w} y1={zeroY} y2={zeroY} />
          {xs[selected] !== undefined && <line className={styles.pick} x1={xs[selected]} x2={xs[selected]} y1="0" y2={SIZE.h} />}
          {order.map((i) => {
            const l = lines[i];
            const present = l.values.filter((v) => v !== null).length;
            if (present === 0) return null;
            if (present === 1) {
              const j = l.values.findIndex((v) => v !== null);
              // Нулевой отрезок с круглым краем: точка остаётся круглой при любой ширине графика
              const d = `M${xs[j].toFixed(1)} ${(ys[i][j] ?? 0).toFixed(1)} l0 0`;
              return <path key={l.id} data-line={l.id} className={styles.line} d={d} stroke={l.color} strokeWidth={6} />;
            }
            return <path key={l.id} data-line={l.id} className={styles.line} d={paths[i]} stroke={l.color} strokeWidth={l.emphasis ? 3 : 1.5} />;
          })}
        </svg>
        {ticks.map((t) => (
          <span key={`${t.v}`} className={styles.yTick} aria-hidden="true" style={{ top: `${(t.y / SIZE.h) * 100}%` }}>
            {formatTick(t.v)}
          </span>
        ))}
        {dates.map((d, i) => (
          <button
            key={i}
            type="button"
            className={styles.strip}
            style={{ left: pct(xs[i]), width: hit, marginLeft: -hit / 2 }}
            aria-pressed={i === selected}
            aria-label={d.ariaLabel}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
      <div className={styles.axis}>
        {dates.map((d, i) => (
          <span key={i} className={cx(styles.tick, i === selected && styles.tickOn)} style={{ left: pct(xs[i]) }} hidden={!showLabel[i]}>
            {d.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
