import type { Block, CommitBlock, Exercise, Range, Workout } from '../shared/types';
import { canAccessAthlete } from './trainerLinks';
import type { Db } from './db';
import type { Role } from '../shared/types';
import { LIMITS, checkStructure } from './imports';

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const span = (r: Range, fmt: (n: number) => string = String) => (r.min === r.max ? fmt(r.min) : `${fmt(r.min)}–${fmt(r.max)}`);

function valueText(e: Exercise, sets?: number): string {
  const open = e.target.min === 0 && e.target.max === 0;
  const load =
    e.kind === 'time' ? span(e.target, mmss) : e.kind === 'weight' ? `${e.weight ?? 0} кг × ${open ? 'макс.' : span(e.target)}` : open ? 'макс. повт' : `${span(e.target)} повт`;
  return sets ? `${sets} × ${load}` : load;
}

/** Список для подсказок и карточки ученика (колонка blocks) собирается из структуры, чтобы они не расходились */
export function displayBlocks(blocks: Block[]): CommitBlock[] {
  return blocks.map((b) => ({
    kind: b.mode === 'timed' && b.kind ? b.kind : 'exercises',
    heading: b.title,
    items: b.exercises.map((e) => ({ name: e.name, value: valueText(e, b.mode === 'sets' ? (e as { sets: number }).sets : undefined) })),
  }));
}

export type EditResult = { ok: true; workout: Workout } | { ok: false; error: 'not_found' | 'forbidden' | 'bad_request' };

/** Тренер меняет состав тренировки ученика, спортсмен — свою (actor.id === athleteId). Тренировка общая для всех дней плана, где она стоит; выполненные занятия не меняются. */
export function updateWorkout(db: Db, actor: { id: number; role: Role }, athleteId: number, workoutId: number, body: unknown): EditResult {
  if (actor.id !== athleteId && !canAccessAthlete(db, actor, athleteId)) return { ok: false, error: 'forbidden' };
  const row = db.prepare('SELECT 1 FROM workouts WHERE id = ? AND user_id = ? AND structure IS NOT NULL').get(workoutId, athleteId);
  if (!row) return { ok: false, error: 'not_found' };
  const b = body as { title?: unknown; blocks?: unknown } | null;
  const title = typeof b?.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > LIMITS.name || !checkStructure(b?.blocks)) return { ok: false, error: 'bad_request' };
  const blocks = b!.blocks as Block[];
  db.prepare('UPDATE workouts SET title = ?, blocks = ?, structure = ? WHERE id = ?').run(title, JSON.stringify(displayBlocks(blocks)), JSON.stringify(blocks), workoutId);
  return { ok: true, workout: { id: String(workoutId), title, blocks } };
}
