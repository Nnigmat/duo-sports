/** Подписи самочувствия 1–5: индекс = оценка − 1 */
export const FEELING_LABELS = ['Плохо', 'Устал', 'Нормально', 'Хорошо', 'Отлично'] as const;

/** Подпись оценки; null, если оценки нет или она вне шкалы */
export function feelingLabel(feeling: number | null | undefined): string | null {
  return feeling != null && Number.isInteger(feeling) ? (FEELING_LABELS[feeling - 1] ?? null) : null;
}
