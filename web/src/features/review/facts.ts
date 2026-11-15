import type { ReviewSet } from '../../../../shared/types';

type FactMark = NonNullable<ReviewSet['factMark']>;

/** Короткая метка факта и состояние для рамки чипа */
export const FACT_MARK: Record<FactMark, { state: 'below' | 'within' | 'above'; text: string }> = {
  'Меньше плана': { state: 'below', text: 'Меньше' },
  'В плане': { state: 'within', text: 'В плане' },
  'Больше плана': { state: 'above', text: 'Больше' },
};

/**
 * Подписи плеера: с фактом «Подход 4 · сделано 85 кг × 7» и мелкой строкой «план 80 кг × 5 · Больше»;
 * без факта «Подход 4 · 80 кг × 5». plan не передан — строки плана нет.
 */
export function videoCaptions(head: string, plan: string | undefined, actualLabel?: string, factMark?: FactMark): { subtitle: string; note?: string } {
  if (!actualLabel) return { subtitle: plan ? `${head} · ${plan}` : head };
  const mark = factMark ? ` · ${FACT_MARK[factMark].text}` : '';
  return { subtitle: `${head} · сделано ${actualLabel}`, note: plan ? `план ${plan}${mark}` : undefined };
}
