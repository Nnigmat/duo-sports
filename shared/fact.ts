import type { SetPlan } from './types';

export type FactLabel = 'Меньше плана' | 'В плане' | 'Больше плана';

/** Метка факта против плана: «В плане» внутри min–max включительно. «Макс.» (0–0) границ не имеет. */
export function factLabel(plan: SetPlan, value: number): FactLabel {
  const { min, max } = plan.target;
  if (min === 0 && max === 0) return 'В плане';
  if (value < min) return 'Меньше плана';
  if (value > max) return 'Больше плана';
  return 'В плане';
}
