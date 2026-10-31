import { cx } from '../cx';
import styles from './ProgressSegments.module.css';

type Props = {
  count: number;
  /** Индекс текущего сегмента с нуля; count и больше — всё пройдено */
  current: number;
  label?: string;
  className?: string;
};

export function ProgressSegments({ count, current, label = 'Прогресс', className }: Props) {
  const done = Math.min(Math.max(current, 0), count);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={done}
      aria-valuetext={`Пройдено ${done} из ${count}`}
      className={cx(styles.root, className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cx(styles.segment, i < current ? styles.done : i === current ? styles.current : styles.next)} />
      ))}
    </div>
  );
}
