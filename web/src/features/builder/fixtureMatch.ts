import type { BuilderDraft } from './types';

/** Нормализация: нижний регистр, ё = е */
const norm = (s: string) => s.toLowerCase().replaceAll('ё', 'е');

export interface Item {
  name: string;
  re: RegExp;
}

export const item = (name: string, re: RegExp): Item => ({ name, re });

/** Пункты запроса тренера (ноябрь 2026); \b не используем: в JS он не работает с кириллицей */
export const MAIN_ITEMS: Item[] = [
  item('лицевая тяга', /лицев/),
  item('Y-T-W', /y-?t-?w/),
  item('отжимания', /отжим/),
  item('вис', /^вис|[^а-я]вис(?!е)/),
  item('чистые подтягивания', /подтяг(?!.*резин)/),
  item('подтягивания с резинкой', /подтяг.*резин/),
  item('подъём коленей в висе', /колен.*вис/),
  item('медленное опускание', /опускан/),
  item('тест пальца', /пал[ье]ц/),
  item('сгибание с гантелью', /сгибан/),
  item('мёртвая тяга', /м[её]ртв/),
  item('подъём ног на столе', /подъ[её]м ног/),
];
export const WARMUP_ITEMS: Item[] = [
  item('мобилизация запястья', /запяст/),
  item('открытая книга', /книг/),
  item('поза 90/90', /90\/90/),
  item('глубокий присед', /присед/),
  item('подъём колена с резинкой', /колен/),
];
export const COOLDOWN_ITEMS: Item[] = [item('трапеция', /трапец/), item('грудной отдел на ролле', /грудн/)];

/**
 * Пункты, которым не нашлось упражнения. Один к одному: упражнение закрывает не больше одного пункта;
 * пункты берутся жадно, начиная с самых узких шаблонов (меньше всего подходящих названий).
 */
export function unmatched(items: Item[], names: string[]): string[] {
  const pool = names.map(norm);
  const used = new Set<number>();
  const hits = (it: Item) => pool.flatMap((n, i) => (it.re.test(n) ? [i] : []));
  const order = items.map((it) => ({ it, count: hits(it).length })).sort((a, b) => a.count - b.count);
  const missing: string[] = [];
  for (const { it } of order) {
    const free = hits(it).find((i) => !used.has(i));
    if (free === undefined) missing.push(it.name);
    else used.add(free);
  }
  return missing;
}

/** Названия по частям: подписи сторон не входят */
export function partNames(draft: BuilderDraft) {
  const main = draft.blocks.flatMap((b) => (b.mode === 'note' ? [b.title] : b.exercises.map((e) => e.name)));
  const warmup = [...(draft.warmup.kind === 'new' ? draft.warmup.items.map((i) => i.name) : []), ...draft.advice.map((a) => a.text)];
  const cooldown = draft.cooldown.kind === 'new' ? draft.cooldown.items.map((i) => i.name) : [];
  return { main, warmup, cooldown };
}

/** Что из запроса тренера пропало в черновике; пусто — всё на месте */
export function lost(draft: BuilderDraft): string[] {
  const p = partNames(draft);
  return [
    ...unmatched(MAIN_ITEMS, p.main).map((n) => `основная: ${n}`),
    ...unmatched(WARMUP_ITEMS, p.warmup).map((n) => `разминка: ${n}`),
    ...unmatched(COOLDOWN_ITEMS, p.cooldown).map((n) => `заминка: ${n}`),
  ];
}
