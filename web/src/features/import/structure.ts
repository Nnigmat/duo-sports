import type { Block, Exercise, ExerciseKind, Range, SetsExercise } from '../../../../shared/types';
import type { Distance, Reps, Weight } from './units';

/** Из разобранных данных YAML собирает блоки для экрана тренировки. Чистые функции. */

export interface PerSet {
  reps: Reps;
  weight?: Weight;
  warmup?: boolean;
}

/** Нагрузка упражнения как её написали в файле */
export interface Load {
  sets?: number;
  reps?: Reps;
  /** Секунды */
  time?: Range;
  distance?: Distance;
  weight?: Weight;
  /** Подходы разной нагрузки: пирамида, разминочные подходы */
  setList?: PerSet[];
}

export type BlockType = 'sets' | 'circuit' | 'superset' | 'warmup' | 'cooldown';

export interface RawExercise {
  name: string;
  load: Load;
  /** Подписи двух сторон: есть — упражнение набора идёт два раза, время на одну сторону */
  sides?: [string, string];
}

export interface RawBlock {
  type: BlockType;
  /** Круги для circuit и superset */
  rounds?: number;
  /** Отдых между подходами или после круга, секунды */
  rest?: number;
  /** Длительность разминки или заминки, секунды */
  time?: Range;
  text?: string;
  exercises: RawExercise[];
}

export const DEFAULT_REST: Record<'sets' | 'circuit' | 'superset', number> = { sets: 90, circuit: 60, superset: 60 };
/** Разминка без указанного времени */
export const DEFAULT_TIMED_SEC = 300;

const TITLES: Record<BlockType, string> = {
  sets: 'Подходами',
  circuit: 'Круг',
  superset: 'Суперсет',
  warmup: 'Разминка',
  cooldown: 'Заминка',
};

/** фунты → кг с точностью до половины килограмма */
export const toKg = (w: Weight): Range => {
  const k = w.unit === 'lb' ? 0.45359237 : 1;
  const r = (n: number) => Math.round(n * k * 2) / 2;
  return { min: r(w.min), max: r(w.max) };
};

const repsRange = (r: Reps | undefined): Range => (r === undefined || r === 'max' ? { min: 0, max: 0 } : { min: r.min, max: r.max });

function kindOf(load: Load): ExerciseKind {
  if (load.time || load.distance) return 'time';
  return load.weight || load.setList?.some((s) => s.weight) ? 'weight' : 'reps';
}

/** Для упражнения на время нужна длительность; у расстояния её нет, считаем пять минут */
function targetOf(load: Load): Range {
  if (load.time) return { ...load.time };
  if (load.distance) return { min: DEFAULT_TIMED_SEC, max: DEFAULT_TIMED_SEC };
  return repsRange(load.reps);
}

function exerciseOf(id: string, e: RawExercise): Exercise {
  const kind = kindOf(e.load);
  const out: Exercise = { id, name: e.name, kind, target: targetOf(e.load) };
  const w = e.load.weight;
  if (kind === 'weight' && w) out.weight = toKg(w).max;
  return out;
}

/** Подходы, идущие подряд с одинаковой нагрузкой, склеиваем: «15 × 60», «12 × 100 × 3» */
export function groupSets(list: PerSet[]): Array<{ set: PerSet; count: number }> {
  const out: Array<{ set: PerSet; count: number }> = [];
  for (const s of list) {
    const last = out[out.length - 1];
    const same =
      last &&
      JSON.stringify([last.set.reps, last.set.weight]) === JSON.stringify([s.reps, s.weight]);
    if (same) last.count++;
    else out.push({ set: s, count: 1 });
  }
  return out;
}

function setsExercises(blockId: string, exs: RawExercise[]): SetsExercise[] {
  return exs.flatMap((e, i) => {
    const base = `${blockId}-e${i}`;
    if (e.load.setList?.length) {
      // У подходов разная нагрузка: каждая группа — отдельное упражнение с тем же названием
      return groupSets(e.load.setList).map(({ set, count }, g) => ({
        ...exerciseOf(`${base}-${g}`, { name: e.name, load: { reps: set.reps, weight: set.weight } }),
        sets: count,
      }));
    }
    return [{ ...exerciseOf(base, e), sets: e.load.sets ?? 1 }];
  });
}

/** Собирает блок экрана тренировки. blockId уникален в тренировке. */
export function buildBlock(raw: RawBlock, blockId: string): Block {
  const title = TITLES[raw.type];
  if (raw.type === 'warmup' || raw.type === 'cooldown') {
    const pose = raw.type === 'cooldown' ? 'stretch' : 'stand';
    // Набор упражнений: каждое — отдельный шаг прохождения (или два, если есть стороны)
    if (raw.exercises.length > 0) {
      return {
        id: blockId,
        mode: 'timed',
        kind: raw.type,
        title,
        ...(raw.text ? { note: raw.text } : {}),
        exercises: raw.exercises.map((e, i) => ({
          id: `${blockId}-e${i}`,
          name: e.name,
          kind: 'time' as const,
          pose,
          target: targetOf(e.load),
          ...(e.sides ? { sides: e.sides } : {}),
        })),
      };
    }
    const sec = raw.time ?? { min: DEFAULT_TIMED_SEC, max: DEFAULT_TIMED_SEC };
    return {
      id: blockId,
      mode: 'timed',
      kind: raw.type,
      title,
      ...(raw.text ? { note: raw.text } : {}),
      exercises: [{ id: `${blockId}-e0`, name: title, kind: 'time', pose, target: { ...sec } }],
    };
  }
  if (raw.type === 'sets') {
    return {
      id: blockId,
      mode: 'sets',
      title,
      exercises: setsExercises(blockId, raw.exercises),
      restSec: raw.rest ?? DEFAULT_REST.sets,
      videoRounds: [],
    };
  }
  return {
    id: blockId,
    mode: 'circuit',
    title,
    exercises: raw.exercises.map((e, i) => exerciseOf(`${blockId}-e${i}`, e)),
    rounds: raw.rounds ?? 1,
    restSec: raw.rest ?? DEFAULT_REST[raw.type],
    videoRounds: [],
  };
}

export const buildBlocks = (raw: RawBlock[]): Block[] => raw.map((b, i) => buildBlock(b, `b${i}`));

/** Расстояния в тренировке пока нет: упражнение считается по времени, и об этом стоит сказать */
export const usesDistance = (raw: RawBlock): string[] => raw.exercises.filter((e) => e.load.distance && !e.load.time).map((e) => e.name);
