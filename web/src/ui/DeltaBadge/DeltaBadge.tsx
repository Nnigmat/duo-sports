import { formatDelta } from '../../features/measurements/measurements';
import { cx } from '../cx';
import styles from './DeltaBadge.module.css';

type Props = { value: number; unit?: string; className?: string };

function meaning(value: number): string {
  if (Math.abs(value) < 0.05) return 'без изменений';
  return value < 0 ? 'снижение' : 'рост';
}

/** Изменение показателя: знак и число видны всем, слово для скринридера дублирует смысл. */
export function DeltaBadge({ value, unit, className }: Props) {
  return (
    <span className={cx(styles.badge, className)}>
      {unit ? `${formatDelta(value)} ${unit}` : formatDelta(value)}
      <span className={styles.srOnly}>{meaning(value)}</span>
    </span>
  );
}
