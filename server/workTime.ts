import type { SessionStepResult } from '../shared/types';

export interface WorkTimeStats {
  sets: number;
  restSec: number;
  /** Всё, что не отдых: подходы, шторки результата, переходы, разминка и заминка */
  activeSec: number;
  /** Среднее активное время на выполненный подход, секунды */
  perSetSec: number;
  /** Сумма времени подходов по меткам; null, если меток нет (старый итог) */
  setsSec: number | null;
  /** Время между подходами и отдыхом: шторки результата, переходы, паузы; null, если меток нет */
  gapSec: number | null;
}

/**
 * Время тренировки без отдыха, из того, что уже лежит в итоге: длительность всей тренировки минус фактический отдых.
 * Меток начала и конца отдельного подхода у старых итогов нет, поэтому разложить по упражнениям нельзя, только среднее на подход.
 * Нет длительности или выполненных подходов — null.
 */
export function workTimeStats(durationSec: number | null, steps: Pick<SessionStepResult, 'completed' | 'restSec' | 'startedAt' | 'endedAt'>[]): WorkTimeStats | null {
  const sets = steps.filter((s) => s.completed).length;
  if (!durationSec || durationSec <= 0 || sets === 0) return null;
  const restSec = steps.reduce((n, s) => n + (s.restSec ?? 0), 0);
  const activeSec = Math.max(0, durationSec - restSec);
  const marked = steps.filter((s) => s.completed && s.startedAt !== undefined && s.endedAt !== undefined);
  const setsSec = marked.length === sets ? Math.round(marked.reduce((n, s) => n + (s.endedAt! - s.startedAt!), 0) / 1000) : null;
  return { sets, restSec, activeSec, perSetSec: Math.round(activeSec / sets), setsSec, gapSec: setsSec === null ? null : Math.max(0, activeSec - setsSec) };
}
