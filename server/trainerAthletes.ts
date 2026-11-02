import type { AthleteListResponse, AthleteRow, AthleteSessionsResponse, AthleteStatus, CommitBlock, ExerciseCommentItem, Role, SessionStepResult, TrainerHistoryItem, TrainerPlanItem } from '../shared/types';
import { libraryIndex, libraryOf } from './comments';
import type { Db } from './db';
import { planOf } from './plan';
import { AWAITING_DAYS } from './sessionReview';
import { addDays, doneSets, sessionVolume, userNameOf } from './today';
import { canAccessAthlete } from './trainerLinks';

type Viewer = { id: number; role: Role };
export type AthleteFilter = 'all' | AthleteStatus;

/** Дней без тренировок, после которых ученик считается «пропадающим» */
export const INACTIVE_DAYS = 7;
export const MAX_GOAL_LENGTH = 80;

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const RANK: Record<AthleteStatus, number> = { review: 0, inactive: 1, ok: 2 };

/** id учеников, которых зритель видит: тренер своих, админ всех, ученик — никого */
export function visibleAthleteIds(db: Db, viewer: Viewer): number[] | null {
  if (viewer.role === 'athlete') return null;
  const sql = viewer.role === 'admin' ? "SELECT id FROM users WHERE role = 'athlete' ORDER BY id" : 'SELECT athlete_id AS id FROM trainer_athletes WHERE trainer_id = ? ORDER BY rowid';
  return (viewer.role === 'admin' ? db.prepare(sql).all() : db.prepare(sql).all(viewer.id)).map((r) => (r as { id: number }).id);
}

function rowOf(db: Db, id: number, today: string): AthleteRow | null {
  const u = db.prepare('SELECT email, goal, created_at FROM users WHERE id = ?').get(id) as { email: string; goal: string | null; created_at: string } | undefined;
  if (!u) return null;
  const last = db.prepare('SELECT date, title FROM sessions_done WHERE user_id = ? AND date <= ? ORDER BY date DESC, id DESC LIMIT 1').get(id, today) as { date: string; title: string } | undefined;
  const from7 = addDays(today, -6);
  const done7 = (db.prepare('SELECT COUNT(*) AS n FROM sessions_done WHERE user_id = ? AND date BETWEEN ? AND ?').get(id, from7, today) as { n: number }).n;
  const planned = (db.prepare('SELECT COUNT(*) AS n FROM plan_entries WHERE user_id = ? AND date BETWEEN ? AND ?').get(id, from7, today) as { n: number }).n;
  // Ждёт разбора: неразобранная тренировка последних двух недель, где есть видео или что-то написал сам ученик
  const waiting = db
    .prepare(
      `SELECT COUNT(*) AS sessions, COALESCE(SUM((SELECT COUNT(*) FROM videos v WHERE v.session_id = s.id)), 0) AS videos FROM sessions_done s
       WHERE s.user_id = ? AND s.date >= ? AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.session_id = s.id)
         AND (EXISTS (SELECT 1 FROM videos v WHERE v.session_id = s.id) OR EXISTS (SELECT 1 FROM comments c WHERE c.session_id = s.id AND c.author_id = s.user_id))`,
    )
    .get(id, addDays(today, -AWAITING_DAYS)) as { sessions: number; videos: number };
  const daysSinceLast = last ? days(last.date, today) : null;
  const idleDays = daysSinceLast ?? days(u.created_at.slice(0, 10), today);
  const status: AthleteStatus = waiting.sessions > 0 ? 'review' : idleDays >= INACTIVE_DAYS ? 'inactive' : 'ok';
  return {
    id,
    name: userNameOf(u.email),
    email: u.email,
    goal: u.goal,
    lastSession: last ?? null,
    done7,
    planned7: Math.max(planned, done7),
    status,
    waitingSessions: waiting.sessions,
    waitingVideos: waiting.videos,
    daysSinceLast,
  };
}

export type ListResult = { ok: true; list: AthleteListResponse } | { ok: false; error: 'forbidden' };

/** Ученики тренера со статусами; фильтр и поиск (по имени и почте) применяются после подсчёта счётчиков */
export function listAthletes(db: Db, viewer: Viewer, opts: { today: string; filter?: AthleteFilter; q?: string }): ListResult {
  const ids = visibleAthleteIds(db, viewer);
  if (!ids) return { ok: false, error: 'forbidden' };
  const all = ids.map((id) => rowOf(db, id, opts.today)).filter((r): r is AthleteRow => r !== null);
  const counts = { all: all.length, review: 0, inactive: 0, ok: 0 };
  for (const a of all) counts[a.status]++;
  const q = opts.q?.trim().toLowerCase();
  const athletes = all
    .filter((a) => (!opts.filter || opts.filter === 'all' || a.status === opts.filter) && (!q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)))
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name, 'ru'));
  return { ok: true, list: { athletes, counts } };
}

export type GoalResult = { ok: true } | { ok: false; error: 'not_found' | 'forbidden' | 'too_long' };

/** Цель ученика («Сила»); пустая строка очищает */
export function setGoal(db: Db, viewer: Viewer, athleteId: number, goal: string): GoalResult {
  if (!db.prepare("SELECT 1 FROM users WHERE id = ? AND role = 'athlete'").get(athleteId)) return { ok: false, error: 'not_found' };
  if (viewer.role === 'athlete' || !canAccessAthlete(db, viewer, athleteId)) return { ok: false, error: 'forbidden' };
  const g = goal.trim();
  if (g.length > MAX_GOAL_LENGTH) return { ok: false, error: 'too_long' };
  db.prepare('UPDATE users SET goal = ? WHERE id = ?').run(g || null, athleteId);
  return { ok: true };
}

type Access = { ok: true } | { ok: false; error: 'not_found' | 'forbidden' };

/** Тренер (или админ) и существующий ученик */
function athleteAccess(db: Db, viewer: Viewer, athleteId: number): Access {
  if (!db.prepare("SELECT 1 FROM users WHERE id = ? AND role = 'athlete'").get(athleteId)) return { ok: false, error: 'not_found' };
  if (viewer.role === 'athlete' || !canAccessAthlete(db, viewer, athleteId)) return { ok: false, error: 'forbidden' };
  return { ok: true };
}

export type SessionsResult = { ok: true; sessions: AthleteSessionsResponse } | { ok: false; error: 'not_found' | 'forbidden' };

/** Вкладка «Тренировки»: что стоит в плане с сегодняшнего дня и история выполненных, свежие первыми */
export function sessionsOf(db: Db, viewer: Viewer, athleteId: number, today: string, historyLimit = 60): SessionsResult {
  const access = athleteAccess(db, viewer, athleteId);
  if (!access.ok) return access;
  const moves = planOf(db, athleteId).moves;
  const workouts = new Map(
    (db.prepare('SELECT id, title, blocks FROM workouts WHERE user_id = ?').all(athleteId) as Array<{ id: number; title: string; blocks: string }>).map((w) => [w.id, { title: w.title, count: (JSON.parse(w.blocks) as CommitBlock[]).reduce((n, b) => n + b.items.length, 0) }]),
  );
  const info = (id: number) => workouts.get(id) ?? { title: '', count: 0 };

  const entries = db
    .prepare(
      `SELECT e.date, e.workout_id FROM plan_entries e WHERE e.user_id = ? AND e.date >= ?
         AND NOT EXISTS (SELECT 1 FROM sessions_done s WHERE s.user_id = e.user_id AND s.date = e.date AND s.workout_id = e.workout_id)
       ORDER BY e.date, e.workout_id`,
    )
    .all(athleteId, today) as Array<{ date: string; workout_id: number }>;
  const planned: TrainerPlanItem[] = entries.map((e) => {
    const from = moves.find((m) => m.to === e.date && m.templateId === String(e.workout_id))?.from;
    return { kind: 'planned', date: e.date, workoutId: e.workout_id, title: info(e.workout_id).title, exerciseCount: info(e.workout_id).count, ...(from && { movedFrom: from }) };
  });
  for (const m of moves) {
    if (m.from < today) continue;
    const id = Number(m.templateId);
    planned.push({ kind: 'moved', date: m.from, workoutId: id, title: info(id).title, exerciseCount: info(id).count, movedTo: m.to });
  }
  planned.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === 'moved' ? -1 : 1));

  const rows = db
    .prepare(
      `SELECT s.id, s.workout_id, s.title, s.date, s.steps, s.duration_sec, r.reviewed_at,
         (SELECT COUNT(*) FROM videos v WHERE v.session_id = s.id) AS videos,
         (SELECT COUNT(*) FROM comments c WHERE c.session_id = s.id AND c.author_id = s.user_id AND c.seen_at IS NULL) AS fresh
       FROM sessions_done s LEFT JOIN reviews r ON r.session_id = s.id WHERE s.user_id = ? ORDER BY s.date DESC, s.id DESC LIMIT ?`,
    )
    .all(athleteId, historyLimit) as Array<{ id: number; workout_id: number | null; title: string; date: string; steps: string; duration_sec: number | null; reviewed_at: string | null; videos: number; fresh: number }>;
  const history: TrainerHistoryItem[] = rows.map((r) => {
    const steps = JSON.parse(r.steps) as SessionStepResult[];
    const from = r.workout_id === null ? undefined : moves.find((m) => m.to === r.date && m.templateId === String(r.workout_id))?.from;
    return { sessionId: r.id, date: r.date, title: r.title, durationSec: r.duration_sec, volumeKg: sessionVolume(steps), setsDone: doneSets(steps), videos: r.videos, reviewedAt: r.reviewed_at, newFromAthlete: r.fresh, ...(from && { movedFrom: from }) };
  });
  return { ok: true, sessions: { planned, history } };
}

export type ExerciseCommentsResult = { ok: true; comments: ExerciseCommentItem[] } | { ok: false; error: 'not_found' | 'forbidden' };

/** Что тренер раньше писал ученику по упражнению, свежие первыми. exclude — тренировка, которую смотрим сейчас. */
export function exerciseCommentsOf(db: Db, viewer: Viewer, athleteId: number, exerciseName: string, excludeSessionId?: number): ExerciseCommentsResult {
  const access = athleteAccess(db, viewer, athleteId);
  if (!access.ok) return access;
  const name = exerciseName.trim().toLowerCase();
  const slug = libraryIndex(libraryOf(db)).get(name)?.slug ?? null;
  const rows = db
    .prepare(
      `SELECT c.id, c.timecode_sec, c.text, COALESCE(s.date, substr(c.created_at, 1, 10)) AS date FROM comments c LEFT JOIN sessions_done s ON s.id = c.session_id
       WHERE c.athlete_id = ? AND c.author_id <> c.athlete_id AND (lower(c.exercise_name) = ? OR (? IS NOT NULL AND c.exercise_slug = ?))
         AND (? IS NULL OR c.session_id IS NULL OR c.session_id <> ?)
       ORDER BY date DESC, c.id DESC`,
    )
    .all(athleteId, name, slug, slug, excludeSessionId ?? null, excludeSessionId ?? null) as Array<{ id: number; timecode_sec: number | null; text: string; date: string }>;
  return { ok: true, comments: rows.map((r) => ({ id: String(r.id), date: r.date, timecodeSec: r.timecode_sec, text: r.text })) };
}
