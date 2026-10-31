import { NavLink } from 'react-router-dom';
import { Icon } from '../../../ui';
import { navItems } from '../navItems';
import styles from './SideNav.module.css';

export function SideNav() {
  return (
    <nav aria-label="Основная навигация" className={styles.nav}>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.link}>
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
