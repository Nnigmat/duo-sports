import type { ExerciseKind, SetActual, SetPlan } from '../../../../../shared/types';

export { factLabel, type FactLabel } from '../../../../../shared/fact';

/** Что правит спортсмен в шторке результата */
export interface FactDraft {
  /** Повторы или секунды */
  value: number;
  /** Вес, кг: только у упражнения «вес × повторы» */
  weight?: number;
  extraWeight: boolean;
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
