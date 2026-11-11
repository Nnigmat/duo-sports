const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Число из набранной строки: запятая = точка, пустая строка и не-число дают null, результат проходит clamp. */
export function parseNumberInput(draft: string, clamp: (n: number) => number): number | null {
  const text = draft.trim().replace(',', '.');
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? clamp(round(n)) : null;
}
