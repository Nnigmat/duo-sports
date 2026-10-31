import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './ProgressRing.module.css';

type Props = {
  /** 0–1 */
  value: number;
  /** Диаметр, px */
  size?: number;
  /** Толщина обводки, px (size-progress) */
  stroke?: number;
  /** primary — таймер; accent — отдых; muted — пауза, неактивное */
  color?: 'primary' | 'accent' | 'muted';
  /**
   * Время плавного перехода дуги, мс. Для таймера, который обновляется раз в секунду, ставьте 1000
   * (дуга движется непрерывно); для значений, которые меняются часто или вручную, — 0 (по умолчанию).
   */
  smoothing?: number;
  /** Любое содержимое в центре */
  children?: ReactNode;
  className?: string;
};

export function ProgressRing({ value, size = 168, stroke = 8, color = 'primary', smoothing = 0, children, className }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className={cx(styles.root, className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={styles.svg}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={styles.track} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transitionDuration: `${smoothing}ms` }}
          className={cx(styles.arc, styles[color])}
        />
      </svg>
      <div className={styles.center}>{children}</div>
    </div>
  );
}
