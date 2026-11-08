import { MONTHS, plural } from '../workout/flow/ru';
import type { PlanEntry, PlanEntryStatus, PlanTemplate } from '../../data/types';
import type { PlanMove } from '../../../../shared/types';

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

/** «ср» — день недели даты */
export const weekdayShort = (iso: string): string => WEEKDAY_HEADERS[(parseIso(iso).getDay() + 6) % 7]!;

/**
 * Переносы поверх записей плана: на пустом старом дне — «перенесена на 6 ноября», на новом — «со ср».
 * Если старый день занят другой тренировкой, её не затираем; подпись «со дня» ставим только главной тренировке дня.
 */
export function applyMoves(entries: Record<string, PlanEntry>, moves: PlanMove[]): Record<string, PlanEntry> {
  if (moves.length === 0) return entries;
  const out = { ...entries };
  for (const m of moves) {
    if (!out[m.from]) out[m.from] = { templateId: m.templateId, status: 'moved', movedTo: shortDate(m.to) };
    const target = out[m.to];
    if (target && target.templateId === m.templateId) out[m.to] = { ...target, movedFrom: weekdayShort(m.from) };
  }
  return out;
}

/** Статус для показа: плановая тренировка сегодня — «сегодня», в прошедший день без выполнения — «пропущена» */
export function displayStatus(date: string, entry: PlanEntry, today: string): DisplayStatus {
  if (entry.status !== 'planned') return entry.status;
  return date === today ? 'today' : date < today ? 'skipped' : 'planned';
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
  movedTo?: string,
  movedFrom?: string,
): string {
  const base = isToday && status !== 'today' ? `${longDate(date)}, сегодня` : longDate(date);
  const body = title
    ? `${title}${status && status !== 'planned' ? `, ${STATUS_WORD[status].toLowerCase()}` : ''}${status === 'moved' && movedTo ? ` на ${movedTo}` : ''}${movedFrom && status !== 'moved' ? `, перенесена со ${movedFrom}` : ''}`
    : 'нет тренировки';
  return `${base}: ${body}${copyTarget ? ', выбран для копии' : ''}`;
}

/** «6 упражнений · ≈ 55 мин» */
export function templateMeta(t: Pick<PlanTemplate, 'exercises' | 'minutes'>): string {
  const n = t.exercises.length;
  return `${n} ${plural(n, ['упражнение', 'упражнения', 'упражнений'])} · ≈ ${t.minutes} мин`;
}

export type DayActions = { start: boolean; results: boolean; move: boolean; edit: boolean; remove: boolean };

/** Какие кнопки показывать в карточке дня. Прошедшую невыполненную тренировку можно перенести,
 * а пропущенную вручную (entryStatus «skipped») — нет: сервер её не переносит. */
export function dayActions(status: DisplayStatus, custom: boolean, entryStatus: PlanEntry['status'] = 'planned'): DayActions {
  return {
    start: status === 'today',
    results: status === 'done' && !custom,
    move: status === 'today' || status === 'planned' || (status === 'skipped' && entryStatus === 'planned'),
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

export type QuickDate = { key: 'same' | 'tomorrow' | 'free' | 'week'; label: string; date: string };

/** Быстрый выбор даты копии: завтра, ближайший свободный день, через неделю. Одинаковые даты не повторяются.
 * Для другого ученика исходный день не пропускается и идёт первым («Тот же день»), если он не в прошлом. */
export function quickDates(
  source: string,
  today: string,
  max: string,
  occupied: (date: string) => boolean,
  toOther = false,
): QuickDate[] {
  const tomorrow = addDays(today, 1);
  let free = tomorrow;
  while (free <= max && ((free === source && !toOther) || occupied(free))) free = addDays(free, 1);
  if (free > max) free = tomorrow;
  let week = addDays(source, 7);
  while (week <= today) week = addDays(week, 7);

  const all: QuickDate[] = [
    ...(toOther && source >= today && source <= max ? [{ key: 'same' as const, label: 'Тот же день', date: source }] : []),
    { key: 'tomorrow', label: 'Завтра', date: tomorrow },
    { key: 'free', label: 'Ближайший свободный', date: free },
    { key: 'week', label: 'Через неделю', date: week },
  ];
  const seen = new Set<string>(toOther ? [] : [source]);
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

/** Чьи дни проверять на замену: свои или выбранного ученика; пока его план не пришёл, дни считаются свободными */
export function copyTargetLookup(
  own: { entries: Record<string, PlanEntry>; templates: PlanTemplate[] },
  toOther: boolean,
  otherPlan: { entries: Record<string, PlanEntry>; templates: PlanTemplate[] } | null | undefined,
): { entryAt: (date: string) => PlanEntry | undefined; titleOf: (templateId: string) => string } {
  const plan = toOther ? otherPlan : own;
  return { entryAt: (d) => plan?.entries[d], titleOf: (id) => plan?.templates.find((t) => t.id === id)?.title ?? id };
}

export function checkCopy(
  source: string,
  target: string | null,
  today: string,
  max: string,
  entryAt: (date: string) => PlanEntry | undefined,
  titleOf: (templateId: string) => string,
  toOther = false,
): CopyCheck {
  // тот же день допустим, если копия уходит другому ученику
  const sameDay = target === source && !toOther;
  const valid = !!target && target >= today && target <= max && !sameDay;
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
    : sameDay ? 'Это тот же день — выбери другую дату.'
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
  /** Плашка после копирования; athlete — имя ученика, если копия ушла другому */
  notice: { to: string; title: string; athlete?: string } | null;
};

export type PlanAction =
  | { type: 'view'; view: CalendarView }
  | { type: 'shift'; dir: -1 | 1 }
  | { type: 'today'; today: string }
  | { type: 'pick'; date: string; today: string }
  | { type: 'toggleCopy' }
  | { type: 'copyDate'; date: string | null }
  | { type: 'copied'; to: string; title: string; athlete?: string }
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
      return { ...s, copyOpen: false, copyDate: null, notice: { to: a.to, title: a.title, athlete: a.athlete } };
    case 'openCopied':
      return s.notice ? { ...s, sel: s.notice.to, anchor: s.notice.to, notice: null } : s;
  }
}

/** Границы календаря: месяцы вокруг сегодняшнего дня (два назад, два вперёд) и все дни с записями, даже далёкие */
export function planBounds(today: string, dates: string[]): { min: string; max: string } {
  const t = parseIso(today);
  const sorted = [...dates].sort();
  const lo = toIso(new Date(t.getFullYear(), t.getMonth() - 2, 1));
  const hi = toIso(new Date(t.getFullYear(), t.getMonth() + 3, 0));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
  const monthEnd = (iso: string) => {
    const d = parseIso(iso);
    return toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  };
  return {
    min: first && first < lo ? monthStart(first) : lo,
    max: last && last > hi ? monthEnd(last) : hi,
  };
}

/** Шаблоны, которые стоят в показанных днях, по порядку первого появления: по ним подпись цветов под календарём */
export function usedTemplates(templates: PlanTemplate[], entries: Record<string, PlanEntry>, days: string[]): PlanTemplate[] {
  const ids = new Set<string>();
  for (const d of days) {
    const id = entries[d]?.templateId;
    if (id) ids.add(id);
  }
  const byId = new Map(templates.map((t) => [t.id, t]));
  return [...ids].flatMap((id) => byId.get(id) ?? []);
}
