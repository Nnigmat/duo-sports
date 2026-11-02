import type { ReviewNotice } from '../shared/types';
import type { Db } from './db';

type Clock = () => Date;
const now: Clock = () => new Date();

/** Пока единственный вид: «Тренер разобрал тренировку»; sessionId — какая именно */
export function notifyReview(db: Db, athleteId: number, sessionId: number, clock: Clock = now) {
  db.prepare("INSERT INTO notifications (user_id, kind, session_id, created_at) VALUES (?, 'review', ?, ?)").run(athleteId, sessionId, clock().toISOString());
}

/** Сколько уведомлений ещё не открыто: точка на колокольчике */
export function unreadCount(db: Db, userId: number): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(userId) as { n: number }).n;
}

/** Открытие разбора гасит точку; карточка остаётся. false — чужого или несуществующего уведомления нет. */
export function markNotificationRead(db: Db, userId: number, id: number, clock: Clock = now): boolean {
  return db.prepare('UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?').run(clock().toISOString(), id, userId).changes === 1;
}

/** «Скрыть» на карточке: убирает её и точку. false — чужого или несуществующего уведомления нет. */
export function dismissNotification(db: Db, userId: number, id: number, clock: Clock = now): boolean {
  const at = clock().toISOString();
  return db.prepare('UPDATE notifications SET dismissed_at = COALESCE(dismissed_at, ?), read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?').run(at, at, id, userId).changes === 1;
}

/** Карточка последнего нескрытого разбора для «Сегодня»; null, если показывать нечего */
export function reviewNoticeOf(db: Db, athleteId: number): ReviewNotice | null {
  const n = db
    .prepare(
      `SELECT n.id, n.session_id, s.title, r.reviewed_at FROM notifications n
       JOIN sessions_done s ON s.id = n.session_id JOIN reviews r ON r.session_id = n.session_id
       WHERE n.user_id = ? AND n.kind = 'review' AND n.dismissed_at IS NULL
       ORDER BY r.reviewed_at DESC, n.id DESC LIMIT 1`,
    )
    .get(athleteId) as { id: number; session_id: number; title: string; reviewed_at: string } | undefined;
  if (!n) return null;
  const counts = db
    .prepare("SELECT COUNT(*) AS total, COALESCE(SUM(video_id IS NOT NULL), 0) AS video FROM comments WHERE session_id = ? AND author_id <> athlete_id")
    .get(n.session_id) as { total: number; video: number };
  const last = db
    .prepare("SELECT exercise_name, timecode_sec, text FROM comments WHERE session_id = ? AND author_id <> athlete_id ORDER BY video_id IS NULL, created_at DESC, id DESC LIMIT 1")
    .get(n.session_id) as { exercise_name: string; timecode_sec: number | null; text: string } | undefined;
  return {
    notificationId: n.id,
    sessionId: n.session_id,
    title: n.title,
    reviewedAt: n.reviewed_at,
    commentCount: counts.total,
    videoCommentCount: counts.video,
    preview: last ? { exerciseName: last.exercise_name, timecodeSec: last.timecode_sec, text: last.text } : null,
  };
}
