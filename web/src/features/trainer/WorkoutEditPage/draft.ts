import type { Block, Exercise, ExerciseKind, SetsExercise } from '../../../../../shared/types';

/** Правка тренировки без побочных эффектов: каждая функция возвращает новые блоки. Id упражнений не меняем: на них держатся подсказки. */

export type BlockMode = Block['mode'];

export const MODE_LABELS: Record<BlockMode, string> = { timed: 'По таймеру', sets: 'Подходами', circuit: 'По кругу' };
export const DEFAULT_REST = 90;
export const DEFAULT_ROUNDS = 3;
/** Круг для видеозаписи у нового блока «по кругу» */
const DEFAULT_VIDEO_ROUND = 2;
const DEFAULT_TIMED_SEC = 60;

/** Минимум данных об упражнении библиотеки для добавления в блок */
export type PickedExercise = { name: string; kind: ExerciseKind; defaults: { reps: number; weight: number; seconds: number } };

const idsOf = (blocks: Block[]): Set<string> => new Set(blocks.flatMap((b) => [b.id, ...b.exercises.map((e) => e.id)]));

function freshId(blocks: Block[], prefix: string): string {
  const taken = idsOf(blocks);
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function exerciseFrom(id: string, pick: PickedExercise, withSets: boolean): Exercise | SetsExercise {
  const base: Exercise =
    pick.kind === 'time'
      ? { id, name: pick.name, kind: 'time', target: { min: pick.defaults.seconds || DEFAULT_TIMED_SEC, max: pick.defaults.seconds || DEFAULT_TIMED_SEC } }
      : { id, name: pick.name, kind: pick.kind, target: { min: pick.defaults.reps, max: pick.defaults.reps }, ...(pick.kind === 'weight' ? { weight: pick.defaults.weight } : {}) };
  return withSets ? { ...base, sets: 3 } : base;
}

export function newBlock(blocks: Block[], mode: BlockMode): Block {
  const id = freshId(blocks, 'b');
  const title = MODE_LABELS[mode];
  if (mode === 'timed') return { id, mode, title, exercises: [] };
  if (mode === 'sets') return { id, mode, title, exercises: [], restSec: DEFAULT_REST, videoRounds: [] };
  return { id, mode, title, exercises: [], rounds: DEFAULT_ROUNDS, restSec: 60, videoRounds: [DEFAULT_VIDEO_ROUND] };
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

/** Меняет режим, сохраняя упражнения: для «подходами» добавляется число подходов, для «по таймеру» остаётся только время */
export function changeMode(blocks: Block[], blockId: string, mode: BlockMode): Block[] {
  return mapBlock(blocks, blockId, (b) => {
    if (b.mode === mode) return b;
    const plain = b.exercises.map(({ id, name, kind, pose, target, weight }) => ({ id, name, kind, ...(pose ? { pose } : {}), target, ...(weight !== undefined ? { weight } : {}) }));
    const keepSets = (e: Exercise): SetsExercise => ({ ...e, sets: (b.exercises.find((x) => x.id === e.id) as SetsExercise | undefined)?.sets ?? 3 });
    const common = { id: b.id, title: b.title };
    if (mode === 'timed') return { ...common, mode, exercises: plain.map((e) => ({ ...e, kind: 'time' as const, weight: undefined, target: e.kind === 'time' ? e.target : { min: DEFAULT_TIMED_SEC, max: DEFAULT_TIMED_SEC } })).map(({ weight: _w, ...e }) => e) };
    const rest = b.mode === 'timed' ? DEFAULT_REST : b.restSec;
    const videoRounds = b.mode === 'timed' ? [] : b.videoRounds;
    if (mode === 'sets') return { ...common, mode, exercises: plain.map(keepSets), restSec: rest, videoRounds };
    return { ...common, mode, exercises: plain, rounds: DEFAULT_ROUNDS, restSec: rest, videoRounds: videoRounds.filter((n) => n <= DEFAULT_ROUNDS) };
  });
}

export function addExercise(blocks: Block[], blockId: string, pick: PickedExercise): Block[] {
  const id = freshId(blocks, 'x');
  return mapBlock(blocks, blockId, (b) => {
    const ex = exerciseFrom(id, b.mode === 'timed' ? { ...pick, kind: 'time' } : pick, b.mode === 'sets');
    return { ...b, exercises: [...b.exercises, ex] } as Block;
  });
}

export const removeExercise = (blocks: Block[], blockId: string, exerciseId: string): Block[] =>
  mapBlock(blocks, blockId, (b) => ({ ...b, exercises: b.exercises.filter((e) => e.id !== exerciseId) }) as Block);

export const moveExercise = (blocks: Block[], blockId: string, exerciseId: string, delta: -1 | 1): Block[] =>
  mapBlock(blocks, blockId, (b) => {
    const i = b.exercises.findIndex((e) => e.id === exerciseId);
    return i < 0 ? b : ({ ...b, exercises: swap(b.exercises as Exercise[], i, i + delta) } as Block);
  });

export const patchExercise = (blocks: Block[], blockId: string, exerciseId: string, patch: Partial<SetsExercise>): Block[] =>
  mapBlock(blocks, blockId, (b) => ({ ...b, exercises: b.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)) }) as Block);

/** Меняет одну границу цели и подтягивает вторую, чтобы «от» не стало больше «до» */
export function setTarget(blocks: Block[], blockId: string, exerciseId: string, edge: 'min' | 'max', value: number): Block[] {
  const ex = blocks.find((b) => b.id === blockId)?.exercises.find((e) => e.id === exerciseId);
  if (!ex) return blocks;
  const target = edge === 'min' ? { min: value, max: Math.max(ex.target.max, value) } : { min: Math.min(ex.target.min, value), max: value };
  return patchExercise(blocks, blockId, exerciseId, { target });
}

export const setRest = (blocks: Block[], blockId: string, restSec: number): Block[] => mapBlock(blocks, blockId, (b) => (b.mode === 'timed' ? b : { ...b, restSec }));

/** Круги убавили — номера кругов для видео больше нового числа пропадают */
export const setRounds = (blocks: Block[], blockId: string, rounds: number): Block[] =>
  mapBlock(blocks, blockId, (b) => (b.mode === 'circuit' ? { ...b, rounds, videoRounds: b.videoRounds.filter((n) => n <= rounds) } : b));

/** Сколько кругов или подходов можно пометить для видео: у «подходами» — максимум подходов среди упражнений */
export const roundsOf = (b: Block): number => (b.mode === 'circuit' ? b.rounds : b.mode === 'sets' ? Math.max(1, ...b.exercises.map((e) => e.sets)) : 0);

export const toggleVideoRound = (blocks: Block[], blockId: string, n: number): Block[] =>
  mapBlock(blocks, blockId, (b) => {
    if (b.mode === 'timed') return b;
    const has = b.videoRounds.includes(n);
    const videoRounds = (has ? b.videoRounds.filter((x) => x !== n) : [...b.videoRounds, n]).sort((a, c) => a - c);
    return { ...b, videoRounds };
  });

/** Что мешает сохранить; пустой список — можно. Сервер проверяет то же самое. */
export function problems(title: string, blocks: Block[]): string[] {
  const out: string[] = [];
  if (!title.trim()) out.push('Введите название тренировки');
  if (blocks.length === 0) out.push('Добавьте хотя бы один блок');
  for (const b of blocks) {
    if (!b.title.trim()) out.push('У блока нет названия');
    if (b.exercises.length === 0) out.push(`В блоке «${b.title || 'без названия'}» нет упражнений`);
  }
  return out;
}
