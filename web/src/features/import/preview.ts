import { plural } from '../workout/flow/ru';
import type { ExerciseAction, ExerciseChoices, NewExercise, PreviewBlock, PreviewItem, PreviewSession, PreviewWeek } from './types';

export const EMPTY_CHOICES: ExerciseChoices = { action: {}, group: {} };

/** Сколько строк новых упражнений видно, пока список не развёрнут */
export const EXERCISES_LIMIT = 8;

export type ExerciseFilter = 'all' | 'similar' | 'nogroup';

export const actionOf = (c: ExerciseChoices, key: string): ExerciseAction => c.action[key] ?? 'create';

export function setAction(c: ExerciseChoices, key: string, action: ExerciseAction): ExerciseChoices {
  return { ...c, action: { ...c.action, [key]: action } };
}

export function setGroup(c: ExerciseChoices, key: string, group: string): ExerciseChoices {
  return { ...c, group: { ...c.group, [key]: group } };
}

/** Что подставить вместо упражнения, когда выбрано «взять из библиотеки» */
export const replacementOf = (ex: NewExercise, c: ExerciseChoices): string | undefined => c.target?.[ex.key] ?? ex.similar;

/** «Это упражнение из библиотеки»: заменяем новое названием, которое имелось в виду */
export function pickExisting(c: ExerciseChoices, key: string, name: string): ExerciseChoices {
  return { ...c, action: { ...c.action, [key]: 'use' }, target: { ...c.target, [key]: name } };
}

/** «Создать все»: сбрасывает выбор, группы мышц остаются */
export function createAll(c: ExerciseChoices): ExerciseChoices {
  return { ...c, action: {}, target: {} };
}

/** «Похожие — из библиотеки»: там, где есть похожее, берём его; остальное не трогаем */
export function pickAllSimilar(c: ExerciseChoices, list: NewExercise[]): ExerciseChoices {
  const action = { ...c.action };
  for (const ex of list) if (ex.similar) action[ex.key] = 'use';
  return { ...c, action };
}

export function tally(list: NewExercise[], c: ExerciseChoices): Record<ExerciseAction, number> {
  const t = { create: 0, use: 0, skip: 0 };
  for (const ex of list) t[actionOf(c, ex.key)]++;
  return t;
}

/** «создать 25 · взять похожие 4 · не создавать 2»; нули пропускаются */
export function tallyText(t: Record<ExerciseAction, number>): string {
  const parts: string[] = [];
  if (t.create) parts.push(`создать ${t.create}`);
  if (t.use) parts.push(`взять похожие ${t.use}`);
  if (t.skip) parts.push(`не создавать ${t.skip}`);
  return parts.join(' · ');
}

/** У упражнения без группы мышц просим её, только пока его создают */
export const needsGroup = (ex: NewExercise, c: ExerciseChoices): boolean => !ex.muscles && actionOf(c, ex.key) === 'create';

export function filterCounts(list: NewExercise[]): Record<ExerciseFilter, number> {
  return { all: list.length, similar: list.filter((e) => e.similar).length, nogroup: list.filter((e) => !e.muscles).length };
}

export function filterExercises(list: NewExercise[], filter: ExerciseFilter): NewExercise[] {
  if (filter === 'similar') return list.filter((e) => e.similar);
  if (filter === 'nogroup') return list.filter((e) => !e.muscles);
  return list;
}

/** Первые строки, пока не нажали «Показать все». Фильтр сам по себе показывает всё найденное. */
export function visibleExercises(list: NewExercise[], filter: ExerciseFilter, expanded: boolean): NewExercise[] {
  const found = filterExercises(list, filter);
  return expanded || filter !== 'all' ? found : found.slice(0, EXERCISES_LIMIT);
}

export const usedText = (n: number) => `в ${n} ${plural(n, ['тренировке', 'тренировках', 'тренировках'])}`;

export const skipNote = (n: number) => `Уберём из ${n} ${plural(n, ['тренировки', 'тренировок', 'тренировок'])}`;

/** Итог внизу страницы: «25 новых упражнений · 4 из библиотеки · 2 без упражнения» */
export function footerText(t: Record<ExerciseAction, number>): string {
  const parts = [`${t.create} ${plural(t.create, ['новое упражнение', 'новых упражнения', 'новых упражнений'])}`];
  if (t.use) parts.push(`${t.use} из библиотеки`);
  if (t.skip) parts.push(`${t.skip} без упражнения`);
  return parts.join(' · ');
}

/** Упражнения, которые пользователь решил не создавать: из тренировок они убираются */
export function skippedNames(list: NewExercise[], c: ExerciseChoices): Set<string> {
  return new Set(list.filter((e) => actionOf(c, e.key) === 'skip').map((e) => e.name));
}

/** Упражнения, вместо которых выбрано существующее из библиотеки: «название из файла» → «название в библиотеке» */
export function renamedNames(list: NewExercise[], c: ExerciseChoices): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of list) {
    const to = actionOf(c, e.key) === 'use' ? replacementOf(e, c) : undefined;
    if (to) out.set(e.name, to);
  }
  return out;
}

/** Все упражнения тренировки по порядку, без разминки и заминки */
export const sessionExercises = (s: PreviewSession): PreviewItem[] => s.blocks.flatMap((b) => b.items);

export function sessionItems(s: PreviewSession, skipped: Set<string>): PreviewItem[] {
  return sessionExercises(s).filter((i) => !skipped.has(i.name));
}

/** Блоки без убранных упражнений; блок упражнений, в котором ничего не осталось, пропадает */
export function visibleBlocks(s: PreviewSession, skipped: Set<string>): PreviewBlock[] {
  return s.blocks
    .map((b) => ({ ...b, items: b.items.filter((i) => !skipped.has(i.name)) }))
    .filter((b) => b.kind !== 'exercises' || b.items.length > 0);
}

export interface SessionDiff {
  /** Значение до изменения для каждого упражнения, которое изменилось */
  old: Record<string, string>;
  changes: number;
  /** Есть упражнение, которого не было в этот день на прошлой неделе (или это первая неделя) */
  fresh: boolean;
}

/** Сравнение с тем же днём прошлой недели */
export function diffSession(prev: PreviewSession | undefined, cur: PreviewSession): SessionDiff {
  if (!prev) return { old: {}, changes: 0, fresh: true };
  const before = new Map(sessionExercises(prev).map((i) => [i.name, i.value]));
  const old: Record<string, string> = {};
  let fresh = false;
  for (const i of sessionExercises(cur)) {
    const was = before.get(i.name);
    if (was === undefined) fresh = true;
    else if (was !== i.value) old[i.name] = was;
  }
  return { old, changes: Object.keys(old).length, fresh };
}

/** Плашка тренировки: прошлое, число изменений, новая связка или «без изменений» */
export function sessionChip(s: PreviewSession, d: SessionDiff): { text: string; tone: 'past' | 'changed' | 'new' | 'same' } {
  if (s.past) return { text: 'в прошлом', tone: 'past' };
  if (d.changes) return { text: `↑ ${d.changes} ${plural(d.changes, ['изменение', 'изменения', 'изменений'])}`, tone: 'changed' };
  if (d.fresh) return { text: 'новая связка', tone: 'new' };
  return { text: 'как на прошлой неделе', tone: 'same' };
}

/** Тот же день предыдущей недели: тренировки недели идут парой, сравниваем по номеру */
export function previousSession(weeks: PreviewWeek[], week: number, index: number): PreviewSession | undefined {
  return weeks[week - 1]?.sessions[index];
}

/** Сколько недель с заметками разбора */
export const weekNotes = (w: PreviewWeek): number => w.sessions.filter((s) => s.note).length;

/** «Вт «Трицепс, пресс, ноги» · Чт «Грудь, кор, спина»» */
export const weekSummary = (w: PreviewWeek): string => w.sessions.map((s) => `${s.date.split(',')[0]} «${s.title}»`).join(' · ');

/** Номер первой недели, где стоит упражнение; -1, если нигде. Там рядом пишем «новое упражнение». */
export function firstUseWeek(weeks: PreviewWeek[], name: string): number {
  return weeks.findIndex((w) => w.sessions.some((s) => sessionExercises(s).some((i) => i.name === name)));
}
