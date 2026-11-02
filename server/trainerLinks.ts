import type { Role } from '../shared/types';
import type { Db } from './db';

export type LinkResult = { ok: true } | { ok: false; error: 'not_found' | 'not_trainer' | 'not_athlete' };

const roleOf = (db: Db, id: number) => (db.prepare('SELECT role FROM users WHERE id = ?').get(id) as { role: Role } | undefined)?.role;

/** Связывает тренера (trainer или admin) со спортсменом. Повторный вызов ничего не меняет. */
export function linkAthlete(db: Db, trainerId: number, athleteId: number): LinkResult {
  const t = roleOf(db, trainerId);
  const a = roleOf(db, athleteId);
  if (!t || !a) return { ok: false, error: 'not_found' };
  if (t !== 'trainer') return { ok: false, error: 'not_trainer' };
  if (a !== 'athlete') return { ok: false, error: 'not_athlete' };
  db.prepare('INSERT OR IGNORE INTO trainer_athletes (trainer_id, athlete_id) VALUES (?, ?)').run(trainerId, athleteId);
  return { ok: true };
}

export function unlinkAthlete(db: Db, trainerId: number, athleteId: number) {
  db.prepare('DELETE FROM trainer_athletes WHERE trainer_id = ? AND athlete_id = ?').run(trainerId, athleteId);
}

/** id спортсменов тренера, по порядку добавления */
export function athletesOf(db: Db, trainerId: number): number[] {
  const rows = db.prepare('SELECT athlete_id FROM trainer_athletes WHERE trainer_id = ? ORDER BY rowid').all(trainerId) as Array<{ athlete_id: number }>;
  return rows.map((r) => r.athlete_id);
}

/** Спортсмен видит себя, тренер своих учеников, админ всех */
export function canAccessAthlete(db: Db, viewer: { id: number; role: Role }, athleteId: number): boolean {
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'athlete') return viewer.id === athleteId;
  return !!db.prepare('SELECT 1 FROM trainer_athletes WHERE trainer_id = ? AND athlete_id = ?').get(viewer.id, athleteId);
}
