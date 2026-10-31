import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { cx } from '../cx';
import { medalLabel, type Tier } from '../labels';
import styles from './AchievementMedal.module.css';

type Props = {
  icon: IconName;
  /** 0 — не получена, 1–3 — уровень */
  tier: Tier;
  /** Награда за серию: внешнее кольцо (только с tier > 0) */
  streak?: boolean;
  size?: 40 | 56 | 72;
  /** Название награды; уровень добавляется словами в aria-label */
  label: string;
  className?: string;
};

export function AchievementMedal({ icon, tier, streak, size = 56, label, className }: Props) {
  return (
    <span
      role="img"
      aria-label={medalLabel(label, tier)}
      className={cx(styles.medal, styles[`tier${tier}`], streak && tier > 0 && styles.streak, className)}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={size === 40 ? 20 : 24} />
    </span>
  );
}
