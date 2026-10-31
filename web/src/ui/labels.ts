import { MONTHS, plural } from '../features/workout/flow/ru';

/** Чистые функции подписей и клавиатуры для компонентов ui: без DOM, покрыты тестами. */

export type Tier = 0 | 1 | 2 | 3;

const ROMAN = ['', 'I', 'II', 'III'] as const;

export function roman(tier: 1 | 2 | 3): string {
  return ROMAN[tier];
}

/** «Без пропусков, уровень I» · «Без пропусков, ещё не получено» */
export function medalLabel(label: string, tier: Tier): string {
  return tier === 0 ? `${label}, ещё не получено` : `${label}, уровень ${ROMAN[tier]}`;
}

/** «1 неделя», «2 недели», «5 недель»; «1 день», «3 дня», «11 дней» */
export function streakText(n: number, unit: 'days' | 'weeks' = 'days'): string {
  const forms: [string, string, string] = unit === 'weeks' ? ['неделя', 'недели', 'недель'] : ['день', 'дня', 'дней'];
  return `${n} ${plural(n, forms)}`;
}

/** «ср, 4 ноября, уже стоит: Кардио и пресс»; date — «2026-11-04» */
export function dayLabel(d: { date: string; weekday: string; day: string; busy?: string }): string {
  const month = MONTHS[Number(d.date.slice(5, 7)) - 1] ?? '';
  const base = `${d.weekday}, ${d.day} ${month}`;
  return d.busy ? `${base}, уже стоит: ${d.busy}` : base;
}

/** Куда переходит фокус по стрелке в ряду из count элементов; null — клавиша не наша. */
export function arrowTarget(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (index + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

export type DayStatus = 'done' | 'planned' | 'missed' | 'moved' | 'rest';

const STATUS_WORD: Record<DayStatus, string> = {
  done: 'Выполнено',
  planned: 'Запланировано',
  missed: 'Пропущено',
  moved: 'Перенесено',
  rest: 'Отдых',
};

export function statusWord(status: DayStatus): string {
  return STATUS_WORD[status];
}

/** Подпись дня недели для скринридера: «пн, Отдых» · «ср, Запланировано, Кардио и пресс» */
export function weekDayLabel(d: { weekday: string; date?: string; status: DayStatus; today?: boolean; caption?: string }): string {
  return [d.date ? `${d.weekday} ${d.date}` : d.weekday, d.today ? 'сегодня' : null, STATUS_WORD[d.status], d.caption].filter(Boolean).join(', ');
}
