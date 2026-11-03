import type { AthleteListResponse, AthleteRow, AthleteStatus } from '../../../../shared/types';
import { parseIso } from '../plan/plan';
import { plural } from '../workout/flow/ru';

const NB = '\u00a0';
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export type AthleteFilter = 'all' | AthleteStatus;

export const FILTERS: Array<{ key: AthleteFilter; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'review', label: 'Ждут разбора' },
  { key: 'inactive', label: 'Пропадают' },
  { key: 'ok', label: 'По плану' },
];

/** «Никита Н.» → «НН». Если вместо имени почта, берём первую букву до «@» */
export function initials(name: string): string {
  const words = name.trim().split(name.includes('@') ? '@' : /[\s.]+/).filter(Boolean);
  if (name.includes('@')) return (words[0]?.[0] ?? '').toUpperCase();
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

/** Фон аватара; смысл всё равно несёт бейдж статуса в строке */
export const avatarTone = (status: AthleteStatus): 'primary' | 'highlight' | 'neutral' =>
  status === 'review' ? 'primary' : status === 'inactive' ? 'highlight' : 'neutral';

const waits = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'ждёт' : 'ждут');

/** Текст бейджа статуса в строке ученика */
export function badgeText(a: AthleteRow): string {
  if (a.status === 'review') {
    if (a.waitingVideos > 0) return `${a.waitingVideos}${NB}видео ${waits(a.waitingVideos)} разбора`;
    const n = a.waitingSessions;
    if (n > 0) return `${n}${NB}${plural(n, ['тренировка', 'тренировки', 'тренировок'])} ${waits(n)} разбора`;
    return 'Новый комментарий';
  }
  if (a.status === 'inactive') {
    if (a.daysSinceLast === null) return 'Тренировок ещё не было';
    return `${a.daysSinceLast}${NB}${plural(a.daysSinceLast, ['день', 'дня', 'дней'])} без тренировок`;
  }
  return 'Всё по плану';
}

/** Цель ученика как её задал тренер. Число дней в неделю не выдумываем: в данных его нет */
export function goalText(goal: string | null): string {
  return goal?.trim() ? goal.trim() : 'Цель не задана';
}

/** «Вчера · Всё тело», «Пт, 23 окт · Всё тело» */
export function lastText(last: AthleteRow['lastSession'], today: string): string {
  if (!last) return 'Тренировок ещё не было';
  const days = Math.round((parseIso(today).getTime() - parseIso(last.date).getTime()) / 86_400_000);
  const d = parseIso(last.date);
  const when = days === 0 ? 'Сегодня' : days === 1 ? 'Вчера' : `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${when} · ${last.title}`;
}

/** «3 из 4» за последние 7 дней */
export const weekText = (a: AthleteRow): string => (a.planned7 === 0 && a.done7 === 0 ? 'нет в плане' : `${a.done7} из ${a.planned7}`);

export const weekAria = (a: AthleteRow): string =>
  a.planned7 === 0 && a.done7 === 0 ? `${a.name}: за 7 дней в плане ничего не стояло` : `${a.name}: ${a.done7} из ${a.planned7} тренировок за 7 дней`;

/** «3 ученика · 2 ждут разбора» */
export function summaryText(counts: AthleteListResponse['counts']): string {
  if (counts.all === 0) return 'Учеников пока нет';
  const all = `${counts.all}${NB}${plural(counts.all, ['ученик', 'ученика', 'учеников'])}`;
  return counts.review > 0 ? `${all} · ${counts.review}${NB}${waits(counts.review)} разбора` : all;
}

/** Подпись пустого списка под выбранный фильтр */
export function emptyText(filter: AthleteFilter, query: string): { title: string; description?: string } {
  if (query.trim()) return { title: 'Никого не нашли', description: 'Проверьте имя или почту' };
  if (filter === 'review') return { title: 'Разбирать нечего', description: 'Все тренировки разобраны' };
  if (filter === 'inactive') return { title: 'Никто не пропал', description: 'Все занимались в последние 7 дней' };
  if (filter === 'ok') return { title: 'В этой группе пока никого нет' };
  return { title: 'Ни одного ученика не добавлено', description: 'Аккаунты учеников создаёт администратор' };
}
