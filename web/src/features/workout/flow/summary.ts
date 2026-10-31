import type { Block } from '../../../../../shared/types';
import { formatPlan } from './format';
import { joinNumbers, plural } from './ru';

const ROUNDS: [string, string, string] = ['круг', 'круга', 'кругов'];
const SETS: [string, string, string] = ['подход', 'подхода', 'подходов'];
const EXERCISES: [string, string, string] = ['упражнение', 'упражнения', 'упражнений'];

/** «3 круга · 9 подходов»; разминка и заминка в подходы не входят. */
export function workoutMeta(blocks: Block[]): string {
  let rounds = 0;
  let sets = 0;
  let exercises = 0;
  for (const b of blocks) {
    exercises += b.exercises.length;
    if (b.mode === 'circuit') {
      rounds += b.rounds;
      sets += b.rounds * b.exercises.length;
    } else if (b.mode === 'sets') {
      sets += b.exercises.reduce((sum, e) => sum + e.sets, 0);
    }
  }
  if (sets === 0) return `${exercises} ${plural(exercises, EXERCISES)}`;
  const setsLabel = `${sets} ${plural(sets, SETS)}`;
  return rounds > 0 ? `${rounds} ${plural(rounds, ROUNDS)} · ${setsLabel}` : setsLabel;
}

/** «6 упражнений по 30 с»; «по» только если время у всех одинаковое. */
export function timedHeadline(block: Block): string {
  const n = block.exercises.length;
  const base = `${n} ${plural(n, EXERCISES)}`;
  const seconds = new Set(block.exercises.map((e) => e.target.max));
  return seconds.size === 1 ? `${base} по ${[...seconds][0]} с` : base;
}

export interface BlockItem {
  name: string;
  target: string;
}

/** Строки списка упражнений в карточке блока. В sets перед целью стоит число подходов. */
export function blockItems(block: Block): BlockItem[] {
  return block.exercises.map((e) => {
    const plan = formatPlan(e.kind, { target: e.target, weight: e.weight });
    return { name: e.name, target: block.mode === 'sets' && 'sets' in e ? `${e.sets} × ${plan}` : plan };
  });
}

export function restLabel(block: Block): string | undefined {
  if (block.mode === 'timed' || block.restSec <= 0) return undefined;
  return `Отдых ${block.restSec} с ${block.mode === 'circuit' ? 'после каждого подхода' : 'между подходами'}`;
}

/** «Круг 2 записываем на видео» */
export function videoLabel(block: Block): string | undefined {
  if (block.mode === 'timed' || block.videoRounds.length === 0) return undefined;
  const many = block.videoRounds.length > 1;
  const word = block.mode === 'circuit' ? (many ? 'Круги' : 'Круг') : many ? 'Подходы' : 'Подход';
  return `${word} ${joinNumbers(block.videoRounds)} записываем на видео`;
}
