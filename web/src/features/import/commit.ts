import type { Block, CommitBlock, CommitExercise, CommitRoutine, CommitWorkout, ExerciseKind, ImportCommit } from '../../../../shared/types';
import { importSlug } from '../../../../shared/importSlug';
import { groupForMuscles } from '../exercises/library';
import { buildPlan, type PlanOptions } from './importPlan';
import type { ParsedImport } from './parse';
import { actionOf, replacementOf } from './preview';
import type { ExerciseChoices, NewExercise } from './types';

/** Из разобранного текста и выбора пользователя собирает то, что отправляем на сервер. Чистая функция. */

const structureOf = (blocks: Block[], rename: Map<string, string | null>): { structure?: Block[] } => {
  const structure = applyToStructure(blocks, rename);
  return structure.length ? { structure } : {};
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** distance в библиотеке хранится как time: у упражнения есть длительность, а расстояние пишется в нагрузке */
const kindOf = (e: NewExercise): ExerciseKind => (e.measure === 'distance' ? 'time' : (e.measure ?? 'reps'));

/** Мышцы: из файла, а если их нет — группа, которую выбрали на проверке */
export function musclesOf(e: NewExercise, choices: ExerciseChoices): string[] {
  const fromFile = e.muscles
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  if (fromFile.length) return fromFile;
  const picked = choices.group[e.key];
  return picked ? [picked.toLowerCase()] : [];
}

export function commitExercise(e: NewExercise, choices: ExerciseChoices): CommitExercise {
  const muscles = musclesOf(e, choices);
  const out: CommitExercise = {
    name: e.name,
    aliases: e.aliases ?? [],
    muscles,
    kind: kindOf(e),
    group: groupForMuscles(muscles.map(cap)),
  };
  if (e.slug) out.id = e.slug;
  if (e.notes) out.notes = e.notes;
  return out;
}

/** Как называть упражнение в тренировках: «Использовать похожее» подменяет название, «Не создавать» убирает строку */
function renamer(list: NewExercise[], choices: ExerciseChoices) {
  const map = new Map<string, string | null>();
  for (const e of list) {
    const action = actionOf(choices, e.key);
    if (action === 'skip') map.set(e.name, null);
    else if (action === 'use' && replacementOf(e, choices)) map.set(e.name, replacementOf(e, choices)!);
  }
  return map;
}

/** Применяет выбор к блокам экрана тренировки: убирает пропущенные упражнения, подменяет названия, выбрасывает опустевшие блоки */
export function applyToStructure(blocks: Block[], rename: Map<string, string | null>): Block[] {
  const name = (n: string) => (rename.has(n) ? rename.get(n) : n);
  const out: Block[] = [];
  for (const b of blocks) {
    const exercises = (b.exercises as Array<{ name: string }>).flatMap((e) => {
      const n = name(e.name);
      return n ? [{ ...e, name: n }] : [];
    });
    if (exercises.length) out.push({ ...b, exercises } as Block);
  }
  return out;
}

/** Разминки из файла с учётом выбора на проверке: пропущенное убирается, «похожее» меняется на упражнение библиотеки, пустая разминка исчезает */
function commitRoutines(parsed: ParsedImport, choices: ExerciseChoices): { routines: CommitRoutine[]; dropped: Set<string> } {
  const byExercise = new Map(parsed.preview.newExercises.map((e) => [e.slug ?? importSlug(e.name), e]));
  const routines: CommitRoutine[] = [];
  const dropped = new Set<string>();
  for (const r of parsed.routines) {
    const items = r.items.flatMap((i) => {
      const e = byExercise.get(i.exercise);
      if (!e) return [i];
      const action = actionOf(choices, e.key);
      if (action === 'skip') return [];
      if (action === 'use') {
        const to = replacementOf(e, choices);
        const slug = to ? parsed.timeLibrary[to] : undefined;
        return slug ? [{ ...i, exercise: slug }] : [];
      }
      return [i];
    });
    if (items.length === 0) dropped.add(r.id);
    else routines.push({ ...r, items });
  }
  return { routines, dropped };
}

export function buildCommit(parsed: ParsedImport, choices: ExerciseChoices, options: PlanOptions): ImportCommit {
  const list = parsed.preview.newExercises;
  const rename = renamer(list, choices);
  const plan = buildPlan(parsed.plan, options);
  const { routines, dropped } = commitRoutines(parsed, choices);
  const routineSlugs = new Set(routines.flatMap((r) => r.items.map((i) => i.exercise)));

  const workouts: CommitWorkout[] = parsed.workouts.map((w) => ({
    ...(w.slug ? { id: w.slug } : {}),
    title: w.title,
    // Блоки-ссылки в тренировку не пишутся: разминка подключается колонкой, а не копией
    blocks: w.blocks.filter((b) => !b.routine).flatMap((b): CommitBlock[] => {
      const items = b.items.flatMap((i) => {
        const name = rename.has(i.name) ? rename.get(i.name) : i.name;
        return name ? [{ name, value: i.value }] : [];
      });
      // Набор упражнений: если часть убрали, общее время в заголовке уже неверно; если убрали всё, блока нет
      const trimmed = b.kind !== 'exercises' && b.items.length > 0 && items.length < b.items.length;
      if (trimmed && items.length === 0) return [];
      return [{ kind: b.kind, heading: trimmed ? b.heading.split(' · ')[0]! : b.heading, ...(b.text ? { text: b.text } : {}), items }];
    }),
    ...structureOf(w.structure, rename),
    ...(w.warmupRoutine && !dropped.has(w.warmupRoutine) ? { warmupRoutine: w.warmupRoutine } : {}),
    ...(w.cooldownRoutine && !dropped.has(w.cooldownRoutine) ? { cooldownRoutine: w.cooldownRoutine } : {}),
  }));

  return {
    // Упражнению без id из файла даём тот, на который ссылается разминка
    exercises: list
      .filter((e) => actionOf(choices, e.key) === 'create')
      .map((e) => {
        const out = commitExercise(e, choices);
        return out.id === undefined && routineSlugs.has(importSlug(e.name)) ? { ...out, id: importSlug(e.name) } : out;
      }),
    routines,
    workouts,
    entries: plan.entries.map((e) => ({ date: e.date, workout: e.ref })),
    replaceDates: plan.replaced,
  };
}
