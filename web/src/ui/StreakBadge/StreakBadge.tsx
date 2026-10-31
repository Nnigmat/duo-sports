import { Icon } from '../Icon/Icon';
import { cx } from '../cx';
import { streakText } from '../labels';
import styles from './StreakBadge.module.css';

type Props = {
  count: number;
  /** По умолчанию дни */
  unit?: 'days' | 'weeks';
  className?: string;
};

/** Серия: огонь + число со склонением. Смысл несёт текст, цвет — украшение. */
export function StreakBadge({ count, unit = 'days', className }: Props) {
  return (
    <span className={cx(styles.badge, className)}>
      <Icon name="flame" size={20} />
      {streakText(count, unit)}
    </span>
  );
}
