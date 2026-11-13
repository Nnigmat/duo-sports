import type { ExerciseKind, MuscleGroupId, SetPlan } from '../../../../../shared/types';
import type { Step } from './buildSteps';

/** Упражнение из библиотеки, на которое можно заменить текущее */
export interface SwapOption {
  id: string;
  name: string;
  /** Другие названия: по ним тоже ищем */
  aliases?: string[];
  kind: ExerciseKind;
  group: MuscleGroupId;
  muscles: string[];
  /** Значения для плана, если тип упражнения другой, чем в плане */
  defaults: { reps: number; weight: number; seconds: number };
  /** Прошлые тренировки атлета с этим упражнением, от новых к старым; нет — ещё не выполнял */
  sessions?: Array<{ sets: PastSet[] }>;
}

/** Подход из истории атлета: заполнены поля по типу упражнения */
interface PastSet {
  weight?: number;
  reps?: number;
  seconds?: number;
}

/** Последний подход последней тренировки с этим упражнением; нет истории — undefined */
function lastSet(to: SwapOption): PastSet | undefined {
  return to.sessions?.find((s) => s.sets.length > 0)?.sets.at(-1);
}

/**
 * План нового упражнения: тот же тип — цель и вес из плана. Другой тип — последний подход атлета в этом упражнении;
 * истории нет — повторы и секунды по умолчанию из библиотеки, а вес не подставляем (в плане его нет, шторка покажет 0 кг).
 */
function planFor(step: Step, to: SwapOption): SetPlan {
  if (step.kind === to.kind) return step.plan;
  const last = lastSet(to);
  const target = (n: number) => ({ min: n, max: n });
  switch (to.kind) {
    case 'reps':
      return { target: target(last?.reps ?? to.defaults.reps) };
    case 'weight':
      return { target: target(last?.reps ?? to.defaults.reps), ...(last?.weight ? { weight: last.weight } : {}) };
    case 'time':
      return { target: target(last?.seconds ?? to.defaults.seconds) };
  }
}

/**
 * Заменяет упражнение шага `index` на `to`: сам шаг и все следующие шаги этого упражнения в том же блоке.
 * Прошлые подходы остаются как были. В шаге помнится, что стояло в плане, чтобы тренер видел замену.
 */
export function swapSteps(steps: Step[], index: number, to: SwapOption): Step[] {
  const from = steps[index];
  return steps.map((s, i) => {
    if (i < index || s.blockIndex !== from.blockIndex || s.exerciseId !== from.exerciseId) return s;
    const { replaced: _, pose: __, ...rest } = s;
    const original = s.replaced ?? { id: s.exerciseId, name: s.exerciseName };
    return {
      ...rest,
      exerciseId: to.id,
      exerciseName: to.name,
      kind: to.kind,
      plan: planFor(s, to),
      ...(original.id === to.id ? {} : { replaced: original }),
    };
  });
}

const norm = (text: string) => text.toLowerCase().replaceAll('ё', 'е');

/**
 * Куда можно заменить упражнение `currentId`: сначала те, у которых общие мышцы или группа, потом остальные по алфавиту.
 * Текущего в списке нет. `query` ищет по названию и другим названиям.
 */
export function swapCandidates(library: SwapOption[], currentId: string, query: string): { related: SwapOption[]; other: SwapOption[] } {
  const current = library.find((e) => e.id === currentId);
  const q = norm(query.trim());
  const score = (e: SwapOption) => (current ? e.muscles.filter((m) => current.muscles.includes(m)).length * 2 + (e.group === current.group ? 1 : 0) : 0);
  const byName = (a: SwapOption, b: SwapOption) => a.name.localeCompare(b.name, 'ru');
  const found = library.filter((e) => e.id !== currentId && (q === '' || [e.name, ...(e.aliases ?? [])].some((n) => norm(n).includes(q))));
  const related = found.filter((e) => score(e) > 0).sort((a, b) => score(b) - score(a) || byName(a, b));
  const other = found.filter((e) => score(e) === 0).sort(byName);
  return { related, other };
}
