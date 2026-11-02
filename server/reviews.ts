import type { Role } from '../shared/types';
import type { Db } from './db';
import { notifyReview } from './notifications';
import { canAccessAthlete } from './trainerLinks';

type Clock = () => Date;
const now: Clock = () => new Date();

export type Review = { status: 'pending' } | { status: 'reviewed'; reviewedAt: string; reviewerId: number };

/** Разобрана ли тренировка: записи в reviews нет — ждёт разбора */
export function reviewOf(db: Db, sessionId: number): Review {
  const r = db.prepare('SELECT reviewed_at, reviewer_id FROM reviews WHERE session_id = ?').get(sessionId) as { reviewed_at: string; reviewer_id: number } | undefined;
  return r ? { status: 'reviewed', reviewedAt: r.reviewed_at, reviewerId: r.reviewer_id } : { status: 'pending' };
}

export type ReviewResult = { ok: true } | { ok: false; error: 'not_found' | 'forbidden' };

/** «Отметить тренировку разобранной»: тренер ученика или админ. Повтор ничего не меняет, время остаётся первым. */
export function markReviewed(db: Db, reviewer: { id: number; role: Role }, sessionId: number, clock: Clock = now): ReviewResult {
  const s = db.prepare('SELECT user_id FROM sessions_done WHERE id = ?').get(sessionId) as { user_id: number } | undefined;
  if (!s) return { ok: false, error: 'not_found' };
  if (reviewer.role === 'athlete' || !canAccessAthlete(db, reviewer, s.user_id)) return { ok: false, error: 'forbidden' };
  // Уведомляем только при первой отметке, иначе повтор шлёт спортсмену второе уведомление
  db.transaction(() => {
    const inserted = db.prepare('INSERT OR IGNORE INTO reviews (session_id, reviewer_id, reviewed_at) VALUES (?, ?, ?)').run(sessionId, reviewer.id, clock().toISOString()).changes;
    if (inserted === 1) notifyReview(db, s.user_id, sessionId, clock);
  })();
  return { ok: true };
}

/** id тренировок спортсмена без разбора, свежие первыми */
export function sessionsAwaitingReview(db: Db, athleteId: number): number[] {
  const rows = db
    .prepare('SELECT s.id FROM sessions_done s LEFT JOIN reviews r ON r.session_id = s.id WHERE s.user_id = ? AND r.session_id IS NULL ORDER BY s.date DESC, s.id DESC')
    .all(athleteId) as Array<{ id: number }>;
  return rows.map((r) => r.id);
}
