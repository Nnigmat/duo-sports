import { cx } from '../cx';
import type { Tier } from '../labels';
import { tierVars } from '../TierMark/TierMark';
import styles from './GoalChip.module.css';

type Props = {
  /** Уровень, к которому идёт спортсмен: 1–3 */
  tier: Exclude<Tier, 0>;
  /** Текст целиком: «Цель: Серебро · 8 нед» */
  children: string;
  className?: string;
};

/** Пунктирный чип цели в цвете следующего уровня. Название уровня всегда в тексте. */
export function GoalChip({ tier, children, className }: Props) {
  return (
    <span className={cx(styles.chip, className)} style={tierVars(tier)}>
      {children}
    </span>
  );
}
