import { cx } from '../cx';
import styles from './ProgressBar.module.css';

type Props = {
  /** Что измеряем: «Присед, до серебра» */
  label: string;
  value: number;
  /** По умолчанию 100: value — проценты */
  max?: number;
  /** Слова для скринридера вместо числа: «80 из 82 кг» */
  valueText?: string;
  className?: string;
};

/** Полоска прогресса к цели. Число рядом всегда пишем текстом: полоска его не заменяет. */
export function ProgressBar({ label, value, max = 100, valueText, className }: Props) {
  const clamped = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      className={cx(styles.track, className)}
    >
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
