import { Outlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar/BottomTabBar';
import { SideNav } from './SideNav/SideNav';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.shell}>
      <SideNav />
      <main className={styles.main}>
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
