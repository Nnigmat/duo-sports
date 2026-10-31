import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './ChipGroup.module.css';

type Props = {
  /** Что выбирают: «Группы мышц», «Снаряд» */
  label: string;
  /** Одна строка с горизонтальной прокруткой вместо переноса */
  scroll?: boolean;
  className?: string;
  children: ReactNode;
};

/** Набор Chip с общей подписью для скринридера. */
export function ChipGroup({ label, scroll, className, children }: Props) {
  return (
    <div role="group" aria-label={label} className={cx(styles.group, scroll && styles.scroll, className)}>
      {children}
    </div>
  );
}
