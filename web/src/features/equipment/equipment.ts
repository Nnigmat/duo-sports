import { plural } from '../workout/flow/ru';

/** Подпись под названием: «3 упражнения» или «Не используется» */
export function usageText(n: number): string {
  return n === 0 ? 'Нет упражнений' : `${n} ${plural(n, ['упражнение', 'упражнения', 'упражнений'])}`;
}

/** Сколько всего позиций: «12 позиций» */
export function totalText(n: number): string {
  return `${n} ${plural(n, ['позиция', 'позиции', 'позиций'])}`;
}

/** Названия сравниваются без регистра и «ё», как на сервере */
export const sameName = (a: string, b: string): boolean => {
  const k = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ё/g, 'е');
  return k(a) === k(b);
};
