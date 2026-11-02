import type { Block, CommitBlock, CommitExercise, CommitWorkout, ExerciseKind, ImportCommit } from '../../../../shared/types';
import { groupForMuscles } from '../exercises/library';
import { buildPlan, type PlanOptions } from './importPlan';
import type { ParsedImport } from './parse';
import { actionOf } from './preview';
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
  if (e.video) out.video = e.video;
  if (e.notes) out.notes = e.notes;
  return out;
}

/** Как называть упражнение в тренировках: «Использовать похожее» подменяет название, «Не создавать» убирает строку */
function renamer(list: NewExercise[], choices: ExerciseChoices) {
  const map = new Map<string, string | null>();
  for (const e of list) {
    const action = actionOf(choices, e.key);
    if (action === 'skip') map.set(e.name, null);
    else if (action === 'use' && e.similar) map.set(e.name, e.similar);
  }
  return map;
}

/** Применяет выбор к блокам экрана тренировки: убирает пропущенные упражнения, подменяет названия, выбрасывает опустевшие блоки */
export function applyToStructure(blocks: Block[], rename: Map<string, string | null>): Block[] {
  const name = (n: string) => (rename.has(n) ? rename.get(n) : n);
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.mode === 'timed') {
      out.push(b);
      continue;
    }
    const exercises = (b.exercises as Array<{ name: string }>).flatMap((e) => {
      const n = name(e.name);
      return n ? [{ ...e, name: n }] : [];
    });
    if (exercises.length) out.push({ ...b, exercises } as Block);
  }
  return out;
}

export function buildCommit(parsed: ParsedImport, choices: ExerciseChoices, options: PlanOptions): ImportCommit {
  const list = parsed.preview.newExercises;
  const rename = renamer(list, choices);
  const plan = buildPlan(parsed.plan, options);

  const workouts: CommitWorkout[] = parsed.workouts.map((w) => ({
    ...(w.slug ? { id: w.slug } : {}),
    title: w.title,
    blocks: w.blocks.map(
      (b): CommitBlock => ({
        kind: b.kind,
        heading: b.heading,
        ...(b.text ? { text: b.text } : {}),
        items: b.items.flatMap((i) => {
          const name = rename.has(i.name) ? rename.get(i.name) : i.name;
          return name ? [{ name, value: i.value }] : [];
        }),
      }),
    ),
    ...structureOf(w.structure, rename),
  }));

  return {
    exercises: list.filter((e) => actionOf(choices, e.key) === 'create').map((e) => commitExercise(e, choices)),
    workouts,
    entries: plan.entries.map((e) => ({ date: e.date, workout: e.ref })),
    replaceDates: plan.replaced,
  };
}
