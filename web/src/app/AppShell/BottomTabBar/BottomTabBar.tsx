import { NavLink } from 'react-router-dom';
import { Icon } from '../../../ui';
import { navItems } from '../navItems';
import styles from './BottomTabBar.module.css';

type Props = {
  onSignOut: () => void;
};

export function BottomTabBar({ onSignOut }: Props) {
  return (
    <nav aria-label="Основная навигация" className={styles.bar}>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.tab}>
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
      <button type="button" className={styles.tab} onClick={onSignOut}>
        <Icon name="logout" />
        Выйти
      </button>
    </nav>
  );
}
