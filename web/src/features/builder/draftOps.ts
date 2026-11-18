import { exercisesOf } from '../../../../shared/blocks';
import { importSlug } from '../../../../shared/importSlug';
import type { Block, Exercise, ExerciseKind } from '../../../../shared/types';
import { DEFAULT_PARAMS } from '../exercises/library';
import type { LibraryExercise } from '../exercises/types';
import { addExercise } from '../trainer/WorkoutEditPage/draft';
import type { BuilderDraft, NewExerciseDraft, NewRoutineItem, RoutinePick } from './types';

/** Правка черновика сборки без побочных эффектов: каждая функция возвращает новый черновик. */

type Which = 'warmup' | 'cooldown';

const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');
const same = (a: string, b: string) => norm(a) === norm(b);

/** Имена из блоков и новых разминки и заминки */
export function usedNames(d: BuilderDraft): Set<string> {
  const out = new Set<string>();
  for (const b of d.blocks) for (const e of exercisesOf(b)) out.add(e.name);
  for (const pick of [d.warmup, d.cooldown]) if (pick.kind === 'new') for (const i of pick.items) out.add(i.name);
  return out;
}

/** Убирает новые упражнения, которые нигде не стоят */
export function pruneNew(d: BuilderDraft): BuilderDraft {
  const used = [...usedNames(d)];
  const newExercises = d.newExercises.filter((e) => used.some((n) => same(n, e.name)));
  return newExercises.length === d.newExercises.length ? d : { ...d, newExercises };
}

/** Строка блока под другой вид: цель повторов и цель времени несравнимы, поэтому при смене «время ↔ не время» цель — по умолчанию */
function retype(e: Exercise, kind: ExerciseKind, name: string): Exercise {
  const timeChanged = (e.kind === 'time') !== (kind === 'time');
  const { weight: _w, ...rest } = e;
  const target = timeChanged ? (kind === 'time' ? { min: DEFAULT_PARAMS.seconds, max: DEFAULT_PARAMS.seconds } : { min: DEFAULT_PARAMS.reps, max: DEFAULT_PARAMS.reps }) : e.target;
  return { ...rest, name, kind, target, ...(kind === 'weight' ? { weight: e.weight ?? DEFAULT_PARAMS.weight } : {}) };
}

/** В блоке по таймеру упражнение всегда на время */
const mapRows = (blocks: Block[], fn: (e: Exercise, b: Block) => Exercise): Block[] =>
  blocks.map((b) => (b.mode === 'note' ? b : ({ ...b, exercises: b.exercises.map((e) => fn(e, b)) } as Block)));

const mapItems = (pick: RoutinePick, fn: (i: NewRoutineItem) => NewRoutineItem): RoutinePick => (pick.kind === 'new' ? { ...pick, items: pick.items.map(fn) } : pick);

/** Новое упражнение руками: строка в блоке и запись в newExercises (slug как у импорта, тип — повторы) */
export function createExercise(d: BuilderDraft, blockId: string, name: string): BuilderDraft {
  const clean = name.trim();
  if (!clean) return d;
  const blocks = addExercise(d.blocks, blockId, { name: clean, kind: 'reps', defaults: { ...DEFAULT_PARAMS } });
  const known = d.newExercises.some((e) => same(e.name, clean));
  const fresh: NewExerciseDraft = { name: clean, slug: importSlug(clean), muscles: [], kind: 'reps', equipment: [], notes: '', aliases: [] };
  return { ...d, blocks, newExercises: known ? d.newExercises : [...d.newExercises, fresh] };
}

/** Правка полей нового упражнения; смена названия и типа доходит до строк блоков и новой разминки */
export function patchNewExercise(d: BuilderDraft, name: string, patch: Partial<NewExerciseDraft>): BuilderDraft {
  const current = d.newExercises.find((e) => e.name === name);
  if (!current) return d;
  const next = { ...current, ...patch };
  const newExercises = d.newExercises.map((e) => (e === current ? next : e));
  if (next.name === name && next.kind === current.kind) return { ...d, newExercises };
  const blocks = mapRows(d.blocks, (e, b) => (e.name === name ? retype(e, b.mode === 'timed' ? 'time' : next.kind, next.name) : e));
  const rename = (i: NewRoutineItem) => (i.name === name ? { ...i, name: next.name } : i);
  // Советы про упражнение идут за новым названием, иначе «Заменить» его не найдёт
  const advice = next.name === name ? d.advice : d.advice.map((a) => (a.exercise !== undefined && same(a.exercise, name) ? { ...a, exercise: next.name } : a));
  return { ...d, newExercises, blocks, warmup: mapItems(d.warmup, rename), cooldown: mapItems(d.cooldown, rename), advice };
}

/**
 * Меняет упражнение на библиотечное (имя без учёта регистра и ё): имя и тип в блоках; в новой разминке и заминке — только если замена на время
 * (разминка принимает только такие). Новое без использования удаляется, советы про него — тоже.
 */
export function replaceExercise(d: BuilderDraft, from: string, to: LibraryExercise): BuilderDraft {
  const blocks = mapRows(d.blocks, (e, b) => (same(e.name, from) ? retype(e, b.mode === 'timed' ? 'time' : to.kind, to.name) : e));
  const rename = (i: NewRoutineItem) => (same(i.name, from) ? { ...i, name: to.name } : i);
  const routines = to.kind === 'time' ? { warmup: mapItems(d.warmup, rename), cooldown: mapItems(d.cooldown, rename) } : {};
  const advice = d.advice.filter((a) => a.exercise === undefined || !same(a.exercise, from));
  return pruneNew({ ...d, blocks, ...routines, advice });
}

export const dismissAdvice = (d: BuilderDraft, adviceId: string): BuilderDraft => ({ ...d, advice: d.advice.filter((a) => a.id !== adviceId) });

/** «Заменить» у заметки: упражнение заметки → похожее из библиотеки; без похожего заметка просто убирается */
export function applyAdvice(d: BuilderDraft, adviceId: string, library: LibraryExercise[]): BuilderDraft {
  const a = d.advice.find((x) => x.id === adviceId);
  const to = a?.suggest ? library.find((l) => l.name === a.suggest) : undefined;
  if (!a?.exercise || !to) return dismissAdvice(d, adviceId);
  return dismissAdvice(replaceExercise(d, a.exercise, to), adviceId);
}

export const setRoutine = (d: BuilderDraft, which: Which, pick: RoutinePick): BuilderDraft => ({ ...d, [which]: pick });

const editNew = (d: BuilderDraft, which: Which, fn: (p: Extract<RoutinePick, { kind: 'new' }>) => RoutinePick): BuilderDraft => {
  const pick = d[which];
  return pick.kind === 'new' ? { ...d, [which]: fn(pick) } : d;
};

export const patchRoutineItem = (d: BuilderDraft, which: Which, index: number, sec: number): BuilderDraft =>
  editNew(d, which, (p) => ({ ...p, items: p.items.map((i, k) => (k === index ? { ...i, sec } : i)) }));

export function moveRoutineItem(d: BuilderDraft, which: Which, index: number, delta: -1 | 1): BuilderDraft {
  const pick = d[which];
  const to = index + delta;
  if (pick.kind !== 'new' || index < 0 || index >= pick.items.length || to < 0 || to >= pick.items.length) return d;
  const items = [...pick.items];
  [items[index], items[to]] = [items[to]!, items[index]!];
  return { ...d, [which]: { ...pick, items } };
}

/** Последнее упражнение можно убрать: пустую новую разминку остановит проверка перед сохранением */
export const removeRoutineItem = (d: BuilderDraft, which: Which, index: number): BuilderDraft =>
  pruneNew(editNew(d, which, (p) => ({ ...p, items: p.items.filter((_, k) => k !== index) })));

export const renameRoutine = (d: BuilderDraft, which: Which, title: string): BuilderDraft => editNew(d, which, (p) => ({ ...p, title }));

/** «Убрать» в панели нового упражнения: строки в блоках и наборах, советы про него и сама запись */
export function removeNew(d: BuilderDraft, name: string): BuilderDraft {
  const blocks = d.blocks.map((b) => (b.mode === 'note' ? b : ({ ...b, exercises: b.exercises.filter((e) => e.name !== name) } as Block)));
  const drop = (p: RoutinePick): RoutinePick => (p.kind === 'new' ? { ...p, items: p.items.filter((i) => i.name !== name) } : p);
  return {
    ...d,
    blocks,
    warmup: drop(d.warmup),
    cooldown: drop(d.cooldown),
    newExercises: d.newExercises.filter((e) => e.name !== name),
    advice: d.advice.filter((a) => a.exercise !== name),
  };
}
