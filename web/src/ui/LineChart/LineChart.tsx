import { chartGeometry } from '../../features/measurements/measurements';
import { cx } from '../cx';
import styles from './LineChart.module.css';

export type LinePoint = { shortLabel: string; ariaLabel: string; value: number };

type Props = {
  /** От старых к новым */
  points: LinePoint[];
  selected: number;
  onSelect: (i: number) => void;
  /** Описание графика для скринридера: «Вес с 5 сентября по 14 ноября: от 74,2 до 72 кг» */
  label: string;
  className?: string;
};

const SIZE = { w: 326, h: 120, padX: 16, padY: 14 };
/** Подписи под точками не накладываются: при большом числе точек остаются первая, последняя и выбранная */
const MAX_LABELS = 7;

/** Линия динамики. Точки — кнопки 44 px; выбранная крупнее и залита, смысл не держится на цвете. */
export function LineChart({ points, selected, onSelect, label, className }: Props) {
  const { xs, ys, line, area } = chartGeometry(
    points.map((p) => p.value),
    SIZE,
  );
  const crowded = points.length > MAX_LABELS;
  const pct = (x: number) => `${(x / SIZE.w) * 100}%`;
  return (
    <div role="group" aria-label={label} className={cx(styles.root, className)}>
      <div className={styles.plot}>
        <svg className={styles.svg} viewBox={`0 0 ${SIZE.w} ${SIZE.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {[SIZE.padY, SIZE.h / 2, SIZE.h - SIZE.padY].map((y) => (
            <line key={y} className={styles.grid} x1="0" x2={SIZE.w} y1={y} y2={y} />
          ))}
          {points.length > 0 && <line className={styles.pick} x1={xs[selected]} x2={xs[selected]} y1="0" y2={SIZE.h} />}
          {points.length > 1 && <path className={styles.area} d={area} />}
          {points.length > 1 && <path className={styles.line} d={line} />}
        </svg>
        {points.map((p, i) => (
          <button
            key={i}
            type="button"
            className={styles.dot}
            style={{ left: pct(xs[i]), top: ys[i] }}
            aria-pressed={i === selected}
            aria-label={p.ariaLabel}
            onClick={() => onSelect(i)}
          >
            <span className={cx(styles.mark, i === selected && styles.markOn)} />
          </button>
        ))}
      </div>
      <div className={styles.axis}>
        {points.map((p, i) => (
          <span
            key={i}
            className={cx(styles.tick, i === selected && styles.tickOn)}
            style={{ left: pct(xs[i]) }}
            hidden={crowded && i !== selected && i !== 0 && i !== points.length - 1}
          >
            {p.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
