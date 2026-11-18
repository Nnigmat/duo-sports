import { displayBlocks } from '../shared/displayBlocks';
import type { Block, Workout } from '../shared/types';
import { canAccessAthlete } from './trainerLinks';
import type { Db } from './db';
import type { Role } from '../shared/types';
import { LIMITS, checkStructure } from './imports';
import type { RoutineLinks } from './routines';
import { workoutOf } from './workouts';

/** Новая ссылка на набор: id строки routines, null — нет ссылки, 'bad' — такого набора этого вида нет */
function linkOf(db: Db, kind: 'warmup' | 'cooldown', sent: unknown, current: number | null): number | null | 'bad' {
  if (sent === undefined) return current;
  if (sent === null) return null;
  if (typeof sent !== 'string') return 'bad';
  const r = db.prepare('SELECT id FROM routines WHERE slug = ? AND kind = ?').get(sent, kind) as { id: number } | undefined;
  return r ? r.id : 'bad';
}

export type EditResult = { ok: true; workout: Workout } | { ok: false; error: 'not_found' | 'forbidden' | 'bad_request' };

/** Тренер меняет состав тренировки ученика, спортсмен — свою (actor.id === athleteId). Тренировка общая для всех дней плана, где она стоит; выполненные занятия не меняются. */
export function updateWorkout(db: Db, actor: { id: number; role: Role }, athleteId: number, workoutId: number, body: unknown): EditResult {
  if (actor.id !== athleteId && !canAccessAthlete(db, actor, athleteId)) return { ok: false, error: 'forbidden' };
  const row = db.prepare('SELECT notes, warmup_routine_id, cooldown_routine_id FROM workouts WHERE id = ? AND user_id = ? AND structure IS NOT NULL').get(workoutId, athleteId) as (RoutineLinks & { notes: string | null }) | undefined;
  if (!row) return { ok: false, error: 'not_found' };
  const b = body as { title?: unknown; blocks?: unknown; warmupRoutine?: unknown; cooldownRoutine?: unknown; notes?: unknown } | null;
  const title = typeof b?.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > LIMITS.name || !checkStructure(b?.blocks)) return { ok: false, error: 'bad_request' };
  // Заметка: не прислали — прежняя; пустая строка — очистить
  if (b?.notes !== undefined && !(typeof b.notes === 'string' && b.notes.length <= LIMITS.text)) return { ok: false, error: 'bad_request' };
  // Не прислали — ссылка прежняя; null — снять; slug — подключить набор нужного вида
  const warmup = linkOf(db, 'warmup', b?.warmupRoutine, row.warmup_routine_id);
  const cooldown = linkOf(db, 'cooldown', b?.cooldownRoutine, row.cooldown_routine_id);
  if (warmup === 'bad' || cooldown === 'bad') return { ok: false, error: 'bad_request' };
  // Разминка и заминка по ссылке в structure не запекаются: клиент мог прислать собранную структуру целиком
  const blocks = (b!.blocks as Block[]).filter((x) => !(x.mode === 'timed' && ((x.kind === 'warmup' && warmup !== null) || (x.kind === 'cooldown' && cooldown !== null))));
  if (blocks.length === 0) return { ok: false, error: 'bad_request' };
  const notes = b?.notes === undefined ? row.notes : (b.notes as string).trim();
  db.prepare('UPDATE workouts SET title = ?, blocks = ?, structure = ?, notes = ?, warmup_routine_id = ?, cooldown_routine_id = ? WHERE id = ?').run(
    title,
    JSON.stringify(displayBlocks(blocks)),
    JSON.stringify(blocks),
    notes || null,
    warmup,
    cooldown,
    workoutId,
  );
  return { ok: true, workout: workoutOf(db, athleteId, workoutId)! };
}
