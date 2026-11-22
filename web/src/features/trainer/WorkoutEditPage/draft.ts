import { exercisesOf } from '../../../../../shared/blocks';
import type { Block, Exercise, ExerciseKind, SetsExercise, Workout } from '../../../../../shared/types';

/** Правка тренировки без побочных эффектов: каждая функция возвращает новые блоки. Id упражнений не меняем: на них держатся подсказки. */

/** Блоки для правки: подключённые разминку и заминку сервер собирает сам, поэтому их среди блоков не оставляем */
export function editableBlocks(blocks: Block[], routines: Workout['routines']): Block[] {
  return blocks.filter((b) => b.mode !== 'timed' || !((b.kind === 'warmup' && routines?.warmup) || (b.kind === 'cooldown' && routines?.cooldown)));
}

/** Режимы блока, которые можно добавить в редакторе */
export type BlockMode = Block['mode'];
/** Режимы, между которыми переключают блок с упражнениями: заметку в упражнения не превратить */
export type ExerciseMode = Exclude<BlockMode, 'note'>;

export const MODE_LABELS: Record<BlockMode, string> = { timed: 'По таймеру', sets: 'Подходами', circuit: 'По кругу', note: 'Заметка' };
export const DEFAULT_REST = 90;
export const DEFAULT_ROUNDS = 3;
/** Круг для видеозаписи у нового блока «по кругу» */
const DEFAULT_VIDEO_ROUND = 2;
const DEFAULT_TIMED_SEC = 60;
const DEFAULT_REPS = 10;

/** Минимум данных об упражнении библиотеки для добавления в блок */
export type PickedExercise = { name: string; kind: ExerciseKind; defaults: { reps: number; weight: number; seconds: number } };

const idsOf = (blocks: Block[]): Set<string> => new Set(blocks.flatMap((b) => [b.id, ...exercisesOf(b).map((e) => e.id)]));

function freshId(blocks: Block[], prefix: string): string {
  const taken = idsOf(blocks);
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** Цель упражнения по умолчанию: время или повторы из значений библиотеки */
function defaultTarget(kind: ExerciseKind, defaults: PickedExercise['defaults'] | undefined): Exercise['target'] {
  const n = kind === 'time' ? defaults?.seconds || DEFAULT_TIMED_SEC : defaults?.reps || DEFAULT_REPS;
  return { min: n, max: n };
}

export function exerciseFrom(id: string, pick: PickedExercise, withSets: boolean): Exercise | SetsExercise {
  const base: Exercise = { id, name: pick.name, kind: pick.kind, target: defaultTarget(pick.kind, pick.defaults), ...(pick.kind === 'weight' ? { weight: pick.defaults.weight } : {}) };
  return withSets ? { ...base, sets: 3 } : base;
}

export function newBlock(blocks: Block[], mode: BlockMode): Block {
  const id = freshId(blocks, 'b');
  const title = MODE_LABELS[mode];
  if (mode === 'note') return { id, mode, title, text: '' };
  if (mode === 'timed') return { id, mode, title, exercises: [] };
  if (mode === 'sets') return { id, mode, title, exercises: [], restSec: DEFAULT_REST, videoRounds: [] };
  return { id, mode, title, exercises: [], rounds: DEFAULT_ROUNDS, restSec: 60, restAfter: 'round', videoRounds: [DEFAULT_VIDEO_ROUND] };
}

export const addBlock = (blocks: Block[], mode: BlockMode): Block[] => [...blocks, newBlock(blocks, mode)];

export const removeBlock = (blocks: Block[], blockId: string): Block[] => blocks.filter((b) => b.id !== blockId);

function swap<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const out = [...list];
  [out[from], out[to]] = [out[to], out[from]];
  return out;
}

export const moveBlock = (blocks: Block[], blockId: string, delta: -1 | 1): Block[] => {
  const i = blocks.findIndex((b) => b.id === blockId);
  return i < 0 ? blocks : swap(blocks, i, i + delta);
};

const mapBlock = (blocks: Block[], blockId: string, fn: (b: Block) => Block): Block[] => blocks.map((b) => (b.id === blockId ? fn(b) : b));

export const renameBlock = (blocks: Block[], blockId: string, title: string): Block[] => mapBlock(blocks, blockId, (b) => ({ ...b, title }));

/**
 * Меняет режим, сохраняя упражнения: для «подходами» добавляется число подходов, для «по таймеру» остаётся только время.
 * Заметка и стороны не зависят от режима и остаются; свой отдых упражнения живёт только в «подходами».
 */
export function changeMode(blocks: Block[], blockId: string, mode: ExerciseMode): Block[] {
  return mapBlock(blocks, blockId, (b) => {
    if (b.mode === mode || b.mode === 'note') return b;
    const plain = b.exercises.map(({ sets: _sets, restSec: _restSec, ...e }: Exercise & Partial<SetsExercise>): Exercise => e);
    const keepSets = (e: Exercise): SetsExercise => {
      const was = b.exercises.find((x) => x.id === e.id) as SetsExercise | undefined;
      return { ...e, sets: was?.sets ?? 3, ...(was?.restSec !== undefined ? { restSec: was.restSec } : {}) };
    };
    const common = { id: b.id, title: b.title };
    if (mode === 'timed') {
      const timed = plain.map(({ weight: _weight, ...e }): Exercise => ({ ...e, kind: 'time', target: e.kind === 'time' && e.target.max > 0 ? e.target : defaultTarget('time', undefined) }));
      return { ...common, mode, exercises: timed };
    }
    const rest = b.mode === 'timed' ? DEFAULT_REST : b.restSec;
    const videoRounds = b.mode === 'timed' ? [] : b.videoRounds;
    if (mode === 'sets') return { ...common, mode, exercises: plain.map(keepSets), restSec: rest, videoRounds };
    return { ...common, mode, exercises: plain, rounds: DEFAULT_ROUNDS, restSec: rest, restAfter: 'round', videoRounds: videoRounds.filter((n) => n <= DEFAULT_ROUNDS) };
  });
}

export function addExercise(blocks: Block[], blockId: string, pick: PickedExercise): Block[] {
  const id = freshId(blocks, 'x');
  return mapBlock(blocks, blockId, (b) => {
    if (b.mode === 'note') return b;
    const ex = exerciseFrom(id, b.mode === 'timed' ? { ...pick, kind: 'time' } : pick, b.mode === 'sets');
    return { ...b, exercises: [...b.exercises, ex] } as Block;
  });
}

export const removeExercise = (blocks: Block[], blockId: string, exerciseId: string): Block[] =>
  mapBlock(blocks, blockId, (b) => (b.mode === 'note' ? b : ({ ...b, exercises: b.exercises.filter((e) => e.id !== exerciseId) } as Block)));

export const moveExercise = (blocks: Block[], blockId: string, exerciseId: string, delta: -1 | 1): Block[] =>
  mapBlock(blocks, blockId, (b) => {
    if (b.mode === 'note') return b;
    const i = b.exercises.findIndex((e) => e.id === exerciseId);
    return i < 0 ? b : ({ ...b, exercises: swap(b.exercises as Exercise[], i, i + delta) } as Block);
  });

export const patchExercise = (blocks: Block[], blockId: string, exerciseId: string, patch: Partial<SetsExercise>): Block[] =>
  mapBlock(blocks, blockId, (b) => (b.mode === 'note' ? b : ({ ...b, exercises: b.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)) } as Block)));

/** Меняет одну границу цели и подтягивает вторую, чтобы «от» не стало больше «до» */
export function setTarget(blocks: Block[], blockId: string, exerciseId: string, edge: 'min' | 'max', value: number): Block[] {
  const block = blocks.find((b) => b.id === blockId);
  const ex = block && exercisesOf(block).find((e) => e.id === exerciseId);
  if (!ex) return blocks;
  const target = edge === 'min' ? { min: value, max: Math.max(ex.target.max, value) } : { min: Math.min(ex.target.min, value), max: value };
  return patchExercise(blocks, blockId, exerciseId, { target });
}

const mapExercise = (blocks: Block[], blockId: string, exerciseId: string, fn: (e: SetsExercise) => SetsExercise): Block[] =>
  mapBlock(blocks, blockId, (b) => (b.mode === 'note' ? b : ({ ...b, exercises: b.exercises.map((e) => (e.id === exerciseId ? fn(e as SetsExercise) : e)) } as Block)));

/** Свой отдых упражнения: только в «подходами», в остальных режимах отдыха у упражнения нет */
export const setExerciseRest = (blocks: Block[], blockId: string, exerciseId: string, restSec: number): Block[] =>
  mapBlock(blocks, blockId, (b) => (b.mode === 'sets' ? { ...b, exercises: b.exercises.map((e) => (e.id === exerciseId ? { ...e, restSec } : e)) } : b));

/** Заметка упражнения; пустая строка убирает поле */
export const setExerciseNote = (blocks: Block[], blockId: string, exerciseId: string, note: string): Block[] =>
  mapExercise(blocks, blockId, exerciseId, ({ note: _note, ...e }) => (note.trim() === '' ? e : { ...e, note }));

/** «На максимум»: цель {0, 0}; выключили — значение по умолчанию из библиотеки (как при добавлении упражнения) */
export const setOpen = (blocks: Block[], blockId: string, exerciseId: string, open: boolean, defaults?: PickedExercise['defaults']): Block[] =>
  mapExercise(blocks, blockId, exerciseId, (e) => ({ ...e, target: open ? { min: 0, max: 0 } : defaultTarget(e.kind, defaults) }));

/** Снимает «на сторону»: упражнение идёт один раз */
export const clearSides = (blocks: Block[], blockId: string, exerciseId: string): Block[] => mapExercise(blocks, blockId, exerciseId, ({ sides: _sides, ...e }) => e);

export const setNoteText = (blocks: Block[], blockId: string, text: string): Block[] => mapBlock(blocks, blockId, (b) => (b.mode === 'note' ? { ...b, text } : b));

export const setRest = (blocks: Block[], blockId: string, restSec: number): Block[] => mapBlock(blocks, blockId, (b) => (b.mode === 'timed' || b.mode === 'note' ? b : { ...b, restSec }));

/** Когда отдыхать в круге: после круга или после каждого упражнения (поля restAfter нет) */
export type CircuitRest = 'round' | 'exercise';

export const setRestAfter = (blocks: Block[], blockId: string, rest: CircuitRest): Block[] =>
  mapBlock(blocks, blockId, (b) => {
    if (b.mode !== 'circuit') return b;
    const { restAfter: _restAfter, ...each } = b;
    return rest === 'round' ? { ...each, restAfter: 'round' } : each;
  });

/** Круги убавили — номера кругов для видео больше нового числа пропадают */
export const setRounds = (blocks: Block[], blockId: string, rounds: number): Block[] =>
  mapBlock(blocks, blockId, (b) => (b.mode === 'circuit' ? { ...b, rounds, videoRounds: b.videoRounds.filter((n) => n <= rounds) } : b));

/** Сколько кругов или подходов можно пометить для видео: у «подходами» — максимум подходов среди упражнений */
export const roundsOf = (b: Block): number => (b.mode === 'circuit' ? b.rounds : b.mode === 'sets' ? Math.max(1, ...b.exercises.map((e) => e.sets)) : 0);

export const toggleVideoRound = (blocks: Block[], blockId: string, n: number): Block[] =>
  mapBlock(blocks, blockId, (b) => {
    if (b.mode === 'timed' || b.mode === 'note') return b;
    const has = b.videoRounds.includes(n);
    const videoRounds = (has ? b.videoRounds.filter((x) => x !== n) : [...b.videoRounds, n]).sort((a, c) => a - c);
    return { ...b, videoRounds };
  });

/** Что мешает сохранить; пустой список — можно. Сервер проверяет то же самое. */
export function problems(title: string, blocks: Block[]): string[] {
  const out: string[] = [];
  if (!title.trim()) out.push('Введите название тренировки');
  if (blocks.length === 0) out.push('Добавьте хотя бы один блок');
  else if (blocks.every((b) => b.mode === 'note')) out.push('Нужен хотя бы один блок с упражнениями');
  for (const b of blocks) {
    if (!b.title.trim()) out.push('У блока нет названия');
    if (b.mode === 'note') {
      if (!b.text.trim()) out.push('Заметка без текста');
    } else if (b.exercises.length === 0) out.push(`В блоке «${b.title || 'без названия'}» нет упражнений`);
  }
  return out;
}
