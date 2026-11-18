import { exercisesOf } from '../../../../shared/blocks';
import type { AgentRoutine, AgentWorkout } from '../../../../shared/aiDraft';
import type { ExerciseKind } from '../../../../shared/types';
import type { ParseContext, ParsedImport } from '../import/parse';
import type { Measure } from '../import/types';
import type { Advice, BuilderDraft, NewExerciseDraft, RoutinePick } from './types';

const kindOf = (m: Measure | undefined): ExerciseKind => (m === 'distance' ? 'time' : (m ?? 'reps'));
const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

/** Имена всех упражнений блоков основной части */
const namesIn = (blocks: BuilderDraft['blocks']): Set<string> => new Set(blocks.flatMap((b) => (exercisesOf(b) as Array<{ name: string }>).map((e) => norm(e.name))));

/**
 * Удачный разбор ответа агента → черновик формы. Блоки — из structure разбора; новые упражнения — из разбора,
 * поля (мышцы, инвентарь, техника) — из ответа агента; slug набора → имена по библиотеке и новым.
 */
export function draftFromParsed(parsed: ParsedImport, agent: AgentWorkout, ctx: ParseContext, date: string, picked: string[]): BuilderDraft {
  const workout = parsed.workouts[0]!;
  const agentById = new Map(agent.new_exercises.map((e) => [e.id, e]));
  const agentByName = new Map(agent.new_exercises.map((e) => [norm(e.name), e]));

  const newExercises: NewExerciseDraft[] = parsed.preview.newExercises.map((e) => {
    const a = (e.slug ? agentById.get(e.slug) : undefined) ?? agentByName.get(norm(e.name));
    const muscles = a ? a.muscles : e.muscles.split(',').map((m) => m.trim()).filter(Boolean);
    return {
      name: e.name,
      slug: a?.id ?? e.slug ?? '',
      muscles,
      kind: kindOf(a?.measure ?? e.measure),
      equipment: a?.equipment ?? e.equipment ?? [],
      notes: a?.notes ?? e.notes ?? '',
      aliases: a?.aliases ?? e.aliases ?? [],
      ...(e.similar ? { similar: e.similar } : {}),
    };
  });

  const nameBySlug = new Map<string, string>([...ctx.library.map((l) => [l.id, l.name] as const), ...agent.new_exercises.map((e) => [e.id, e.name] as const)]);
  const pickOf = (r: AgentRoutine): RoutinePick => {
    if (!r) return { kind: 'none' };
    if ('routine' in r) return { kind: 'library', slug: r.routine };
    const commit = parsed.routines.find((x) => x.id === r.new_routine.id);
    const items = (commit?.items ?? []).map((i) => ({ name: nameBySlug.get(i.exercise) ?? i.exercise, sec: i.sec.max, ...(i.sides ? { sides: i.sides } : {}) }));
    return { kind: 'new', title: commit?.title ?? r.new_routine.title, items };
  };

  const libName = new Map(ctx.library.map((l) => [l.id, l.name]));
  const advice: Advice[] = agent.advice.map((a, i) => {
    const suggest = a.suggest ? libName.get(a.suggest) : undefined;
    return { id: `a${i}`, text: a.text, ...(a.exercise ? { exercise: a.exercise } : {}), ...(suggest ? { suggest } : {}) };
  });
  // Анти-цель: агент тихо выбросил упражнение, которое тренер выбрал сам
  const present = namesIn(workout.structure);
  for (const slug of picked) {
    const name = libName.get(slug);
    if (name && !present.has(norm(name))) advice.push({ id: `missing-${slug}`, text: `Нет выбранного упражнения: ${name}` });
  }

  return {
    date,
    title: workout.title,
    blocks: workout.structure,
    newExercises,
    warmup: pickOf(agent.warmup),
    cooldown: pickOf(agent.cooldown),
    advice,
  };
}
