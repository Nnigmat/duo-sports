import type { Role } from '../../../../shared/types';

/** Кабинет тренера (/trainer/*) открыт тренеру и админу */
export const canEnterTrainer = (role: Role): boolean => role !== 'athlete';

/** Куда попадает пользователь, открыв «/» */
export const homePath = (role: Role): string => (canEnterTrainer(role) ? '/trainer' : '/');

/** Правила агента и другие настройки всего приложения — только админу */
export const isAdmin = (role: Role): boolean => role === 'admin';
