import { displayBlocks } from '../../../../shared/displayBlocks';
import { importSlug } from '../../../../shared/importSlug';
import type { Block, CommitExercise, CommitRoutine, ImportCommit, LibraryEntry, RoutineKind } from '../../../../shared/types';
import { groupForMuscles } from '../exercises/library';
import type { ParseContext } from '../import/parse';
import { problems } from '../trainer/WorkoutEditPage/draft';
import { usedNames } from './draftOps';
import type { BuilderDraft, NewExerciseDraft, RoutinePick } from './types';

export type CommitCheck = { ok: true; commit: ImportCommit } | { ok: false; problems: string[] };

const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const WORD: Record<RoutineKind, { title: string; in: string; inNew: string }> = {
  warmup: { title: 'Разминка', in: 'В разминке', inNew: 'В новой разминке' },
  cooldown: { title: 'Заминка', in: 'В заминке', inNew: 'В новой заминке' },
};

/** Свободный slug: base, base-2, base-3… — как slugOf на сервере */
function freeSlug(base: string, taken: Set<string>): string {
  let s = base;
  for (let n = 2; taken.has(s); n++) s = `${base}-${n}`;
  taken.add(s);
  return s;
}

/** Упражнение библиотеки с таким названием или алиасом */
const libraryMatch = (name: string, library: LibraryEntry[]) =>
  library.find((l) => norm(l.name) === norm(name) || l.aliases.some((a) => norm(a) === norm(name)));

/**
 * Черновик → коммит импорта: одна тренировка на дату, новые упражнения с явным slug, новая разминка или заминка.
 * Сначала проверки, которые сервер не прощает или прощает молча (дубль названия разминки, занятый slug):
 * найденное — список проблем вместо коммита.
 */
export function draftToCommit(d: BuilderDraft, ctx: ParseContext): CommitCheck {
  const out = problems(d.title, d.blocks);
  const used = [...usedNames(d)];

  // Новое, переименованное в название или алиас библиотечного, не создаём: строки ведут на библиотечное
  const rename = new Map<string, string>();
  const created: NewExerciseDraft[] = [];
  for (const e of d.newExercises) {
    if (!used.some((n) => norm(n) === norm(e.name))) continue;
    const lib = libraryMatch(e.name, ctx.library);
    if (lib) rename.set(e.name, lib.name);
    else created.push(e);
  }
  for (const e of created) if (e.muscles.length === 0) out.push(`У нового упражнения «${e.name}» не указаны мышцы`);

  // slug нового, занятый в библиотеке, молча пропустился бы сервером, и тренировка сослалась бы на чужое
  const takenExercises = new Set(ctx.library.map((l) => l.id));
  const slugOf = new Map<string, string>();
  const exercises: CommitExercise[] = created.map((e) => {
    const id = freeSlug(e.slug.trim() || importSlug(e.name), takenExercises);
    slugOf.set(norm(e.name), id);
    return {
      id,
      name: e.name,
      aliases: e.aliases,
      muscles: e.muscles,
      kind: e.kind,
      group: groupForMuscles(e.muscles.map(cap)),
      ...(e.equipment.length ? { equipment: e.equipment } : {}),
      ...(e.notes.trim() ? { notes: e.notes.trim() } : {}),
    };
  });

  const takenRoutines = new Set(ctx.routines.map((r) => r.id));
  const routines: CommitRoutine[] = [];
  const link = (kind: RoutineKind, pick: RoutinePick): string | undefined => {
    if (pick.kind === 'library') return pick.slug;
    if (pick.kind === 'none') return undefined;
    const w = WORD[kind];
    const title = pick.title.trim();
    if (!title) out.push(`У новой ${kind === 'warmup' ? 'разминки' : 'заминки'} нет названия`);
    else if (ctx.routines.some((r) => r.kind === kind && norm(r.title) === norm(title))) out.push(`${w.title} «${title}» уже есть — дайте другое название`);
    if (pick.items.length === 0) {
      out.push(`${w.inNew} нет упражнений`);
      return undefined;
    }
    const items = pick.items.map((i) => {
      const name = rename.get(i.name) ?? i.name;
      const lib = libraryMatch(name, ctx.library);
      return { exercise: lib ? lib.id : (slugOf.get(norm(name)) ?? importSlug(name)), sec: { min: i.sec, max: i.sec }, ...(i.sides ? { sides: i.sides } : {}) };
    });
    const id = freeSlug(importSlug(title || w.title), takenRoutines);
    routines.push({ id, kind, title, items });
    return id;
  };
  const warmupRoutine = link('warmup', d.warmup);
  const cooldownRoutine = link('cooldown', d.cooldown);

  if (out.length) return { ok: false, problems: out };

  const structure = d.blocks.map((b) => (b.mode === 'note' ? b : ({ ...b, exercises: b.exercises.map((e) => (rename.has(e.name) ? { ...e, name: rename.get(e.name)! } : e)) } as Block)));
  return {
    ok: true,
    commit: {
      exercises,
      routines,
      workouts: [
        {
          title: d.title.trim(),
          blocks: displayBlocks(structure),
          structure,
          ...(warmupRoutine ? { warmupRoutine } : {}),
          ...(cooldownRoutine ? { cooldownRoutine } : {}),
        },
      ],
      entries: [{ date: d.date, workout: 0 }],
      replaceDates: [],
    },
  };
}
