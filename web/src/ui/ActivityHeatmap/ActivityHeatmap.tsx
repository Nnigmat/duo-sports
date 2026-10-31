import type { CSSProperties } from 'react';
import { cx } from '../cx';
import styles from './ActivityHeatmap.module.css';

type Props = {
  /** Уровень активности 0–3 для каждого дня; по 7 подряд на неделю (колонка = неделя) */
  levels: Array<0 | 1 | 2 | 3>;
  /** Текст для скринридера: «Активность за 12 недель: 34 тренировки» */
  label: string;
  /** Растянуть по ширине контейнера: квадратные ячейки, число недель = levels.length / 7 */
  fluid?: boolean;
  className?: string;
};

export function ActivityHeatmap({ levels, label, fluid, className }: Props) {
  const weeks = Math.ceil(levels.length / 7);
  const style = fluid ? ({ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` } as CSSProperties) : undefined;
  return (
    <div role="img" aria-label={label} className={cx(styles.grid, fluid && styles.fluid, className)} style={style}>
      {levels.map((l, i) => (
        <span key={i} className={cx(styles.cell, styles[`l${l}`])} />
      ))}
    </div>
  );
}
