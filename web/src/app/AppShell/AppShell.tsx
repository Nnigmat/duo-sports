import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { canEnterTrainer } from '../auth/roles';
import { BottomTabBar } from './BottomTabBar/BottomTabBar';
import { navItems, sideNavFooterItems, sideNavItems, trainerNavItems, trainerSideNavItems } from './navItems';
import { SideNav } from './SideNav/SideNav';
import styles from './AppShell.module.css';

/** Тренер и админ: своё боковое меню на широком экране и своя нижняя панель на телефоне */
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
      {trainer ? (
        <BottomTabBar items={trainerNavItems} />
      ) : (
        <BottomTabBar items={navItems} onSignOut={() => void auth.signOut()} />
      )}
    </div>
  );
}
