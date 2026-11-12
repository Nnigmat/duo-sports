import type { SessionStepResult, SetActual } from '../../../../../shared/types';
import type { Step } from './buildSteps';
import { formatElapsed } from './elapsed';
import type { StepTime } from './session';

export interface FinishStats {
  setsDone: number;
  setsTotal: number;
  videos: number;
}

/** Итоги тренировки. `completed[i]` — выполнен ли шаг i; разминка и заминка в подходы не входят. */
export function finishStats(steps: Step[], completed: boolean[], videos: number): FinishStats {
  const sets = steps.map((s, i) => ({ s, done: completed[i] })).filter(({ s }) => s.mode !== 'timed');
  return {
    setsDone: sets.filter((x) => x.done).length,
    setsTotal: sets.length,
    videos,
  };
}

/** Каждый подход тренировки с планом, фактом, отдыхом и отметкой, выполнен ли он. Факт уходит только у выполненных подходов. */
export function sessionSteps(
  steps: Step[],
  completed: boolean[],
  videoIds: Array<string | null> = [],
  restSec: Array<number | null> = [],
  actuals: Array<SetActual | null> = [],
  times: Array<StepTime | null> = [],
): SessionStepResult[] {
  return steps.map((s, i) => ({
    exerciseId: s.exerciseId,
    exerciseName: s.exerciseName,
    blockIndex: s.blockIndex,
    round: s.round,
    rounds: s.rounds,
    kind: s.kind,
    plan: s.plan,
    ...(s.replaced ? { replacedFrom: s.replaced.name } : {}),
    ...(completed[i] && actuals[i] ? { actual: actuals[i]! } : {}),
    completed: completed[i] ?? false,
    ...(videoIds[i] ? { videoId: videoIds[i]! } : {}),
    ...(restSec[i] != null ? { restSec: restSec[i]! } : {}),
    ...(completed[i] && times[i] ? { startedAt: times[i]!.startedAt, endedAt: times[i]!.endedAt } : {}),
  }));
}

export interface FinishStat {
  value: string;
  label: string;
}

/** «9 из 9 подходов», «12:34 общее время», «3 видео записано»; нулевые видео не показываем. */
export function formatFinishStats(stats: FinishStats, seconds: number): FinishStat[] {
  const out: FinishStat[] = [
    { value: `${stats.setsDone} из ${stats.setsTotal}`, label: 'подходов' },
    { value: formatElapsed(seconds), label: 'общее время' },
  ];
  if (stats.videos > 0) out.push({ value: String(stats.videos), label: 'видео записано' });
  return out;
}
