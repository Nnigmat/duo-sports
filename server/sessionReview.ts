import type { AwaitingReview, Block, ReviewComment, ReviewExercise, ReviewSection, ReviewSet, Role, SessionReviewResponse, SessionStepResult, VideoReviewResponse } from '../shared/types';
import { libraryIndex, libraryOf } from './comments';
import type { Db } from './db';
import { nextWorkoutHints } from './hints';
import { factLabel } from '../shared/fact';
import { feelingLabel } from '../shared/feeling';
import { sessionVolume, addDays } from './today';
import { canAccessAthlete } from './trainerLinks';

const NBSP = ' ';
type Viewer = { id: number; role: Role };
const key = (s: string) => s.trim().toLowerCase();
const num = (n: number) => String(n).replace('.', ',');
const range = (min: number, max: number) => (min === max ? num(min) : `${num(min)}–${num(max)}`);
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Подход одной строкой: «80 кг × 5», «18–20 повт», «1:30» */
export function setLabel(s: SessionStepResult): string {
  const { min, max } = s.plan.target;
  if (s.kind === 'time') return min === max ? clock(min) : `${clock(min)}–${clock(max)}`;
  if (s.kind === 'weight' && s.plan.weight !== undefined) return `${num(s.plan.weight)}${NBSP}кг × ${range(min, max)}`;
  return `${range(min, max)}${NBSP}повт`;
}

/** Подход по факту, а без факта по плану: «85 кг × 7», «22 повт», «1:35» */
export function actualLabel(s: SessionStepResult): string {
  const a = s.actual;
  if (!a) return setLabel(s);
  if (s.kind === 'time') return clock(a.value);
  if (s.kind === 'weight') return `${num(a.weight ?? s.plan.weight ?? 0)}${NBSP}кг × ${num(a.value)}`;
  return `${num(a.value)}${NBSP}повт`;
}

type CommentRow = {
  id: number;
  author_id: number;
  athlete_id: number;
  exercise_slug: string | null;
  video_id: string | null;
  timecode_sec: number | null;
  text: string;
  created_at: string;
  seen_at: string | null;
};
const COMMENT_COLUMNS = 'id, author_id, athlete_id, exercise_slug, video_id, timecode_sec, text, created_at, seen_at';

const toComment = (r: CommentRow, viewerId: number): ReviewComment => ({
  id: String(r.id),
  author: r.author_id === r.athlete_id ? 'athlete' : 'trainer',
  text: r.text,
  timecodeSec: r.timecode_sec,
  videoId: r.video_id,
  createdAt: r.created_at,
  isNew: r.author_id !== viewerId && r.seen_at === null,
});

/** Помечает прочитанным всё, что в этой тренировке написал не зритель */
function markSessionSeen(db: Db, viewerId: number, sessionId: number) {
  db.prepare('UPDATE comments SET seen_at = ? WHERE session_id = ? AND author_id <> ? AND seen_at IS NULL').run(new Date().toISOString(), sessionId, viewerId);
}

const stripInternal = ({ stepIndexes: _steps, blockIndex: _block, ...e }: ReviewExercise & { stepIndexes: number[]; blockIndex: number }): ReviewExercise => e;

/** Структура тренировки, по которой шёл итог; null у старых итогов без тренировки */
function structureOf(db: Db, workoutId: number | null): Block[] | null {
  if (workoutId === null) return null;
  const row = db.prepare('SELECT structure FROM workouts WHERE id = ?').get(workoutId) as { structure: string | null } | undefined;
  return row?.structure ? (JSON.parse(row.structure) as Block[]) : null;
}

export type SessionReviewResult = { ok: true; review: SessionReviewResponse } | { ok: false; error: 'not_found' | 'forbidden' };

/**
 * Выполненная тренировка с комментариями для спортсмена и его тренера. Подходы группируются по упражнению.
 * Комментарий к видео попадает в группу подхода, к упражнению — в группу с тем же названием (через библиотеку).
 * Заметка спортсмена без момента видео, написанная до разбора, — «Ты написал»; позже — ответ в ветке.
 * Открытие помечает прочитанным чужое и гасит уведомление о разборе.
 */
export function sessionReviewOf(db: Db, viewer: Viewer, sessionId: number, today: string): SessionReviewResult {
  const s = db.prepare('SELECT user_id, workout_id, title, date, steps, duration_sec, feeling, comment FROM sessions_done WHERE id = ?').get(sessionId) as { user_id: number; workout_id: number | null; title: string; date: string; steps: string; duration_sec: number | null; feeling: number | null; comment: string | null } | undefined;
  if (!s) return { ok: false, error: 'not_found' };
  if (!canAccessAthlete(db, viewer, s.user_id)) return { ok: false, error: 'forbidden' };

  const steps = JSON.parse(s.steps) as SessionStepResult[];
  const reviewedAt = (db.prepare('SELECT reviewed_at FROM reviews WHERE session_id = ?').get(sessionId) as { reviewed_at: string } | undefined)?.reviewed_at ?? null;
  const videos = new Map(
    (db.prepare('SELECT id, duration_sec, step_index FROM videos WHERE session_id = ?').all(sessionId) as Array<{ id: string; duration_sec: number; step_index: number | null }>).map((v) => [v.id, v]),
  );

  const groups = new Map<string, ReviewExercise & { stepIndexes: number[]; blockIndex: number }>();
  steps.forEach((st, i) => {
    const id = `${st.blockIndex}:${st.exerciseId}`;
    const g = groups.get(id) ?? { id, name: st.exerciseName, ...(st.replacedFrom && { replacedFrom: st.replacedFrom }), slug: null, sets: [] as ReviewSet[], note: null, thread: [], newCount: 0, stepIndexes: [], blockIndex: st.blockIndex };
    const video = st.videoId ? videos.get(st.videoId) : undefined;
    const fact = st.completed && st.actual ? { actualLabel: actualLabel(st), factMark: factLabel(st.plan, st.actual.value), ...(st.actual.extraWeight && { extraWeight: true as const }) } : {};
    g.sets.push({ n: g.sets.length + 1, label: setLabel(st), completed: st.completed, ...fact, ...(video && { videoId: video.id, videoDurationSec: video.duration_sec }) });
    g.stepIndexes.push(i);
    groups.set(id, g);
  });
  const list = [...groups.values()];
  const library = libraryIndex(libraryOf(db));
  for (const g of list) g.slug = library.get(key(g.name))?.slug ?? null;
  const groupOfStep = (i: number) => list.find((g) => g.stepIndexes.includes(i));
  const groupOfSlug = (slug: string) => list.find((g) => library.get(key(g.name))?.slug === slug);

  const rows = db.prepare(`SELECT ${COMMENT_COLUMNS} FROM comments WHERE session_id = ? ORDER BY created_at, id`).all(sessionId) as CommentRow[];
  const general: ReviewComment[] = [];
  for (const r of rows) {
    const c = toComment(r, viewer.id);
    const videoStep = r.video_id ? videos.get(r.video_id)?.step_index : undefined;
    const g = videoStep != null ? groupOfStep(videoStep) : r.exercise_slug ? groupOfSlug(r.exercise_slug) : undefined;
    if (!g) {
      if (!r.video_id && !r.exercise_slug) general.push(c);
      continue;
    }
    const isNote = c.author === 'athlete' && r.video_id === null && r.timecode_sec === null && (reviewedAt === null || r.created_at <= reviewedAt);
    if (isNote) g.note = g.note ? `${g.note}\n${r.text}` : r.text;
    else {
      g.thread.push(c);
      if (c.isNew) g.newCount++;
    }
  }
  const structure = structureOf(db, s.workout_id);
  const sections: ReviewSection[] = [];
  for (const g of list) {
    // Структуру могли править после тренировки: блок по индексу годится, только если в нём есть это упражнение (или то, что заменили: у замены другой id)
    const candidate = structure?.[g.blockIndex];
    const exerciseId = g.id.slice(g.id.indexOf(':') + 1);
    const block = candidate?.exercises.some((e) => e.id === exerciseId || (g.replacedFrom !== undefined && key(e.name) === key(g.replacedFrom))) ? candidate : undefined;
    const secKey = block ? `b${g.blockIndex}` : 'all';
    let sec = sections.find((x) => x.key === secKey);
    if (!sec) {
      sec = { key: secKey, title: block?.title ?? 'Упражнения', folded: block?.mode === 'timed' && block.kind !== undefined, exercises: [] };
      sections.push(sec);
    }
    sec.exercises.push(stripInternal(g));
  }
  const trainerCommentCount = rows.filter((r) => r.author_id !== r.athlete_id).length;
  markSessionSeen(db, viewer.id, sessionId);
  db.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE user_id = ? AND session_id = ? AND kind = 'review'").run(new Date().toISOString(), viewer.id, sessionId);

  return {
    ok: true,
    review: {
      sessionId,
      athleteId: s.user_id,
      title: s.title,
      date: s.date,
      durationSec: s.duration_sec,
      feeling: s.feeling,
      feelingLabel: feelingLabel(s.feeling),
      feedbackComment: s.comment,
      volumeKg: sessionVolume(steps),
      reviewedAt,
      trainerCommentCount,
      exercises: list.map(stripInternal),
      sections,
      general,
      hints: viewer.role === 'athlete' ? nextWorkoutHints(db, s.user_id, today) : null,
    },
  };
}

export type VideoReviewResult = { ok: true; review: VideoReviewResponse } | { ok: false; error: 'not_found' | 'forbidden' };

/** Видео подхода с комментариями по порядку момента; без момента — в конце */
export function videoReviewOf(db: Db, viewer: Viewer, videoId: string): VideoReviewResult {
  const v = db.prepare('SELECT athlete_id, duration_sec, session_id, step_index FROM videos WHERE id = ?').get(videoId) as { athlete_id: number; duration_sec: number; session_id: number | null; step_index: number | null } | undefined;
  if (!v) return { ok: false, error: 'not_found' };
  if (!canAccessAthlete(db, viewer, v.athlete_id)) return { ok: false, error: 'forbidden' };
  let exerciseName = 'Видео';
  let label = 'Видео';
  if (v.session_id !== null && v.step_index !== null) {
    const row = db.prepare('SELECT steps FROM sessions_done WHERE id = ?').get(v.session_id) as { steps: string } | undefined;
    const steps = JSON.parse(row?.steps ?? '[]') as SessionStepResult[];
    const st = steps[v.step_index];
    if (st) {
      exerciseName = st.exerciseName;
      const n = steps.slice(0, v.step_index).filter((x) => x.blockIndex === st.blockIndex && x.exerciseId === st.exerciseId).length + 1;
      label = `Подход ${n} · ${setLabel(st)}`;
    }
  }
  const rows = db.prepare(`SELECT ${COMMENT_COLUMNS} FROM comments WHERE video_id = ? ORDER BY timecode_sec IS NULL, timecode_sec, created_at, id`).all(videoId) as CommentRow[];
  const comments = rows.map((r) => toComment(r, viewer.id));
  db.prepare('UPDATE comments SET seen_at = ? WHERE video_id = ? AND author_id <> ? AND seen_at IS NULL').run(new Date().toISOString(), videoId, viewer.id);
  return { ok: true, review: { athleteId: v.athlete_id, video: { id: videoId, durationSec: v.duration_sec, exerciseName, label, sessionId: v.session_id }, comments } };
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
/** Окно, в котором отправленные видео ещё считаются ждущими, а не забытыми */
export const AWAITING_DAYS = 14;

/** Свежая тренировка с видео, которую тренер ещё не разобрал; null, если такой нет */
export function awaitingReviewOf(db: Db, athleteId: number, today: string): AwaitingReview | null {
  const r = db
    .prepare(
      `SELECT s.id, s.title, s.date, (SELECT COUNT(*) FROM videos v WHERE v.session_id = s.id) AS videos FROM sessions_done s
       WHERE s.user_id = ? AND s.date >= ? AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.session_id = s.id)
         AND EXISTS (SELECT 1 FROM videos v WHERE v.session_id = s.id)
       ORDER BY s.date DESC, s.id DESC LIMIT 1`,
    )
    .get(athleteId, addDays(today, -AWAITING_DAYS)) as { id: number; title: string; date: string; videos: number } | undefined;
  if (!r) return null;
  const whenLabel = r.date === today ? 'сегодня' : r.date === addDays(today, -1) ? 'вчера' : `${Number(r.date.slice(8))} ${MONTHS_SHORT[Number(r.date.slice(5, 7)) - 1]}`;
  return { sessionId: r.id, title: r.title, whenLabel, videos: r.videos };
}
