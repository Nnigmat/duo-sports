import type { Role } from '../../../../shared/types';

/** Кабинет тренера (/trainer/*) открыт тренеру и админу */
export const canEnterTrainer = (role: Role): boolean => role !== 'athlete';

/** Куда попадает пользователь, открыв «/» */
export const homePath = (role: Role): string => (canEnterTrainer(role) ? '/trainer' : '/');
