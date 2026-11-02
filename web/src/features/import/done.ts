import { parseIso } from '../plan/plan';
import { plural } from '../workout/flow/ru';
import { actionOf, tally } from './preview';
import { dayLabel, type PlanResult } from './importPlan';
import type { ExerciseChoices, NewExercise } from './types';

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export interface DoneSummary {
  workouts: number;
  inCalendar: number;
  /** Созданных упражнений */
  created: number;
  weeks: number;
}

export interface AddedExercise {
  title: string;
  /** «трицепс · видео» */
  meta: string;
  chip: 'Создано' | 'Из библиотеки';
}

export interface Notice {
  title: string;
  text: string;
}

export const ADDED_LIMIT = 7;

/** «27 и 29 октября»; даты из разных месяцев — «30 октября и 2 ноября» */
export function datesText(dates: string[]): string {
  const parsed = dates.map(parseIso);
  const sameMonth = parsed.every((d) => d.getMonth() === parsed[0]!.getMonth());
  const day = (d: Date, withMonth: boolean) => `${d.getDate()}${withMonth ? ` ${MONTHS_GEN[d.getMonth()]}` : ''}`;
  const parts = parsed.map((d, i) => day(d, !sameMonth || i === parsed.length - 1));
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} и ${parts[parts.length - 1]}`;
}

/** Даты из файла, которые в календарь не попали: уже прошли */
export const skippedDates = (r: PlanResult): string[] => r.weeks.flat().filter((c) => c.kind === 'skipped').map((c) => c.date);

/** Упражнения, которые создадим и возьмём из библиотеки; повторы по названию убираем */
export function addedList(list: NewExercise[], choices: ExerciseChoices): AddedExercise[] {
  const out: AddedExercise[] = [];
  const seen = new Set<string>();
  for (const ex of list) {
    const action = actionOf(choices, ex.key);
    if (action === 'skip') continue;
    const item: AddedExercise =
      action === 'use' && ex.similar
        ? { title: ex.similar, meta: 'уже было в библиотеке', chip: 'Из библиотеки' }
        : { title: ex.name, meta: [ex.muscles || choices.group[ex.key]?.toLowerCase() || 'группа мышц не указана', ex.hasVideo ? 'видео' : ''].filter(Boolean).join(' · '), chip: 'Создано' };
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    out.push(item);
  }
  return out;
}

export function doneSummary(list: NewExercise[], choices: ExerciseChoices, plan: PlanResult, workouts: number): DoneSummary {
  return { workouts, inCalendar: plan.inCalendar, created: tally(list, choices).create, weeks: plan.weeks.length };
}

/** «Обратите внимание»: прошлые дни, заменённые тренировки, упражнения без видео. Пустые пункты пропускаются. */
export function buildNotices(plan: PlanResult, list: NewExercise[], choices: ExerciseChoices): Notice[] {
  const out: Notice[] = [];

  const skipped = skippedDates(plan);
  if (skipped.length) {
    out.push({
      title: `${skipped.length} ${plural(skipped.length, ['тренировка пропущена', 'тренировки пропущены', 'тренировок пропущено'])}`,
      text: `${datesText(skipped)} уже прошли — в календарь не добавлены, шаблоны сохранены`,
    });
  }

  const replaced = plan.conflicts.filter((c) => c.choice === 'replace');
  if (replaced.length) {
    out.push({
      title: `${replaced.length} ${plural(replaced.length, ['тренировка заменена', 'тренировки заменены', 'тренировок заменено'])}`,
      text: `${replaced.map((c) => `«${c.mine}» ${dayLabel(c.date)}`).join(' и ')} — как вы выбрали на шаге «План»`,
    });
  }

  const noVideo = list.filter((e) => actionOf(choices, e.key) === 'create' && !e.hasVideo).map((e) => e.name);
  if (noVideo.length) {
    const names = noVideo.length <= 2 ? noVideo.join(' и ') : `${noVideo.slice(0, 2).join(', ')} и ещё ${noVideo.length - 2}`;
    out.push({
      title: `${noVideo.length} ${plural(noVideo.length, ['упражнение без видео', 'упражнения без видео', 'упражнений без видео'])}`,
      text: `${names} — видео можно добавить во вкладке «Упражнения»`,
    });
  }
  return out;
}

export interface DoneTexts {
  eyebrow: string;
  heading: string;
  lead: string;
  againLabel: string;
}

/** Тексты шапки: импорт выполнен или отменён. time — «14:20». */
export function doneTexts(undone: boolean, time: string, plan: PlanResult): DoneTexts {
  if (undone) {
    return {
      eyebrow: 'Импорт отменён',
      heading: 'Всё как было',
      lead: 'Тренировки и план вернулись к состоянию до импорта. Текст можно вставить снова.',
      againLabel: 'Вставить снова',
    };
  }
  const range = plan.first && plan.last ? `План в календаре с ${longGen(plan.first)} по ${longGen(plan.last)}. ` : '';
  return {
    eyebrow: `Сегодня в ${time}`,
    heading: 'Импорт завершён',
    lead: `${range}Новые упражнения — во вкладке «Упражнения».`,
    againLabel: 'Импортировать ещё',
  };
}


/** «3 ноября» */
function longGen(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** Что показываем после отмены: сколько удалено и что вернулось в план */
export function undoneNote(s: DoneSummary, restored: string[]): string {
  const ex = s.created ? ` и ${s.created} ${plural(s.created, ['упражнение', 'упражнения', 'упражнений'])}` : '';
  const back = restored.length ? `, ${restored.map((t) => `«${t}»`).join(' и ')} ${restored.length === 1 ? 'вернулась' : 'вернулись'} в план` : '';
  return `Удалено ${s.workouts} ${plural(s.workouts, ['тренировка', 'тренировки', 'тренировок'])}${ex}${back}.`;
}

/** Окно отмены: «до 14:20» не нужно, достаточно времени импорта и срока */
export const UNDO_HOURS = 24;

export function undoText(time: string): string {
  return `Вернём тренировки, упражнения и план к состоянию до ${time}. Отменить можно в течение ${UNDO_HOURS} часов.`;
}

/** «14:20» из ISO-времени сервера, в часовом поясе браузера */
export const clockTime = (iso: string): string => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
