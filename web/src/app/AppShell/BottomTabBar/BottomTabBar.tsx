import { NavLink } from 'react-router-dom';
import { Icon } from '../../../ui';
import { navItems } from '../navItems';
import styles from './BottomTabBar.module.css';

export function BottomTabBar() {
  return (
    <nav aria-label="Основная навигация" className={styles.bar}>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.tab}>
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
