import type { IconName } from '../../ui';

export type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  /** Только в боковой навигации на десктопе */
  desktopOnly?: boolean;
};

export const navItems: NavItem[] = [
  { to: '/', label: 'Сегодня', icon: 'play' },
  { to: '/plan', label: 'План', icon: 'target' },
  { to: '/exercises', label: 'Упражнения', icon: 'kettlebell' },
  { to: '/progress/achievements', label: 'Прогресс', icon: 'trophy' },
  { to: '/profile', label: 'Профиль', icon: 'duo' },
  { to: '/videos', label: 'Видео', icon: 'video', desktopOnly: true },
];
