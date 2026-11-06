import type { SessionStepResult } from '../../../../../shared/types';
import type { Step } from './buildSteps';
import { plural } from './ru';

export interface FinishStats {
  setsDone: number;
  setsTotal: number;
  /** Круги круговых блоков; 0, если таких блоков нет */
  rounds: number;
  videos: number;
}

/** Итоги тренировки. `completed[i]` — выполнен ли шаг i; разминка и заминка в подходы не входят. */
export function finishStats(steps: Step[], completed: boolean[], videos: number): FinishStats {
  const sets = steps.map((s, i) => ({ s, done: completed[i] })).filter(({ s }) => s.mode !== 'timed');
  const circuitRounds = new Map<number, number>();
  for (const { s } of sets) if (s.mode === 'circuit') circuitRounds.set(s.blockIndex, s.rounds);
  return {
    setsDone: sets.filter((x) => x.done).length,
    setsTotal: sets.length,
    rounds: [...circuitRounds.values()].reduce((a, b) => a + b, 0),
    videos,
  };
}

/** Каждый подход тренировки с планом (после правок «Изменить») и отметкой, выполнен ли он */
export function sessionSteps(steps: Step[], completed: boolean[], videoIds: Array<string | null> = [], restSec: Array<number | null> = []): SessionStepResult[] {
  return steps.map((s, i) => ({
    exerciseId: s.exerciseId,
    exerciseName: s.exerciseName,
    blockIndex: s.blockIndex,
    round: s.round,
    rounds: s.rounds,
    kind: s.kind,
    plan: s.plan,
    completed: completed[i] ?? false,
    ...(videoIds[i] ? { videoId: videoIds[i]! } : {}),
    ...(restSec[i] != null ? { restSec: restSec[i]! } : {}),
  }));
}

export interface FinishStat {
  value: string;
  label: string;
}

/** «9 из 9 подходов», «3 круга», «3 видео записано»; нулевые круги и видео не показываем. */
export function formatFinishStats(stats: FinishStats): FinishStat[] {
  const out: FinishStat[] = [{ value: `${stats.setsDone} из ${stats.setsTotal}`, label: 'подходов' }];
  if (stats.rounds > 0) out.push({ value: String(stats.rounds), label: plural(stats.rounds, ['круг', 'круга', 'кругов']) });
  if (stats.videos > 0) out.push({ value: String(stats.videos), label: 'видео записано' });
  return out;
}
