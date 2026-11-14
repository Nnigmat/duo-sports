/** Ширина подписи даты («14 ноя») с запасом, px */
const LABEL_W = 52;
/** Доля ширины графика между первой и последней точкой: (326 − 2·16) / 326, как в chartGeometry */
const SPAN = 294 / 326;

/** Ширина кнопки-точки: 44 px, но не шире расстояния между соседними точками, чтобы зоны не перекрывались */
export function hitWidth(count: number, width: number): number {
  if (count <= 1) return 44;
  return Math.max(16, Math.min(44, Math.floor((width * SPAN) / (count - 1))));
}

/**
 * Какие подписи под точками показывать, чтобы они не наезжали друг на друга при данной ширине графика.
 * Берётся каждая k-я точка, считая от последней; выбранная видна всегда, соседи ближе подписи к ней скрыты.
 */
export function visibleLabels(count: number, selected: number, width: number): boolean[] {
  if (count <= 1) return Array.from({ length: count }, () => true);
  const gap = (width * SPAN) / (count - 1);
  const step = Math.max(1, Math.ceil(LABEL_W / gap));
  return Array.from({ length: count }, (_, i) => {
    if (i === selected) return true;
    if (Math.abs(i - selected) * gap < LABEL_W) return false;
    return (count - 1 - i) % step === 0;
  });
}
