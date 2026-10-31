import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { cx } from '../cx';
import styles from './ActionList.module.css';

export type ActionItem = {
  id: string;
  icon: IconName;
  title: string;
  description?: string;
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
          <button type="button" className={styles.row} onClick={it.onSelect}>
            <Icon name={it.icon} />
            <span className={styles.text}>
              <span className={styles.title}>{it.title}</span>
              {it.description && <span className={styles.description}>{it.description}</span>}
            </span>
            <Icon name="chevronRight" className={styles.chevron} />
          </button>
        </li>
      ))}
    </ul>
  );
}
