import type { IconName } from '../../ui';

export type NavItem = {
  to: string;
  label: string;
  icon: IconName;
};

const today: NavItem = { to: '/', label: 'Сегодня', icon: 'play' };
const plan: NavItem = { to: '/plan', label: 'План', icon: 'target' };
const exercises: NavItem = { to: '/exercises', label: 'Упражнения', icon: 'kettlebell' };
const stats: NavItem = { to: '/progress/achievements', label: 'Статистика', icon: 'trophy' };
const imports: NavItem = { to: '/import', label: 'Импорт', icon: 'upload' };
const profile: NavItem = { to: '/profile', label: 'Профиль', icon: 'duo' };

/** Нижняя панель на телефоне: четыре пункта, как в макете */
export const navItems: NavItem[] = [today, plan, stats, profile];

/** Боковая панель: места больше, поэтому здесь ещё «Упражнения» и «Импорт» */
export const sideNavItems: NavItem[] = [today, plan, exercises, stats, imports, profile];

/** Кабинет тренера: ученики, общая библиотека упражнений и профиль; нижней панели у тренера нет */
export const trainerSideNavItems: NavItem[] = [
  { to: '/trainer', label: 'Ученики', icon: 'users' },
  exercises,
  profile,
];
