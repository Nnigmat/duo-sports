import type { AthleteListResponse, AthleteRow, AthleteStatus, Role } from '../shared/types';
import type { Db } from './db';
import { AWAITING_DAYS } from './sessionReview';
import { addDays, userNameOf } from './today';
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
