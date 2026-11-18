import type { Range, RoutineKind } from '../../../../shared/types';
import type { Load } from './structure';
import { formatDuration, formatReps, formatWeight, parseReps } from './units';

/** Чтение полей формата version: 2. Чистые функции; ошибки пишутся через fail, путь — до самого поля. */

export type Path = Array<string | number>;
export type Fail = (path: Path, message: string, hint?: string) => void;
type Obj = Record<string, unknown>;

/** Поле v1, которое автор написал в version: 2, → какое поле v2 имелось в виду */
export const V1_FIELD_HINTS: Record<string, string> = {
  do: 'В version: 2 — sets, reps и weight_kg',
  rest: 'В version: 2 — rest_sec',
  time: 'time_sec',
  weight: 'weight_kg',
  per_side: 'sides: [влево, вправо]',
  name: 'exercise_id: id из библиотеки или из exercises',
  distance: 'В version: 2 расстояния нет',
};
/** Поля v1, которых в v2 нет и вне упражнений */
const MOVED: Record<string, string> = { ...V1_FIELD_HINTS, units: 'В version: 2 вес только в кг: weight_kg' };

export const TOP_FIELDS = ['version', 'exercises', 'routines', 'workouts', 'plan'];
export const ROUTINE_FIELDS = ['id', 'title', 'note', 'exercises'];
export const WORKOUT_FIELDS = ['id', 'title', 'date', 'notes', 'blocks'];
export const BLOCK_TYPES_V2 = ['sets', 'circuit', 'warmup', 'cooldown', 'timed', 'note'] as const;
export type BlockTypeV2 = (typeof BLOCK_TYPES_V2)[number];
/** Поля блока по типу; title и video_rounds читает ещё и YAML-редактор */
export const BLOCK_FIELDS: Record<BlockTypeV2, string[]> = {
  sets: ['type', 'title', 'exercises', 'video_rounds'],
  circuit: ['type', 'title', 'rounds', 'rest_sec', 'exercises', 'video_rounds'],
  warmup: ['type', 'routine'],
  cooldown: ['type', 'routine'],
  timed: ['type', 'title', 'text', 'exercises'],
  note: ['type', 'title', 'text'],
};
export const ROUTINE_BLOCK_HINT = 'В version: 2 разминка и заминка — только routine: id набора.';
export const EXERCISE_FIELDS = ['exercise_id', 'sets', 'reps', 'time_sec', 'weight_kg', 'rest_sec', 'sides', 'notes'];
export const TIMED_FIELDS = ['exercise_id', 'time_sec', 'sides'];

export const DEFAULT_SETS_REST_SEC = 90;
const REST_HINT = 'rest_sec — целое число секунд, например 180';

/** Ошибка на каждое незнакомое поле; true — все поля знакомы */
export function knownFields(obj: Obj, allowed: string[], path: Path, fail: Fail, hint?: string): boolean {
  let ok = true;
  for (const k of Object.keys(obj)) {
    if (allowed.includes(k)) continue;
    ok = false;
    if (MOVED[k]) fail([...path, k], `В version: 2 нет поля ${k}`, MOVED[k]);
    else fail([...path, k], `Незнакомое поле: ${k}`, hint ?? `Допустимо: ${allowed.join(', ')}.`);
  }
  return ok;
}

/** time_sec: целое больше нуля; max — секундомер вверх, цель {0,0} */
function readTimeSec(v: unknown, path: Path, fail: Fail, allowMax: boolean): Range | null {
  if (allowMax && v === 'max') return { min: 0, max: 0 };
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return { min: v, max: v };
  fail(
    path,
    `Не понимаю time_sec: ${String(v)}`,
    allowMax ? 'time_sec — целое число секунд больше нуля или max: 45, max.' : 'time_sec — целое число секунд больше нуля, например 30; max здесь нельзя.',
  );
  return null;
}

/** Отдых: целое число секунд, без единиц */
export function readRestSec(v: unknown, path: Path, fail: Fail): number | null {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v;
  fail(path, `Не понимаю rest_sec: ${String(v)}`, REST_HINT);
  return null;
}

/** sides: ровно две подписи; undefined — поля нет, null — ошибка */
function readSides(v: unknown, path: Path, fail: Fail): [string, string] | undefined | null {
  if (v === undefined) return undefined;
  const pair = Array.isArray(v) && v.length === 2 ? v.map((s) => (typeof s === 'string' ? s.trim() : '')) : null;
  if (pair?.every(Boolean)) return [pair[0]!, pair[1]!];
  fail(path, 'sides — ровно две подписи сторон', 'Пишите так: sides: [влево, вправо].');
  return null;
}

/** Упражнение блока sets или circuit без exercise_id: имя ищет вызывающий */
export interface BlockExerciseV2 {
  load: Load;
  /** Строка на проверке: «3 × 4 · 35 кг» */
  text: string;
  sides?: [string, string];
  note?: string;
  /** Только в sets: отдых после каждого подхода */
  restSec?: number;
}

export function readBlockExercise(ex: Obj, path: Path, inSets: boolean, fail: Fail): BlockExerciseV2 | null {
  if (!knownFields(ex, EXERCISE_FIELDS, path, fail)) return null;
  let bad = false;
  const err: Fail = (...args) => {
    bad = true;
    fail(...args);
  };
  const load: Load = {};

  if (!inSets && ex.sets !== undefined) err([...path, 'sets'], 'sets в circuit не бывает', 'Подходы в круге задаёт rounds у блока.');
  if (!inSets && ex.rest_sec !== undefined) err([...path, 'rest_sec'], 'rest_sec у упражнения круга не бывает', 'Отдых после круга — rest_sec у блока; между упражнениями круга отдыха нет.');
  if (inSets) {
    const n = ex.sets ?? 1;
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1) load.sets = n;
    else err([...path, 'sets'], `Не понимаю sets: ${String(ex.sets)}`, 'sets — целое число подходов, от 1.');
  }

  if (ex.reps !== undefined && ex.time_sec !== undefined) err(path, 'Нужно одно из: reps или time_sec', 'Уберите одно из полей.');
  else if (ex.reps === undefined && ex.time_sec === undefined) err(path, 'У упражнения нет нагрузки', 'Добавьте reps или time_sec.');
  else if (ex.reps !== undefined) {
    const reps = parseReps(ex.reps);
    if (reps) load.reps = reps;
    else err([...path, 'reps'], `Не понимаю reps: ${String(ex.reps)}`, 'Пишите 10, "8-12" или max.');
  } else {
    const time = readTimeSec(ex.time_sec, [...path, 'time_sec'], err, true);
    if (time) load.time = time;
  }

  if (ex.weight_kg !== undefined) {
    if (ex.reps === undefined) err([...path, 'weight_kg'], 'weight_kg — только вместе с reps', 'Вес пишется к повторам: reps: 10, weight_kg: 8.');
    else if (typeof ex.weight_kg === 'number' && ex.weight_kg >= 0) load.weight = { min: ex.weight_kg, max: ex.weight_kg, unit: 'kg' };
    else err([...path, 'weight_kg'], `Не понимаю weight_kg: ${String(ex.weight_kg)}`, 'weight_kg — число килограммов, например 8.');
  }

  let restSec: number | undefined;
  if (inSets) restSec = ex.rest_sec === undefined ? DEFAULT_SETS_REST_SEC : (readRestSec(ex.rest_sec, [...path, 'rest_sec'], err) ?? undefined);

  const sides = readSides(ex.sides, [...path, 'sides'], err);
  let note: string | undefined;
  if (ex.notes !== undefined) {
    if (typeof ex.notes === 'string' && ex.notes.trim()) note = ex.notes.trim();
    else err([...path, 'notes'], 'notes — текст подсказки', 'Пишите так: notes: Локоть упирается в бедро.');
  }
  if (bad) return null;

  const main = load.reps ? formatReps(load.reps) : load.time!.max === 0 ? 'макс.' : formatDuration(load.time!);
  const parts = [inSets && load.sets! > 1 ? `${load.sets} × ${main}` : main];
  if (load.weight) parts.push(formatWeight(load.weight));
  if (sides) parts.push('на сторону');
  return {
    load,
    text: parts.join(' · '),
    ...(sides ? { sides } : {}),
    ...(note ? { note } : {}),
    ...(restSec !== undefined ? { restSec } : {}),
  };
}

/** Позиция набора или упражнение блока timed: только время, без max */
export function readTimedItem(ex: Obj, path: Path, fail: Fail): { time: Range; sides?: [string, string] } | null {
  const fieldsOk = knownFields(ex, TIMED_FIELDS, path, fail, 'Допустимо: exercise_id, time_sec, sides. Повторы переведите в секунды.');
  if (!fieldsOk) return null;
  if (ex.time_sec === undefined) {
    fail(path, 'У упражнения нет time_sec', 'Время обязательно: time_sec: 30.');
    return null;
  }
  const time = readTimeSec(ex.time_sec, [...path, 'time_sec'], fail, false);
  const sides = readSides(ex.sides, [...path, 'sides'], fail);
  if (!time || sides === null) return null;
  return { time, ...(sides ? { sides } : {}) };
}

/** Подсказка к неизвестному exercise_id: это id набора или ближайшие id упражнений */
export function unknownIdHint(id: string, nearest: string[], routine?: { kind: RoutineKind }): string {
  if (routine) {
    const word = routine.kind === 'warmup' ? 'разминки' : 'заминки';
    return `«${id}» — это id ${word}: подключите его блоком { type: ${routine.kind}, routine: ${id} }.`;
  }
  const near = nearest.length ? `Ближайшие id: ${nearest.join(', ')}. ` : '';
  return `${near}Исправьте опечатку или опишите упражнение в exercises.`;
}
