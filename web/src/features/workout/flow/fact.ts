import type { ExerciseKind, SetActual, SetPlan } from '../../../../../shared/types';

export type FactLabel = 'Меньше плана' | 'В плане' | 'Больше плана';

/** Что правит спортсмен в шторке результата */
export interface FactDraft {
  /** Повторы или секунды */
  value: number;
  /** Вес, кг: только у упражнения «вес × повторы» */
  weight?: number;
  extraWeight: boolean;
}

/** Метка факта против плана: «В плане» внутри min–max включительно. «Макс.» (0–0) границ не имеет. */
export function factLabel(plan: SetPlan, value: number): FactLabel {
  const { min, max } = plan.target;
  if (min === 0 && max === 0) return 'В плане';
  if (value < min) return 'Меньше плана';
  if (value > max) return 'Больше плана';
  return 'В плане';
}

/** Исходное значение шторки: уже введённый факт, а без него верх диапазона плана. План не меняется. */
export function factDraft(kind: ExerciseKind, plan: SetPlan, actual?: SetActual | null): FactDraft {
  const draft: FactDraft = { value: actual?.value ?? plan.target.max, extraWeight: actual?.extraWeight === true };
  return kind === 'weight' ? { ...draft, weight: actual?.weight ?? plan.weight ?? 0 } : draft;
}

/** Факт для сохранения: «доп. вес» только когда отмечен */
export function factFromDraft(draft: FactDraft): SetActual {
  const actual: SetActual = { value: draft.value };
  if (draft.weight !== undefined) actual.weight = draft.weight;
  if (draft.extraWeight) actual.extraWeight = true;
  return actual;
}
