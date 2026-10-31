import type { ComponentProps } from 'react';
import { cx } from '../cx';
import styles from './Chip.module.css';

type Props = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  /** Включён ли фильтр; уходит в aria-pressed */
  pressed: boolean;
  /** Число рядом с названием: «Ноги 8» */
  count?: number;
};

export function Chip({ pressed, count, className, type = 'button', children, ...button }: Props) {
  return (
    <button {...button} type={type} aria-pressed={pressed} className={cx(styles.chip, pressed && styles.on, className)}>
      {children}
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  );
}
