import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { canEnterTrainer } from '../auth/roles';
import { BottomTabBar } from './BottomTabBar/BottomTabBar';
import { sideNavFooterItems, sideNavItems, trainerSideNavItems } from './navItems';
import { SideNav } from './SideNav/SideNav';
import styles from './AppShell.module.css';

/** Тренер и админ видят своё боковое меню и не видят нижнюю панель ученика */
export function AppShell() {
  const auth = useAuth();
  const trainer = auth.status === 'in' && canEnterTrainer(auth.user.role);
  return (
    <div className={styles.shell}>
      <SideNav
        items={trainer ? trainerSideNavItems : sideNavItems}
        footerItems={sideNavFooterItems}
        caption={trainer ? 'Кабинет тренера' : undefined}
        onSignOut={() => void auth.signOut()}
      />
      <main className={styles.main}>
        <Outlet />
      </main>
      {!trainer && <BottomTabBar onSignOut={() => void auth.signOut()} />}
    </div>
  );
}
