import type { Block, Exercise, Pose, SetPlan } from '../../../../../shared/types';
import { needsRecording } from './record';

export interface Step {
  blockIndex: number;
  blockId: string;
  blockTitle: string;
  mode: Block['mode'];
  exerciseId: string;
  exerciseName: string;
  kind: Exercise['kind'];
  pose?: Pose;
  plan: SetPlan;
  /** круг (circuit) или номер подхода упражнения (sets); у timed всегда 1 */
  round: number;
  /** всего кругов или подходов этого упражнения */
  rounds: number;
  /** позиция шага внутри блока, с 1 */
  indexInBlock: number;
  blockSize: number;
  /** отдых после шага; 0 — без отдыха (в том числе после последнего шага блока) */
  restAfterSec: number;
  record: boolean;
  /** Сторона упражнения в две стороны (только timed) */
  side?: { index: 1 | 2; label: string };
  /** Что стояло в плане, если упражнение заменили по ходу тренировки */
  replaced?: { id: string; name: string };
}

type Draft = Omit<Step, 'indexInBlock' | 'blockSize' | 'restAfterSec'>;

function planOf(e: Exercise): SetPlan {
  const plan: SetPlan = { target: { ...e.target } };
  if (e.weight !== undefined) plan.weight = e.weight;
  return plan;
}

function draftsOf(block: Block, blockIndex: number): Draft[] {
  const make = (e: Exercise, round: number, rounds: number): Draft => ({
    blockIndex,
    blockId: block.id,
    blockTitle: block.title,
    mode: block.mode,
    exerciseId: e.id,
    exerciseName: e.name,
    kind: e.kind,
    pose: e.pose,
    plan: planOf(e),
    round,
    rounds,
    record: needsRecording(block, round),
  });

  switch (block.mode) {
    case 'timed':
      return block.exercises.flatMap((e) =>
        e.sides
          ? e.sides.map((label, i): Draft => ({ ...make(e, 1, 1), side: { index: i === 0 ? 1 : 2, label } }))
          : [make(e, 1, 1)],
      );
    case 'sets':
      return block.exercises.flatMap((e) =>
        Array.from({ length: e.sets }, (_, i) => make(e, i + 1, e.sets)),
      );
    case 'circuit':
      return Array.from({ length: block.rounds }, (_, r) =>
        block.exercises.map((e) => make(e, r + 1, block.rounds)),
      ).flat();
  }
}

/** Плоский список шагов тренировки из блоков. Отдых — свойство шага, не отдельный шаг. */
export function buildSteps(blocks: Block[]): Step[] {
  return blocks.flatMap((block, blockIndex) => {
    const drafts = draftsOf(block, blockIndex);
    const rest = block.mode === 'timed' ? 0 : block.restSec;
    // Перед заминкой отдых есть и после последнего шага: человек сам нажимает «Начать»
    const following = blocks[blockIndex + 1];
    const beforeCooldown = following?.mode === 'timed' && following.kind === 'cooldown';
    return drafts.map((d, i) => ({
      ...d,
      indexInBlock: i + 1,
      blockSize: drafts.length,
      restAfterSec: i < drafts.length - 1 || beforeCooldown ? rest : 0,
    }));
  });
}
