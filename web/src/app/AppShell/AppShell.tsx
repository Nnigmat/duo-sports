import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { canEnterTrainer } from '../auth/roles';
import { BottomTabBar } from './BottomTabBar/BottomTabBar';
import { sideNavItems, trainerSideNavItems } from './navItems';
import { SideNav } from './SideNav/SideNav';
import styles from './AppShell.module.css';

/** Тренер и админ видят своё боковое меню и не видят нижнюю панель ученика */
export function AppShell() {
  const auth = useAuth();
  const trainer = auth.status === 'in' && canEnterTrainer(auth.user.role);
  return (
    <div className={styles.shell}>
      {trainer ? <SideNav items={trainerSideNavItems} caption="Кабинет тренера" /> : <SideNav items={sideNavItems} />}
      <main className={styles.main}>
        <Outlet />
      </main>
      {!trainer && <BottomTabBar />}
    </div>
  );
}
