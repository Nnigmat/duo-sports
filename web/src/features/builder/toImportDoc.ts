import { stringify } from 'yaml';
import { compactAgentWorkout, type AgentBlock, type AgentRoutine, type AgentWorkout } from '../../../../shared/aiDraft';

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

/** У блока note список упражнений пуст: схема требует поле, в YAML пустого списка нет. Непустой список остаётся — его отклонит разбор */
const blockOf = (b: AgentBlock) => {
  if (b.type !== 'note' || b.exercises.length) return b;
  const { exercises: _empty, ...rest } = b;
  return rest;
};

const linkOf = (type: 'warmup' | 'cooldown', r: AgentRoutine) => {
  if (!r) return [];
  return [{ type, routine: 'routine' in r ? r.routine : r.new_routine.id }];
};

/**
 * Ответ агента → текст импорта version: 2: одна тренировка на дату, новые упражнения и наборы — в своих разделах.
 * Пустые значения строгой схемы ("", 0, []) убирает compactAgentWorkout; непустые идут как есть, даже не на своём
 * месте: их ошибку разбора видит агент или тренер, а не теряет преобразование.
 * Порядок блоков и упражнений не меняется: путь ошибки разбора указывает на то же место в ответе агента.
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
