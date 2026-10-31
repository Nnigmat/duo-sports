import { cx } from '../cx';
import styles from './StatTile.module.css';

type Props = {
  /** Число с единицей: «60 кг × 10» */
  value: string;
  label: string;
  className?: string;
};

/** Плитка показателя: крупное число и подпись. */
export function StatTile({ value, label, className }: Props) {
  return (
    <div className={cx(styles.tile, className)}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
