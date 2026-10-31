import type { ComponentProps } from 'react';
import { cx } from '../cx';
import styles from './Chip.module.css';

type Props = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  /** Включён ли фильтр; уходит в aria-pressed */
  pressed: boolean;
};

export function Chip({ pressed, className, type = 'button', children, ...button }: Props) {
  return (
    <button {...button} type={type} aria-pressed={pressed} className={cx(styles.chip, pressed && styles.on, className)}>
      {children}
    </button>
  );
}
