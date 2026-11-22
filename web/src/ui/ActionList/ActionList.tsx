import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { cx } from '../cx';
import styles from './ActionList.module.css';

export type ActionItem = {
  id: string;
  icon: IconName;
  title: string;
  /** Если disabled — почему; состояние не только цветом */
  description?: string;
  /** Необратимое действие: красные иконка и название */
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type Props = {
  items: ActionItem[];
  className?: string;
};

/** Список действий: каждая строка — настоящая кнопка, не ниже 56 px. */
export function ActionList({ items, className }: Props) {
  return (
    <ul className={cx(styles.list, className)}>
      {items.map((it) => (
        <li key={it.id}>
          <button type="button" className={cx(styles.row, it.danger && styles.danger)} disabled={it.disabled} onClick={it.onSelect}>
            <Icon name={it.icon} />
            <span className={styles.text}>
              <span className={styles.title}>{it.title}</span>
              {it.description && <span className={styles.description}>{it.description}</span>}
            </span>
            {!it.disabled && <Icon name="chevronRight" className={styles.chevron} />}
          </button>
        </li>
      ))}
    </ul>
  );
}
