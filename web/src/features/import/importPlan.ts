import { addDays, longDate, shortDate } from '../plan/plan';
import { plural } from '../workout/flow/ru';

/** Что делать с тренировками, дата которых уже прошла */
export type PastMode = 'skip' | 'shift' | 'missed';
/** Что делать, если в этот день уже стоит другая тренировка */
export type ConflictChoice = 'replace' | 'both' | 'keep';

export interface PlanWorkout {
  /** Неделя с 0, считая от firstMonday */
  week: number;
  /** День недели: 0 — понедельник */
  weekday: number;
  title: string;
  /** Номер тренировки в списке тренировок файла */
  ref: number;
}

export interface PlanSource {
  /** Понедельник первой недели файла, «2026-10-26» */
  firstMonday: string;
  today: string;
  workouts: PlanWorkout[];
  /** Тренировки, которые уже стоят в плане: дата → название */
  mine: Record<string, string>;
}

export interface PlanOptions {
  past: PastMode;
  /** Решения по конфликтам: дата → выбор; нет записи — «Заменить» */
  resolutions: Record<string, ConflictChoice>;
}

export const DEFAULT_OPTIONS: PlanOptions = { past: 'skip', resolutions: {} };

export type CellKind = 'empty' | 'mine' | 'import' | 'conflict' | 'skipped';

export interface DayCell {
  date: string;
  kind: CellKind;
  title: string;
  /** Зачёркнутая тренировка: заменённая, не добавленная или пропущенная */
  strike?: string;
  /** Вторая тренировка дня при «Оставить обе» */
  second?: string;
}

export interface Conflict {
  date: string;
  mine: string;
  theirs: string;
  choice: ConflictChoice;
}

export interface PlanResult {
  /** Недели сверху вниз, по 7 дней */
  weeks: DayCell[][];
  conflicts: Conflict[];
  /** Сколько тренировок попадёт в календарь */
  inCalendar: number;
  skipped: number;
  /** Первая и последняя дата из файла, которая попадёт в календарь; null, если таких нет */
  first: string | null;
  last: string | null;
  /** Что записать в календарь: дата и номер тренировки файла */
  entries: Array<{ date: string; ref: number }>;
  /** Даты, где своя тренировка уходит («Заменить») */
  replaced: string[];
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'];

/** «5 нояб» */
export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m! - 1]}`;
}

export const CONFLICT_CHOICES: Array<{ id: ConflictChoice; label: string }> = [
  { id: 'replace', label: 'Заменить' },
  { id: 'both', label: 'Оставить обе' },
  { id: 'keep', label: 'Оставить мою' },
];

export const PAST_MODES: Array<{ id: PastMode; label: string }> = [
  { id: 'skip', label: 'Пропустить их' },
  { id: 'shift', label: 'Сдвинуть план на неделю' },
  { id: 'missed', label: 'Отметить пропущенными' },
];

/** Раскладывает тренировки файла по календарю и находит конфликты с планом. */
export function buildPlan(src: PlanSource, opts: PlanOptions): PlanResult {
  const shift = opts.past === 'shift' ? 1 : 0;
  const imports: Record<string, { title: string; past: boolean; ref: number }> = {};
  const skipped: Record<string, string> = {};
  for (const w of src.workouts) {
    const date = addDays(src.firstMonday, (w.week + shift) * 7 + w.weekday);
    const past = date < src.today;
    if (past && opts.past !== 'missed') skipped[date] = w.title;
    else imports[date] = { title: w.title, past, ref: w.ref };
  }

  const weekCount = Math.max(...src.workouts.map((w) => w.week), 0) + 1 + shift;
  const conflicts: Conflict[] = [];
  let inCalendar = 0;
  const entries: PlanResult['entries'] = [];
  const replaced: string[] = [];
  const weeks: DayCell[][] = [];
  for (let r = 0; r < weekCount; r++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(src.firstMonday, r * 7 + d);
      const imp = imports[date];
      const my = src.mine[date];
      let cell: DayCell = { date, kind: 'empty', title: '' };
      if (skipped[date]) cell = { date, kind: 'skipped', title: 'пропущена', strike: skipped[date] };
      else if (imp && my) {
        const choice = opts.resolutions[date] ?? 'replace';
        conflicts.push({ date, mine: my, theirs: imp.title, choice });
        if (choice === 'replace') {
          cell = { date, kind: 'conflict', title: imp.title, strike: my };
          inCalendar++;
          entries.push({ date, ref: imp.ref });
          replaced.push(date);
        } else if (choice === 'both') {
          cell = { date, kind: 'conflict', title: my, second: imp.title };
          inCalendar++;
          entries.push({ date, ref: imp.ref });
        } else cell = { date, kind: 'conflict', title: my, strike: imp.title };
      } else if (imp) {
        cell = { date, kind: 'import', title: imp.past ? `${imp.title} · пропущена` : imp.title };
        inCalendar++;
        entries.push({ date, ref: imp.ref });
      } else if (my) cell = { date, kind: 'mine', title: my };
      row.push(cell);
    }
    weeks.push(row);
  }

  const dates = Object.keys(imports).sort();
  return {
    weeks,
    conflicts,
    inCalendar,
    skipped: Object.keys(skipped).length,
    first: dates[0] ?? null,
    last: dates[dates.length - 1] ?? null,
    entries,
    replaced,
  };
}

/** Если у всех конфликтов один выбор — он, иначе null (в переключателе «Для всех» ничего не выбрано) */
export function commonChoice(conflicts: Conflict[]): ConflictChoice | null {
  const first = conflicts[0]?.choice;
  return first && conflicts.every((c) => c.choice === first) ? first : null;
}

export function resolveAll(conflicts: Conflict[], choice: ConflictChoice): Record<string, ConflictChoice> {
  return Object.fromEntries(conflicts.map((c) => [c.date, choice]));
}

/** Смена режима прошлых дат сдвигает даты, поэтому прежние решения по конфликтам теряют силу */
export function setPast(opts: PlanOptions, past: PastMode): PlanOptions {
  return { ...opts, past, resolutions: {} };
}

const workoutsWord = (n: number) => plural(n, ['тренировка', 'тренировки', 'тренировок']);

/** Подпись под заголовком календаря: что произойдёт с прошлыми днями. first — первая тренировка в календаре. */
export function calendarNote(past: PastMode, first: string | null): string {
  if (past === 'shift') return `Все даты сдвинуты на 7 дней вперёд${first ? ` — первая тренировка ${longDate(first).toLowerCase()}` : ''}`;
  if (past === 'missed') return 'Первая неделя попадёт в историю как пропущенная';
  return `Первая неделя пропускается${first ? `, план идёт с ${shortDate(first)}` : ''}`;
}

/** «26 тренировок · в календаре 24 · 2 пропущено» */
export function planFooter(total: number, r: PlanResult): string {
  const base = `${total} ${workoutsWord(total)}`;
  return `${base} · в календаре ${r.inCalendar}${r.skipped ? ` · ${r.skipped} пропущено` : ''}`;
}

export const conflictsTitle = (n: number): string => `Конфликты · ${n}`;

const DAY_NAMES = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

/** «26 тренировок за 13 недель: вторник и четверг. Проверьте, как это ляжет в календарь.» */
export function planLead(src: PlanSource): string {
  const n = src.workouts.length;
  if (n === 0) return 'В тексте нет тренировок с датами: они сохранятся шаблонами.';
  const weeks = Math.max(...src.workouts.map((w) => w.week)) + 1;
  const days = [...new Set(src.workouts.map((w) => w.weekday))].sort().map((d) => DAY_NAMES[d]!);
  const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} и ${days[days.length - 1]}` : days[0]!;
  return `${n} ${workoutsWord(n)} за ${weeks} ${plural(weeks, ['неделю', 'недели', 'недель'])}: ${list}. Проверьте, как это ляжет в календарь.`;
}

/** Сколько тренировок файла раньше сегодняшнего дня */
export function pastCount(src: PlanSource): number {
  return src.workouts.filter((w) => addDays(src.firstMonday, w.week * 7 + w.weekday) < src.today).length;
}

/** Первая дата файла, «2026-10-27»; null, если тренировок нет */
export function firstDate(src: PlanSource): string | null {
  const first = src.workouts.map((w) => w.week * 7 + w.weekday).sort((a, b) => a - b)[0];
  return first === undefined ? null : addDays(src.firstMonday, first);
}
