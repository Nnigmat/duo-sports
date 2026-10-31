import type { ReactNode } from 'react';
import { cx } from '../cx';
import { IconButton } from '../IconButton/IconButton';
import { Text } from '../Text/Text';
import styles from './Screen.module.css';

type Action = { onClick: () => void; href?: undefined } | { href: string; onClick?: undefined };

type Props = {
  /** Название в шапке: блок тренировки, «Техника» и т. п. */
  label: string;
  /** Без back (например, на финише) место под стрелку остаётся, и название не смещается. */
  back?: Action;
  /** Без close крестика нет, место под него остаётся, и название не смещается. */
  close?: Action;
  backLabel?: string;
  closeLabel?: string;
  className?: string;
  children?: ReactNode;
};

/** Экран на всю высоту: шапка (← название ✕) и содержимое под ней. */
export function Screen({
  label,
  back,
  close,
  backLabel = 'Шаг назад',
  closeLabel = 'Закончить тренировку',
  className,
  children,
}: Props) {
  return (
    <div className={cx(styles.root, className)}>
      <header className={styles.header}>
        {back ? <IconButton bare icon="back" aria-label={backLabel} {...back} /> : <span aria-hidden="true" />}
        <Text variant="eyebrow" tag="h1" className={styles.label}>
          {label}
        </Text>
        {close ? <IconButton bare icon="close" aria-label={closeLabel} {...close} /> : <span aria-hidden="true" />}
      </header>
      {children}
    </div>
  );
}
