import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './TopBar.module.css';

type Props = {
  /** Слева: «← Упражнения» или «Отмена» */
  start?: ReactNode;
  /** Справа: «Редактировать» или «Сохранить» */
  end?: ReactNode;
  className?: string;
};

/** Шапка страницы без названия: действие слева и действие справа. */
export function TopBar({ start, end, className }: Props) {
  return (
    <div className={cx(styles.bar, className)}>
      <div className={styles.slot}>{start}</div>
      <div className={cx(styles.slot, styles.end)}>{end}</div>
    </div>
  );
}
