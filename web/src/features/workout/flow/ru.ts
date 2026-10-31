/** Русские слова для интерфейса: склонение, даты, перечисления. */

export const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/** plural(5, ['подход', 'подхода', 'подходов']) → «подходов» */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const last2 = n % 100;
  const last = n % 10;
  if (last2 >= 11 && last2 <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** «Пятница, 30 октября» */
export function formatLongDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** [2] → «2», [2, 3] → «2 и 3», [1, 2, 3] → «1, 2 и 3» */
export function joinNumbers(numbers: number[]): string {
  if (numbers.length <= 1) return numbers.join('');
  return `${numbers.slice(0, -1).join(', ')} и ${numbers[numbers.length - 1]}`;
}
