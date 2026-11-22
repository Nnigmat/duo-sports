/**
 * Сборка тренировки агентом: ответ модели, запрос страницы к серверу и JSON-схема ответа.
 * Ответ — JSON-вид формата импорта version: 2 для одной тренировки (web/src/features/import/v2.ts)
 * плюс заметки агента и поля новых упражнений; браузер прогоняет его через parseImport.
 */

/** Единственный список значений: из него тип, enum схемы и проверка ответа */
export const AGENT_MEASURES = ['reps', 'weight', 'time', 'distance'] as const;
export const AGENT_BLOCK_TYPES = ['sets', 'circuit', 'timed', 'note'] as const;
/** Отдых круга: round — после круга (пустое значение, его убирает compactAgentWorkout), exercise — после каждого упражнения */
export const AGENT_REST_AFTER = ['round', 'exercise'] as const;
export type AgentMeasure = (typeof AGENT_MEASURES)[number];
export type AgentBlockType = (typeof AGENT_BLOCK_TYPES)[number];

/**
 * Упражнение блока, поля как у упражнения v2: нагрузка — reps или time_sec ("max" — на максимум времени).
 * В схеме все поля обязательные; пустые значения убирает compactAgentWorkout, поэтому здесь они необязательны.
 */
export interface AgentExercise {
  exercise_id: string;
  sets?: number;
  reps?: string;
  time_sec?: number | 'max';
  weight_kg?: number;
  rest_sec?: number;
  sides?: string[];
  notes?: string;
}
/** Блок: в схеме все поля обязательные; у note список exercises пуст */
export interface AgentBlock {
  type: AgentBlockType;
  title?: string;
  rounds?: number;
  rest_sec?: number;
  rest_after?: (typeof AGENT_REST_AFTER)[number];
  text?: string;
  exercises: AgentExercise[];
}
/** Упражнение нового набора: любое из библиотеки или new_exercises, время на одну сторону; sides [] — без сторон */
export interface AgentRoutineItem {
  exercise_id: string;
  time_sec: number;
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
//   null остался только у warmup/cooldown (2 union), ещё один union — time_sec упражнения блока (число или "max");
// - сверх этих лимитов есть предел размера грамматики: каждое необязательное поле объекта её удваивает.
//   Упражнение блока с 10 необязательными полями API отклонял через 2,5 минуты, поэтому у него все поля
//   обязательные, а «нет значения» — "", 0 или []; так же блок и упражнение набора. compactAgentWorkout
//   убирает пустые значения до проверки.
//   В одном объекте не больше 3 необязательных полей. Счёт держит тест в aiDraft.test.ts,
//   настоящий запрос с этой схемой — npm run smoke:ai.

type Schema = Record<string, unknown>;
const str: Schema = { type: 'string' };
const strs: Schema = { type: 'array', items: str };
const obj = (properties: Record<string, Schema>, required: string[]): Schema => ({ type: 'object', properties, required, additionalProperties: false });

const sidesSchema: Schema = { type: 'array', items: str, description: 'Ровно две подписи сторон: ["влево", "вправо"]; без сторон — []' };

const exerciseSchema = obj(
  {
    exercise_id: { type: 'string', description: 'id из библиотеки или из new_exercises' },
    sets: { type: 'integer', description: 'Подходы: только в блоке sets, в остальных блоках 0' },
    reps: { type: 'string', description: '"8", "8-12" или "max"; в timed и при time_sec — ""' },
    time_sec: { anyOf: [{ type: 'integer' }, { type: 'string', enum: ['max'] }], description: 'Секунды или "max"; при reps — 0' },
    weight_kg: { type: 'number', description: 'Только вместе с reps, иначе 0' },
    rest_sec: { type: 'integer', description: 'Отдых после каждого подхода: только в блоке sets, в остальных блоках 0' },
    sides: sidesSchema,
    notes: { type: 'string', description: 'Подсказка: в sets и circuit, в timed ""' },
  },
  ['exercise_id', 'sets', 'reps', 'time_sec', 'weight_kg', 'rest_sec', 'sides', 'notes'],
);

const routineItemSchema = obj(
  { exercise_id: { type: 'string', description: 'id упражнения из библиотеки или new_exercises' }, time_sec: { type: 'integer', description: 'На одну сторону, секунды' }, sides: sidesSchema },
  ['exercise_id', 'time_sec', 'sides'],
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
        {
          type: { type: 'string', enum: [...AGENT_BLOCK_TYPES] },
          title: str,
          rounds: { type: 'integer', description: 'Только в circuit, в остальных блоках 0' },
          rest_sec: { type: 'integer', description: 'Только в circuit: отдых после круга или после каждого упражнения (rest_after); в остальных блоках 0' },
          rest_after: { type: 'string', enum: [...AGENT_REST_AFTER], description: 'Только в circuit: exercise — отдых после каждого упражнения; иначе round' },
          text: { type: 'string', description: 'Только в timed и note, иначе ""' },
          exercises: { type: 'array', items: exerciseSchema, description: 'У note — []' },
        },
        ['type', 'title', 'rounds', 'rest_sec', 'rest_after', 'text', 'exercises'],
      ),
    },
    new_exercises: {
      type: 'array',
      items: obj(
        {
          id: { type: 'string', description: 'латиница, цифры, дефис' },
          name: str,
          muscles: strs,
          measure: { type: 'string', enum: [...AGENT_MEASURES] },
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
  ['title', 'notes', 'warmup', 'cooldown', 'blocks', 'new_exercises', 'advice'],
);

// ── Проверка ответа ──────────────────────────────────────
// Строгий режим гарантирует форму, но клиент может вернуть что угодно при сбое: сервер проверяет сам.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const optStr = (v: unknown) => v === undefined || typeof v === 'string';
const optNum = (v: unknown) => v === undefined || typeof v === 'number';
/** Непустой список: в схеме minItems: 1 */
const isNonEmpty = (v: unknown): v is unknown[] => Array.isArray(v) && v.length > 0;
const isStrs = (v: unknown) => Array.isArray(v) && v.every((s) => typeof s === 'string');
const optStrs = (v: unknown) => v === undefined || isStrs(v);
const BLOCK_TYPES = new Set<string>(AGENT_BLOCK_TYPES);
const REST_AFTER = new Set<string>(AGENT_REST_AFTER);
const MEASURES = new Set<string>(AGENT_MEASURES);

const isExercise = (e: unknown) =>
  isObj(e) && typeof e.exercise_id === 'string' && optNum(e.sets) && optStr(e.reps) && (optNum(e.time_sec) || e.time_sec === 'max') &&
  optNum(e.weight_kg) && optNum(e.rest_sec) && optStrs(e.sides) && optStr(e.notes);

/** Пустое значение необязательного поля: модель пишет его вместо того, чтобы опустить поле */
const isEmptyField = (v: unknown) => v === 0 || v === false || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && !v.trim());
/** Убирает пустые значения у перечисленных полей; keys не задан — у всех */
const dropEmpty = (o: Obj, keys?: readonly string[]): Obj => Object.fromEntries(Object.entries(o).filter(([k, v]) => !(isEmptyField(v) && (!keys || keys.includes(k)))));
/** Тот же dropEmpty у каждого объекта списка; не список и не объекты оставляет как есть */
const dropEmptyEach = (v: unknown, keys?: readonly string[]) => (Array.isArray(v) ? v.map((x) => (isObj(x) ? dropEmpty(x, keys) : x)) : v);

/**
 * Ответ модели к виду AgentWorkout: убирает пустые значения ("", 0, []) необязательных полей.
 * У упражнения блока в схеме обязательно всё, поэтому чистятся все его поля; у блока — всё, кроме type и
 * exercises (у note список пуст); у упражнения набора — только sides: time_sec обязателен и 0 разбор назовёт ошибкой.
 * Обязательные поля остальных объектов не трогаются. Чужую форму не исправляет — её отклонит isAgentWorkout.
 */
export function compactAgentWorkout(v: unknown): unknown {
  if (!isObj(v)) return v;
  const block = (b: unknown) => {
    if (!isObj(b)) return b;
    const out = dropEmpty(b, ['title', 'rounds', 'rest_sec', 'text']);
    if (out.rest_after === 'round') delete out.rest_after;
    return 'exercises' in out ? { ...out, exercises: dropEmptyEach(out.exercises) } : out;
  };
  const routine = (r: unknown) => {
    if (!isObj(r) || !isObj(r.new_routine) || !('exercises' in r.new_routine)) return r;
    return { ...r, new_routine: { ...r.new_routine, exercises: dropEmptyEach(r.new_routine.exercises, ['sides']) } };
  };
  const out = dropEmpty(v, ['notes']);
  if ('warmup' in out) out.warmup = routine(out.warmup);
  if ('cooldown' in out) out.cooldown = routine(out.cooldown);
  if ('blocks' in out) out.blocks = Array.isArray(out.blocks) ? out.blocks.map(block) : out.blocks;
  if ('new_exercises' in out) out.new_exercises = dropEmptyEach(out.new_exercises, ['notes']);
  if ('advice' in out) out.advice = dropEmptyEach(out.advice, ['exercise', 'suggest']);
  return out;
}

const isBlock = (b: unknown) =>
  isObj(b) && typeof b.type === 'string' && BLOCK_TYPES.has(b.type) && optStr(b.title) && optNum(b.rounds) && optNum(b.rest_sec) && (b.rest_after === undefined || (typeof b.rest_after === 'string' && REST_AFTER.has(b.rest_after))) && optStr(b.text) &&
  Array.isArray(b.exercises) && b.exercises.every(isExercise);

const isRoutineItem = (i: unknown) => isObj(i) && typeof i.exercise_id === 'string' && typeof i.time_sec === 'number' && optStrs(i.sides);

const isRoutine = (r: unknown) => {
  if (r === null) return true;
  if (!isObj(r)) return false;
  if ('routine' in r) return typeof r.routine === 'string';
  const n = r.new_routine;
  return isObj(n) && typeof n.id === 'string' && typeof n.title === 'string' && isNonEmpty(n.exercises) && n.exercises.every(isRoutineItem);
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
