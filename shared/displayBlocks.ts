import type { Block, CommitBlock, Exercise, Range } from './types';

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const span = (r: Range, fmt: (n: number) => string = String) => (r.min === r.max ? fmt(r.min) : `${fmt(r.min)}–${fmt(r.max)}`);

function valueText(e: Exercise, sets?: number, sides = false): string {
  const open = e.target.min === 0 && e.target.max === 0;
  const load =
    e.kind === 'time' ? (open ? 'макс.' : span(e.target, mmss)) : e.kind === 'weight' ? `${e.weight ?? 0} кг × ${open ? 'макс.' : span(e.target)}` : open ? 'макс. повт' : `${span(e.target)} повт`;
  const line = sides && e.sides ? `${load} на сторону` : load;
  return sets ? `${sets} × ${line}` : line;
}

/** Список для подсказок и карточки ученика (колонка blocks) собирается из структуры, чтобы они не расходились */
export function displayBlocks(blocks: Block[]): CommitBlock[] {
  return blocks.flatMap((b) => (b.mode === 'note' ? [] : [b])).map((b) => ({
    kind: b.mode === 'timed' && b.kind ? b.kind : 'exercises',
    heading: b.title,
    items: b.exercises.map((e) => ({ name: e.name, value: valueText(e, b.mode === 'sets' ? (e as { sets: number }).sets : undefined, b.mode !== 'timed') })),
  }));
}
