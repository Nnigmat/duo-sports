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
  /** Стороны упражнения в подходах и круге: шаг один, нагрузка «на сторону» (у timed вместо этого side) */
  sides?: [string, string];
  /** Заметка к упражнению: показывается под названием */
  note?: string;
  /** Шаг-заметка (mode 'note'): заголовок и текст блока. Не путать с `note` — заметкой упражнения. */
  noteStep?: { title: string; text: string };
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
    ...(e.note ? { note: e.note } : {}),
    ...(e.sides && block.mode !== 'timed' ? { sides: e.sides } : {}),
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
    case 'note':
      // Шаг-заметка не подход: упражнения нет, записи и отдыха нет; в exerciseName заголовок, чтобы любой список шагов был читаем
      return [
        {
          blockIndex,
          blockId: block.id,
          blockTitle: block.title,
          mode: 'note',
          exerciseId: block.id,
          exerciseName: block.title,
          kind: 'reps',
          plan: { target: { min: 0, max: 0 } },
          round: 1,
          rounds: 1,
          record: false,
          noteStep: { title: block.title, text: block.text },
        },
      ];
  }
}

/** Отдых после шага по правилам блока; последний шаг блока обрабатывает вызывающий. */
function restOf(block: Block, draft: Draft, index: number, count: number): number {
  switch (block.mode) {
    case 'sets':
      return block.exercises.find((e) => e.id === draft.exerciseId)?.restSec ?? block.restSec;
    case 'circuit': {
      // «после круга»: отдыхаем только после последнего упражнения круга
      const perRound = count / block.rounds;
      return block.restAfter === 'round' && (index + 1) % perRound !== 0 ? 0 : block.restSec;
    }
    default:
      // timed и note: отдыха нет
      return 0;
  }
}

/** Плоский список шагов тренировки из блоков. Отдых — свойство шага, не отдельный шаг. */
export function buildSteps(blocks: Block[]): Step[] {
  return blocks.flatMap((block, blockIndex) => {
    const drafts = draftsOf(block, blockIndex);
    // Перед заминкой отдых есть и после последнего шага: человек сам нажимает «Начать»
    const following = blocks[blockIndex + 1];
    const beforeCooldown = block.mode !== 'note' && following?.mode === 'timed' && following.kind === 'cooldown';
    return drafts.map((d, i) => ({
      ...d,
      indexInBlock: i + 1,
      blockSize: drafts.length,
      restAfterSec: i < drafts.length - 1 || beforeCooldown ? restOf(block, d, i, drafts.length) : 0,
    }));
  });
}
