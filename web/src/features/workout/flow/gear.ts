import type { Block } from '../../../../../shared/types';

/** Снаряды, которые берут с конкретным весом; у остальных (скамья, коврик, тренажёр) вес в списке не нужен */
const WEIGHTED = new Set(['Штанга', 'Гантель', '2 гантели', 'Гиря']);

const decimal = (n: number) => String(n).replace('.', ',');

/**
 * Что взять до начала тренировки: инвентарь упражнений всех блоков без повторов, в порядке появления.
 * У снарядов с весом он дописывается («2 гантели 8 кг»); разные веса одного снаряда — отдельные строки по возрастанию.
 * `equipment` — инвентарь по id упражнения (из библиотеки).
 */
export function gearList(blocks: Block[], equipment: Record<string, string[]>): string[] {
  const order: string[] = [];
  const weights = new Map<string, Set<number>>();
  for (const block of blocks) {
    for (const ex of block.exercises) {
      for (const name of equipment[ex.id] ?? []) {
        if (!weights.has(name)) {
          weights.set(name, new Set());
          order.push(name);
        }
        if (WEIGHTED.has(name) && ex.weight) weights.get(name)!.add(ex.weight);
      }
    }
  }
  return order.flatMap((name) => {
    const w = [...weights.get(name)!].sort((a, b) => a - b);
    return w.length ? w.map((kg) => `${name} ${decimal(kg)} кг`) : [name];
  });
}
