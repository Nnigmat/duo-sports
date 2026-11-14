import type { IconName } from '../../ui';

export type NavItem = {
  to: string;
  label: string;
  icon: IconName;
};

const today: NavItem = { to: '/', label: 'Сегодня', icon: 'play' };
const plan: NavItem = { to: '/plan', label: 'План', icon: 'target' };
const exercises: NavItem = { to: '/exercises', label: 'Упражнения', icon: 'kettlebell' };
const routines: NavItem = { to: '/routines', label: 'Разминки', icon: 'flame' };
const equipment: NavItem = { to: '/equipment', label: 'Инвентарь', icon: 'dumbbell' };
const achievements: NavItem = { to: '/progress/achievements', label: 'Достижения', icon: 'trophy' };
const measurements: NavItem = { to: '/progress/measurements', label: 'Замеры', icon: 'bars' };
const imports: NavItem = { to: '/import', label: 'Импорт', icon: 'upload' };
const profile: NavItem = { to: '/profile', label: 'Профиль', icon: 'duo' };

/** Нижняя панель на телефоне: пять пунктов */
export const navItems: NavItem[] = [today, plan, achievements, measurements, profile];

/** Боковая панель: места больше, поэтому здесь ещё «Упражнения» и «Импорт»; «Профиль» вынесен вниз */
export const sideNavItems: NavItem[] = [today, plan, exercises, routines, achievements, measurements, imports];

const athletes: NavItem = { to: '/trainer', label: 'Ученики', icon: 'users' };

/** Кабинет тренера: ученики, общая библиотека упражнений и инвентарь */
export const trainerSideNavItems: NavItem[] = [athletes, exercises, routines, equipment];

/** Нижняя панель тренера на телефоне; «Выйти» в профиле */
export const trainerNavItems: NavItem[] = [...trainerSideNavItems, profile];

/** Низ бокового меню: «Профиль»; рядом с ним кнопка «Выйти» */
export const sideNavFooterItems: NavItem[] = [profile];
