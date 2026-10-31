import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { cx } from '../cx';
import { medalLabel, type Tier } from '../labels';
import { TierMark } from '../TierMark/TierMark';
import styles from './AchievementMedal.module.css';

type Props = {
  icon: IconName;
  /** 0 — не получена, 1 — бронза, 2 — серебро, 3 — золото */
  tier: Tier;
  /** Награда за серию: внешнее кольцо (только с tier > 0) */
  streak?: boolean;
  size?: 40 | 48 | 56 | 72;
  /** Название награды; уровень добавляется словами в aria-label */
  label: string;
  className?: string;
};

export function AchievementMedal({ icon, tier, streak, size = 56, label, className }: Props) {
  return (
    <span
      role="img"
      aria-label={medalLabel(label, tier)}
      className={cx(styles.medal, tier === 0 && styles.empty, className)}
      style={{ width: size, height: size }}
    >
      <TierMark tier={tier} size={size} streak={streak && tier > 0} className={styles.mark} />
      <Icon name={icon} size={size <= 48 ? 20 : 24} className={styles.icon} />
    </span>
  );
}
