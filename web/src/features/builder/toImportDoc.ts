import { stringify } from 'yaml';
import type { AgentRoutine, AgentWorkout } from '../../../../shared/aiDraft';

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

const linkOf = (type: 'warmup' | 'cooldown', r: AgentRoutine) => {
  if (!r) return [];
  return [{ type, routine: 'routine' in r ? r.routine : r.new_routine.id }];
};

/**
 * Ответ агента → текст импорта: одна тренировка на дату, новые упражнения и наборы — в своих разделах.
 * Через yaml.stringify, чтобы parseImport давал осмысленные номера строк и спецсимволы не ломали разбор.
 */
export function agentToImportYaml(w: AgentWorkout, date: string): string {
  const routines = [w.warmup, w.cooldown].flatMap((r) => (r && 'new_routine' in r ? [r.new_routine] : []));
  const doc = clean({
    version: 1,
    ...(w.new_exercises.length ? { exercises: w.new_exercises } : {}),
    ...(routines.length ? { routines } : {}),
    workouts: [
      {
        title: w.title,
        date,
        notes: w.notes,
        blocks: [...linkOf('warmup', w.warmup), ...w.blocks, ...linkOf('cooldown', w.cooldown)],
      },
    ],
  });
  return stringify(doc, { lineWidth: 0 });
}
