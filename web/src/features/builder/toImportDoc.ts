import { stringify } from 'yaml';
import { compactAgentWorkout, type AgentBlock, type AgentExercise, type AgentRoutine, type AgentWorkout } from '../../../../shared/aiDraft';
import { BLOCK_FIELDS, EXERCISE_FIELDS, TIMED_FIELDS } from '../import/v2';

/** Убирает null и undefined на любой глубине: в документе импорта их не бывает */
function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (x !== null && x !== undefined) out[k] = clean(x);
    return out as T;
  }
  return v;
}

const pick = (o: object, keys: readonly string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => keys.includes(k)));

/** Поля упражнения по типу блока: в circuit подходы задаёт rounds, отдых — у блока; в timed — только время */
const EXERCISE_FIELDS_OF: Record<AgentBlock['type'], readonly string[]> = {
  sets: EXERCISE_FIELDS,
  circuit: EXERCISE_FIELDS.filter((k) => k !== 'sets' && k !== 'rest_sec'),
  timed: TIMED_FIELDS,
  note: [],
};

/**
 * Блок агента → блок v2: строгая схема требует все поля у каждого блока, в YAML идут только поля его типа.
 * Порядок блоков и упражнений не меняется: путь ошибки разбора указывает на то же место в ответе агента.
 */
const blockOf = (b: AgentBlock) => {
  const out = pick(b, BLOCK_FIELDS[b.type]);
  return 'exercises' in out ? { ...out, exercises: b.exercises.map((e: AgentExercise) => pick(e, EXERCISE_FIELDS_OF[b.type])) } : out;
};

const linkOf = (type: 'warmup' | 'cooldown', r: AgentRoutine) => {
  if (!r) return [];
  return [{ type, routine: 'routine' in r ? r.routine : r.new_routine.id }];
};

/**
 * Ответ агента → текст импорта version: 2: одна тренировка на дату, новые упражнения и наборы — в своих разделах.
 * Пустые значения строгой схемы сначала убирает compactAgentWorkout.
 * Через yaml.stringify, чтобы parseImport давал осмысленные номера строк и спецсимволы не ломали разбор.
 */
export function agentToImportYaml(agent: AgentWorkout, date: string): string {
  const w = compactAgentWorkout(agent) as AgentWorkout;
  const routines = [w.warmup, w.cooldown].flatMap((r) => (r && 'new_routine' in r ? [r.new_routine] : []));
  const doc = clean({
    version: 2,
    ...(w.new_exercises.length ? { exercises: w.new_exercises } : {}),
    ...(routines.length ? { routines } : {}),
    workouts: [
      {
        title: w.title,
        date,
        notes: w.notes,
        blocks: [...linkOf('warmup', w.warmup), ...w.blocks.map(blockOf), ...linkOf('cooldown', w.cooldown)],
      },
    ],
  });
  return stringify(doc, { lineWidth: 0 });
}
