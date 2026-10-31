import { MONTHS, plural } from '../workout/flow/ru';
import type { PlanEntry, PlanEntryStatus, PlanTemplate } from '../../data/types';

/** Логика страницы «План»: даты, сетка календаря, копирование. Без DOM. */

export type CalendarView = 'month' | 'week';
export type DisplayStatus = PlanEntryStatus | 'today';

const WEEKDAYS_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
export const WEEKDAY_HEADERS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}
export const addDays = (iso: string, n: number): string => {
  const d = parseIso(iso);
  return toIso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};
/** Понедельник недели, в которую попадает дата */
export const weekStart = (iso: string): string => addDays(iso, -((parseIso(iso).getDay() + 6) % 7));

/** «Суббота, 31 октября» */
export function longDate(iso: string): string {
  const d = parseIso(iso);
  return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
/** «31 октября» */
export function shortDate(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Даты сетки: месяц — полные недели, в которые он попадает; неделя — семь дней. */
export function calendarDays(view: CalendarView, anchor: string): string[] {
  if (view === 'week') {
    const start = weekStart(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  const a = parseIso(anchor);
  const first = toIso(new Date(a.getFullYear(), a.getMonth(), 1));
  const daysInMonth = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
  const offset = (parseIso(first).getDay() + 6) % 7;
  const count = Math.ceil((offset + daysInMonth) / 7) * 7;
  const start = addDays(first, -offset);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** Клетка видна, если она в показанном месяце (в неделе — всегда) и внутри границ календаря */
export function inRange(iso: string, view: CalendarView, anchor: string, min: string, max: string): boolean {
  if (iso < min || iso > max) return false;
  return view === 'week' || iso.slice(0, 7) === anchor.slice(0, 7);
}

/** «Октябрь 2026» · «26 – 1 ноября» · «2 – 8 ноября» */
export function rangeTitle(view: CalendarView, anchor: string): string {
  if (view === 'month') {
    const a = parseIso(anchor);
    return `${MONTHS_NOMINATIVE[a.getMonth()]} ${a.getFullYear()}`;
  }
  const start = parseIso(weekStart(anchor));
  const end = parseIso(addDays(weekStart(anchor), 6));
  const left = start.getMonth() !== end.getMonth() ? ` ${MONTHS[start.getMonth()]}` : '';
  return `${start.getDate()}${left} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

/** Якорь после шага назад (−1) или вперёд (+1) */
export function shiftAnchor(view: CalendarView, anchor: string, dir: -1 | 1): string {
  if (view === 'week') return addDays(anchor, 7 * dir);
  const a = parseIso(anchor);
  return toIso(new Date(a.getFullYear(), a.getMonth() + dir, 1));
}

/** Есть ли куда шагать: следующий период должен пересекаться с границами календаря */
export function canShift(view: CalendarView, anchor: string, dir: -1 | 1, min: string, max: string): boolean {
  const next = shiftAnchor(view, anchor, dir);
  if (view === 'week') return dir < 0 ? addDays(weekStart(anchor), -1) >= min : weekStart(next) <= max;
  return dir < 0 ? addDays(`${anchor.slice(0, 7)}-01`, -1) >= min : `${next.slice(0, 7)}-01` <= max;
}

/** Статус для показа: плановая тренировка сегодняшнего дня — «сегодня» */
export function displayStatus(date: string, entry: PlanEntry, today: string): DisplayStatus {
  return entry.status === 'planned' && date === today ? 'today' : entry.status;
}

const STATUS_WORD: Record<DisplayStatus, string> = {
  planned: 'Запланирована',
  today: 'Сегодня',
  done: 'Выполнена',
  moved: 'Перенесена',
  skipped: 'Пропущена',
};
export const planStatusWord = (s: DisplayStatus): string => STATUS_WORD[s];

/** Слово статуса в клетке: пусто для обычной запланированной */
export function cellStatusWord(s: DisplayStatus): string {
  return s === 'planned' ? '' : s === 'done' ? '✓ выполнена' : STATUS_WORD[s].toLowerCase();
}

/** Подпись клетки для скринридера: «Суббота, 31 октября: Ноги и ягодицы, сегодня» */
export function cellAriaLabel(
  date: string,
  title: string | null,
  status: DisplayStatus | null,
  copyTarget: boolean,
  isToday = false,
): string {
  const base = isToday && status !== 'today' ? `${longDate(date)}, сегодня` : longDate(date);
  const body = title
    ? `${title}${status && status !== 'planned' ? `, ${STATUS_WORD[status].toLowerCase()}` : ''}`
    : 'нет тренировки';
  return `${base}: ${body}${copyTarget ? ', выбран для копии' : ''}`;
}

/** «6 упражнений · ≈ 55 мин» */
export function templateMeta(t: Pick<PlanTemplate, 'exercises' | 'minutes'>): string {
  const n = t.exercises.length;
  return `${n} ${plural(n, ['упражнение', 'упражнения', 'упражнений'])} · ≈ ${t.minutes} мин`;
}

export type DayActions = { start: boolean; results: boolean; move: boolean; edit: boolean; remove: boolean };

/** Какие кнопки показывать в карточке дня */
export function dayActions(status: DisplayStatus, custom: boolean): DayActions {
  return {
    start: status === 'today',
    results: status === 'done' && !custom,
    move: status === 'today' || status === 'planned',
    edit: status === 'today' || status === 'planned',
    remove: custom,
  };
}

/** Заголовок пустого дня и подпись кнопки создания */
export function emptyDayTexts(date: string, today: string): { title: string; create: string } {
  return date < today
    ? { title: 'Тренировки не было', create: 'Записать тренировку' }
    : { title: 'Ничего не запланировано', create: 'Создать тренировку' };
}

export type QuickDate = { key: 'tomorrow' | 'free' | 'week'; label: string; date: string };

/** Быстрый выбор даты копии: завтра, ближайший свободный день, через неделю. Одинаковые даты не повторяются. */
export function quickDates(source: string, today: string, max: string, occupied: (date: string) => boolean): QuickDate[] {
  const tomorrow = addDays(today, 1);
  let free = tomorrow;
  while (free <= max && (free === source || occupied(free))) free = addDays(free, 1);
  if (free > max) free = tomorrow;
  let week = addDays(source, 7);
  while (week <= today) week = addDays(week, 7);

  const all: QuickDate[] = [
    { key: 'tomorrow', label: 'Завтра', date: tomorrow },
    { key: 'free', label: 'Ближайший свободный', date: free },
    { key: 'week', label: 'Через неделю', date: week },
  ];
  const seen = new Set<string>([source]);
  return all.filter((q) => {
    if (seen.has(q.date)) return false;
    seen.add(q.date);
    return true;
  });
}

export type CopyCheck = {
  valid: boolean;
  /** Id шаблона, который копия заменит */
  replaces: string | null;
  /** Предупреждение о замене; пусто, если день свободен */
  warning: string;
  /** Подсказка под полем; пусто, если показано предупреждение */
  hint: string;
  /** «Создать копию» / «Заменить копией» */
  label: string;
};

export function checkCopy(
  source: string,
  target: string | null,
  today: string,
  max: string,
  entryAt: (date: string) => PlanEntry | undefined,
  titleOf: (templateId: string) => string,
): CopyCheck {
  const valid = !!target && target >= today && target <= max && target !== source;
  const existing = valid && target ? entryAt(target) : undefined;
  if (existing && target) {
    return {
      valid,
      replaces: existing.templateId,
      warning: `На ${shortDate(target)} уже запланировано «${titleOf(existing.templateId)}». Копия её заменит.`,
      hint: '',
      label: 'Заменить копией',
    };
  }
  const hint = !target || target === '' ? `Выбери дату с ${shortDate(today)} по ${shortDate(max)}.`
    : target === source ? 'Это тот же день — выбери другую дату.'
    : !valid ? `Выбери дату с ${shortDate(today)} по ${shortDate(max)}.`
    : `Копия появится: ${longDate(target).toLowerCase()}.`;
  return { valid, replaces: null, warning: '', hint, label: 'Создать копию' };
}

/** Состояние интерфейса страницы. Данные (тренировки в днях) живут отдельно. */
export type PlanState = {
  view: CalendarView;
  anchor: string;
  sel: string;
  copyOpen: boolean;
  copyDate: string | null;
  /** Плашка после копирования */
  notice: { to: string; title: string } | null;
};

export type PlanAction =
  | { type: 'view'; view: CalendarView }
  | { type: 'shift'; dir: -1 | 1 }
  | { type: 'today'; today: string }
  | { type: 'pick'; date: string; today: string }
  | { type: 'toggleCopy' }
  | { type: 'copyDate'; date: string | null }
  | { type: 'copied'; to: string; title: string }
  | { type: 'openCopied' };

export const initialPlanState = (today: string, sel: string = today): PlanState => ({
  view: 'month',
  anchor: sel,
  sel,
  copyOpen: false,
  copyDate: null,
  notice: null,
});

export function planReducer(s: PlanState, a: PlanAction): PlanState {
  switch (a.type) {
    case 'view':
      return { ...s, view: a.view, anchor: s.sel };
    case 'shift':
      return { ...s, anchor: shiftAnchor(s.view, s.anchor, a.dir) };
    case 'today':
      return { ...s, anchor: a.today, sel: a.today, copyOpen: false, copyDate: null, notice: null };
    case 'pick':
      // При открытой копии нажатие на будущий день выбирает дату копии
      if (s.copyOpen && a.date !== s.sel && a.date >= a.today) return { ...s, copyDate: a.date };
      return { ...s, sel: a.date, copyOpen: false, copyDate: null, notice: null };
    case 'toggleCopy':
      return { ...s, copyOpen: !s.copyOpen, copyDate: null, notice: null };
    case 'copyDate':
      return { ...s, copyDate: a.date };
    case 'copied':
      return { ...s, copyOpen: false, copyDate: null, notice: { to: a.to, title: a.title } };
    case 'openCopied':
      return s.notice ? { ...s, sel: s.notice.to, anchor: s.notice.to, notice: null } : s;
  }
}
