import { NavLink } from 'react-router-dom';
import { Icon } from '../../../ui';
import type { NavItem } from '../navItems';
import styles from './BottomTabBar.module.css';

type Props = {
  items: NavItem[];
  /** Без обработчика кнопки «Выйти» нет: у тренера она в профиле */
  onSignOut?: () => void;
};

export function BottomTabBar({ items, onSignOut }: Props) {
  return (
    <nav aria-label="Основная навигация" className={styles.bar}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.tab}>
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
      {onSignOut && (
        <button type="button" className={styles.tab} onClick={onSignOut}>
          <Icon name="logout" />
          Выйти
        </button>
      )}
    </nav>
  );
}
