import type { SetPlan } from '../../../../../shared/types';
import type { Step } from './buildSteps';

const copyPlan = (p: SetPlan): SetPlan => ({ ...p, target: { ...p.target } });

/** Новый план для одного шага; исходный массив не меняется. */
export function updatePlan(steps: Step[], index: number, plan: SetPlan): Step[] {
  return steps.map((s, i) => (i === index ? { ...s, plan: copyPlan(plan) } : s));
}

/** «Применить к следующим кругам»: тот же план у шага и у всех следующих шагов того же упражнения. */
export function applyToFollowing(steps: Step[], index: number, plan: SetPlan): Step[] {
  const from = steps[index];
  return steps.map((s, i) =>
    i >= index && s.blockIndex === from.blockIndex && s.exerciseId === from.exerciseId
      ? { ...s, plan: copyPlan(plan) }
      : s,
  );
}
