/**
 * Сборка тренировки агентом: ответ модели, запрос страницы к серверу и JSON-схема ответа.
 * Ответ повторяет формат импорта для одной тренировки (web/src/features/import/format.ts)
 * плюс заметки агента и поля новых упражнений; браузер прогоняет его через parseImport.
 */

export type AgentMeasure = 'reps' | 'weight' | 'time' | 'distance';
export type AgentBlockType = 'sets' | 'circuit' | 'superset' | 'timed';

/** Упражнение блока: exercise_id или name; нагрузка — do или sets/reps/weight, у упражнений на время — time */
export interface AgentExercise {
  exercise_id?: string;
  name?: string;
  do?: string;
  sets?: number;
  reps?: string;
  weight?: string;
  time?: string;
  rest?: string;
  per_side?: boolean;
  notes?: string;
}
export interface AgentBlock {
  type: AgentBlockType;
  title?: string;
  rounds?: number;
  rest?: string;
  exercises: AgentExercise[];
}
/** Упражнение нового набора: только по exercise_id (библиотека или new_exercises), время на одну сторону */
export interface AgentRoutineItem {
  exercise_id: string;
  time: string;
  per_side?: boolean;
  sides?: string[];
}
export interface AgentNewRoutine {
  id: string;
  title: string;
  exercises: AgentRoutineItem[];
}
/** Разминка или заминка: готовая из библиотеки, новая или никакой */
export type AgentRoutine = { routine: string } | { new_routine: AgentNewRoutine } | null;
export interface AgentNewExercise {
  id: string;
  name: string;
  muscles: string[];
  measure: AgentMeasure;
  equipment: string[];
  notes?: string;
  aliases: string[];
}
/** Заметка агента; exercise — имя в тренировке, suggest — slug похожего из библиотеки */
export interface AgentAdvice {
  text: string;
  exercise?: string;
  suggest?: string;
}
export interface AgentWorkout {
  title: string;
  notes?: string;
  warmup: AgentRoutine;
  cooldown: AgentRoutine;
  blocks: AgentBlock[];
  new_exercises: AgentNewExercise[];
  advice: AgentAdvice[];
}

export type RoutineAsk = { routine: string } | { text: string } | null;
/** Запрос страницы к POST /api/ai/workout-draft; errors — ошибки разбора прошлой попытки */
export interface DraftRequest {
  athleteId: number | null;
  date: string;
  title: string;
  warmup: RoutineAsk;
  main: { text: string; exercises: string[] };
  cooldown: RoutineAsk;
  errors?: string[];
}
/** Токены одной сборки: input — без кеша, cacheCreation — записано в кеш, cacheRead — прочитано из кеша */
export interface DraftUsage {
  input: number;
  cacheCreation: number;
  cacheRead: number;
  output: number;
}
export interface DraftResponse {
  workout: AgentWorkout;
  usage: DraftUsage;
}

/** Предел каждого текстового поля запроса, символов */
export const DRAFT_TEXT_MAX = 2000;

// ── JSON-схема ───────────────────────────────────────────
// Строгий режим structured outputs (output_config.format, GA, claude-haiku-5-5 поддерживается):
// https://platform.claude.com/docs/en/build-with-claude/structured-outputs
// - у каждого объекта additionalProperties: false;
// - нельзя minimum/maximum, minLength/maxLength, minItems > 1, рекурсию;
// - на запрос не больше 24 необязательных параметров и 16 параметров с union-типом (anyOf или массив в type),
//   иначе 400 «Schema is too complex». Поэтому необязательное выражено отсутствием в required, а не null:
//   null остался только у warmup/cooldown (2 union). Счёт держит тест в aiDraft.test.ts.

type Schema = Record<string, unknown>;
const str: Schema = { type: 'string' };
const strs: Schema = { type: 'array', items: str };
const obj = (properties: Record<string, Schema>, required: string[]): Schema => ({ type: 'object', properties, required, additionalProperties: false });

const exerciseSchema = obj(
  {
    exercise_id: { type: 'string', description: 'id из библиотеки или из new_exercises' },
    name: { type: 'string', description: 'Название, если нет exercise_id' },
    do: { type: 'string', description: 'Короткая запись: "4x8 @ 60", "3x12", "3x8-12 @ 60"' },
    sets: { type: 'integer' },
    reps: { type: 'string', description: '8, "8-12" или max' },
    weight: { type: 'string', description: '60 или 60kg' },
    time: { type: 'string', description: '45s, 1:30' },
    rest: { type: 'string', description: '90s' },
    per_side: { type: 'boolean' },
    notes: str,
  },
  [],
);

const routineItemSchema = obj(
  { exercise_id: { type: 'string', description: 'id упражнения на время из библиотеки или new_exercises' }, time: { type: 'string', description: 'На одну сторону: 30s, 1:00' }, per_side: { type: 'boolean' }, sides: strs },
  ['exercise_id', 'time'],
);

const routineSchema: Schema = {
  anyOf: [
    obj({ routine: { type: 'string', description: 'id разминки или заминки из библиотеки' } }, ['routine']),
    obj({ new_routine: obj({ id: { type: 'string', description: 'латиница, цифры, дефис' }, title: str, exercises: { type: 'array', items: routineItemSchema, minItems: 1 } }, ['id', 'title', 'exercises']) }, ['new_routine']),
    { type: 'null' },
  ],
};

export const AGENT_WORKOUT_SCHEMA: Schema = obj(
  {
    title: str,
    notes: str,
    warmup: routineSchema,
    cooldown: routineSchema,
    blocks: {
      type: 'array',
      items: obj(
        { type: { type: 'string', enum: ['sets', 'circuit', 'superset', 'timed'] }, title: str, rounds: { type: 'integer' }, rest: str, exercises: { type: 'array', items: exerciseSchema, minItems: 1 } },
        ['type', 'exercises'],
      ),
    },
    new_exercises: {
      type: 'array',
      items: obj(
        {
          id: { type: 'string', description: 'латиница, цифры, дефис' },
          name: str,
          muscles: strs,
          measure: { type: 'string', enum: ['reps', 'weight', 'time', 'distance'] },
          equipment: strs,
          notes: { type: 'string', description: 'Техника выполнения' },
          aliases: strs,
        },
        ['id', 'name', 'muscles', 'measure', 'equipment', 'aliases'],
      ),
    },
    advice: {
      type: 'array',
      items: obj({ text: str, exercise: { type: 'string', description: 'Имя упражнения в этой тренировке' }, suggest: { type: 'string', description: 'id похожего упражнения из библиотеки' } }, ['text']),
    },
  },
  ['title', 'warmup', 'cooldown', 'blocks', 'new_exercises', 'advice'],
);

// ── Проверка ответа ──────────────────────────────────────
// Строгий режим гарантирует форму, но клиент может вернуть что угодно при сбое: сервер проверяет сам.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const optStr = (v: unknown) => v === undefined || typeof v === 'string';
const optNum = (v: unknown) => v === undefined || typeof v === 'number';
const optBool = (v: unknown) => v === undefined || typeof v === 'boolean';
const isStrs = (v: unknown) => Array.isArray(v) && v.every((s) => typeof s === 'string');
const BLOCK_TYPES = new Set<string>(['sets', 'circuit', 'superset', 'timed']);
const MEASURES = new Set<string>(['reps', 'weight', 'time', 'distance']);

const isExercise = (e: unknown) =>
  isObj(e) &&
  optStr(e.exercise_id) && optStr(e.name) && optStr(e.do) && optNum(e.sets) && optStr(e.reps) && optStr(e.weight) &&
  optStr(e.time) && optStr(e.rest) && optBool(e.per_side) && optStr(e.notes);

const isBlock = (b: unknown) =>
  isObj(b) && typeof b.type === 'string' && BLOCK_TYPES.has(b.type) && optStr(b.title) && optNum(b.rounds) && optStr(b.rest) &&
  Array.isArray(b.exercises) && b.exercises.every(isExercise);

const isRoutineItem = (i: unknown) =>
  isObj(i) && typeof i.exercise_id === 'string' && typeof i.time === 'string' && optBool(i.per_side) && (i.sides === undefined || isStrs(i.sides));

const isRoutine = (r: unknown) => {
  if (r === null) return true;
  if (!isObj(r)) return false;
  if ('routine' in r) return typeof r.routine === 'string';
  const n = r.new_routine;
  return isObj(n) && typeof n.id === 'string' && typeof n.title === 'string' && Array.isArray(n.exercises) && n.exercises.every(isRoutineItem);
};

const isNewExercise = (e: unknown) =>
  isObj(e) && typeof e.id === 'string' && typeof e.name === 'string' && isStrs(e.muscles) && typeof e.measure === 'string' &&
  MEASURES.has(e.measure) && isStrs(e.equipment) && optStr(e.notes) && isStrs(e.aliases);

const isAdvice = (a: unknown) => isObj(a) && typeof a.text === 'string' && optStr(a.exercise) && optStr(a.suggest);

export function isAgentWorkout(v: unknown): v is AgentWorkout {
  return (
    isObj(v) && typeof v.title === 'string' && optStr(v.notes) && isRoutine(v.warmup) && isRoutine(v.cooldown) &&
    Array.isArray(v.blocks) && v.blocks.every(isBlock) &&
    Array.isArray(v.new_exercises) && v.new_exercises.every(isNewExercise) &&
    Array.isArray(v.advice) && v.advice.every(isAdvice)
  );
}
