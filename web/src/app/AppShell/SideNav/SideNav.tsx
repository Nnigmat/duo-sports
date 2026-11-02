import { NavLink } from 'react-router-dom';
import { Icon } from '../../../ui';
import type { NavItem } from '../navItems';
import styles from './SideNav.module.css';

type Props = {
  items: NavItem[];
  /** Подпись над меню: «Кабинет тренера» */
  caption?: string;
};

export function SideNav({ items, caption }: Props) {
  return (
    <nav aria-label="Основная навигация" className={styles.nav}>
      {caption && (
        <div className={styles.brand}>
          <span className={styles.brandName}>Workout Tracker</span>
          <span className={styles.brandCaption}>{caption}</span>
        </div>
      )}
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.link}>
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
