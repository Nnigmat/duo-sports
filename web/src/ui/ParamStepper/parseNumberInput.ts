/** Число из набранной строки: запятая = точка, пустая строка и не-число (в том числе «1e3», «0x10») дают null, результат проходит clamp. */
export function parseNumberInput(draft: string, clamp: (n: number) => number): number | null {
  const text = draft.trim();
  if (!/^\d+([.,]\d+)?$/.test(text)) return null;
  return clamp(Number(text.replace(',', '.')));
}
