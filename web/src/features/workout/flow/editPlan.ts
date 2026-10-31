import type { SetPlan } from '../../../../../shared/types';
import type { Step } from './buildSteps';
import { joinNumbers } from './ru';

/** То, что правит спортсмен в «Изменить»: число (повторы или секунды) и вес. */
export interface EditDraft {
  value: number;
  weight?: number;
}

export function draftFromPlan(plan: SetPlan): EditDraft {
  return { value: plan.target.min, weight: plan.weight };
}

/** Если число не трогали, диапазон цели («18–20») остаётся; иначе цель — одно число. */
export function planFromDraft(original: SetPlan, draft: EditDraft): SetPlan {
  const target =
    draft.value === original.target.min ? { ...original.target } : { min: draft.value, max: draft.value };
  return draft.weight === undefined ? { target } : { target, weight: draft.weight };
}

/** Номера (в блоке) следующих подходов того же упражнения: что заденет «Применить к следующим». */
export function followingNumbers(steps: Step[], index: number): number[] {
  const from = steps[index];
  return steps
    .filter((s, i) => i > index && s.blockIndex === from.blockIndex && s.exerciseId === from.exerciseId)
    .map((s) => s.indexInBlock);
}

/** «Подходы 4 и 7»; undefined, если применять не к чему. */
export function formatFollowing(numbers: number[]): string | undefined {
  if (numbers.length === 0) return undefined;
  return `${numbers.length === 1 ? 'Подход' : 'Подходы'} ${joinNumbers(numbers)}`;
}

export function applyLabel(step: Step): string {
  return step.mode === 'circuit' ? 'Применить к следующим кругам' : 'Применить к следующим подходам';
}
