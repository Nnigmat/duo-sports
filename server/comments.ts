import type { Block, CoachComment, Role, Technique } from '../shared/types';
import type { Db } from './db';
import { canAccessAthlete } from './trainerLinks';

type Clock = () => Date;
const now: Clock = () => new Date();

export const MAX_COMMENT_LENGTH = 1000;

// ── Чистая логика ─────────────────────────────────────────

export interface LibraryRow {
  slug: string;
  name: string;
  aliases: string[];
  notes: string | null;
  videoUrl: string | null;
}

export interface CommentRow {
  id: number;
  exerciseSlug: string | null;
  exerciseName: string;
  videoId: string | null;
  videoLabel: string | null;
  text: string;
  createdAt: string;
  seen: boolean;
}

const key = (s: string) => s.trim().toLowerCase();

/** Упражнение блока ищем в библиотеке по названию или псевдониму: у структуры свои id, у библиотеки — slug. */
export function libraryIndex(library: LibraryRow[]): Map<string, LibraryRow> {
  const byName = new Map<string, LibraryRow>();
  for (const e of library) for (const n of [e.name, ...e.aliases]) if (!byName.has(key(n))) byName.set(key(n), e);
  return byName;
}

export function exercisesOf(blocks: Block[]): Array<{ id: string; name: string }> {
  return blocks.flatMap((b) => b.exercises.map((e) => ({ id: e.id, name: e.name })));
}

/** Описание из библиотеки: строки заметки — шаги, нумерацию и маркеры убираем. Нет текста и видео — техники нет. */
export function techniqueOf(notes: string | null, videoUrl: string | null): Technique | null {
  const instructions = (notes ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-•–])\s*/, '').trim())
    .filter(Boolean);
  if (!instructions.length && !videoUrl) return null;
  return { instructions, ...(videoUrl ? { videoUrl } : {}) };
}

/** Техника по id упражнений тренировки */
export function techniquesFor(blocks: Block[], library: LibraryRow[]): Record<string, Technique> {
  const index = libraryIndex(library);
  const out: Record<string, Technique> = {};
  for (const ex of exercisesOf(blocks)) {
    const lib = index.get(key(ex.name));
    const t = lib && techniqueOf(lib.notes, lib.videoUrl);
    if (t) out[ex.id] = t;
  }
  return out;
}

/**
 * Комментарии для экрана: к упражнению — только если оно есть в тренировке (id подменяется на id из структуры),
 * общие — всегда. Новые сверху не сортируем: порядок задаёт экран.
 */
export function commentsFor(blocks: Block[], library: LibraryRow[], rows: CommentRow[]): CoachComment[] {
  const index = libraryIndex(library);
  const idBySlug = new Map<string, string>();
  for (const ex of exercisesOf(blocks)) {
    const lib = index.get(key(ex.name));
    if (lib && !idBySlug.has(lib.slug)) idBySlug.set(lib.slug, ex.id);
  }
  const out: CoachComment[] = [];
  for (const r of rows) {
    const exerciseId = r.exerciseSlug === null ? undefined : idBySlug.get(r.exerciseSlug);
    if (exerciseId === undefined) continue;
    out.push({
      id: String(r.id),
      exerciseId,
      exerciseName: r.exerciseName,
      createdAt: r.createdAt,
      text: r.text,
      isNew: !r.seen,
      ...(r.videoId ? { video: { id: r.videoId, label: r.videoLabel ?? 'Видео' } } : {}),
    });
  }
  return out;
}

export interface NewComment {
  /** slug упражнения из библиотеки */
  exerciseId?: string;
  /** id выполненной тренировки (sessions_done) */
  sessionId?: number;
  videoId?: string;
  videoLabel?: string;
  /** Секунда видео; только вместе с videoId */
  timecodeSec?: number;
}
export type NewCommentInput = NewComment & { text: string };

export type ValidComment = { ok: true; comment: NewCommentInput } | { ok: false; error: string };

export const MAX_TIMECODE_SEC = 3600;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function validateComment(body: unknown): ValidComment {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'Ждём объект' };
  const b = body as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text || text.length > MAX_COMMENT_LENGTH) return { ok: false, error: `text: от 1 до ${MAX_COMMENT_LENGTH} символов` };
  const { exerciseId, sessionId, videoId, timecodeSec } = b;
  if (exerciseId !== undefined && (typeof exerciseId !== 'string' || !exerciseId || exerciseId.length > 100)) return { ok: false, error: 'exerciseId: непустая строка до 100 символов' };
  if (sessionId !== undefined && !(Number.isInteger(sessionId) && (sessionId as number) > 0)) return { ok: false, error: 'sessionId: положительное целое' };
  if (videoId !== undefined && !(typeof videoId === 'string' && UUID.test(videoId))) return { ok: false, error: 'videoId: id видео' };
  if (exerciseId === undefined && sessionId === undefined && videoId === undefined) return { ok: false, error: 'Нужна цель: exerciseId, sessionId или videoId' };
  if (b.videoLabel !== undefined && (typeof b.videoLabel !== 'string' || b.videoLabel.length > 200)) return { ok: false, error: 'videoLabel: строка до 200 символов' };
  if (b.videoLabel !== undefined && videoId === undefined) return { ok: false, error: 'videoLabel без videoId' };
  if (timecodeSec !== undefined) {
    if (videoId === undefined) return { ok: false, error: 'timecodeSec без videoId' };
    if (!(Number.isInteger(timecodeSec) && (timecodeSec as number) >= 0 && (timecodeSec as number) <= MAX_TIMECODE_SEC)) return { ok: false, error: `timecodeSec: секунды от 0 до ${MAX_TIMECODE_SEC}` };
  }
  return {
    ok: true,
    comment: {
      text,
      ...(exerciseId !== undefined && { exerciseId: exerciseId as string }),
      ...(sessionId !== undefined && { sessionId: sessionId as number }),
      ...(videoId !== undefined && { videoId: videoId as string }),
      ...(b.videoLabel !== undefined && { videoLabel: b.videoLabel as string }),
      ...(timecodeSec !== undefined && { timecodeSec: timecodeSec as number }),
    },
  };
}

// ── База ──────────────────────────────────────────────────

export function libraryOf(db: Db): LibraryRow[] {
  const rows = db.prepare('SELECT slug, name, aliases, notes, video_url FROM exercises ORDER BY id').all() as Array<{
    slug: string;
    name: string;
    aliases: string;
    notes: string | null;
    video_url: string | null;
  }>;
  return rows.map((r) => ({ slug: r.slug, name: r.name, aliases: JSON.parse(r.aliases) as string[], notes: r.notes, videoUrl: r.video_url }));
}

/** Комментарии тренера спортсмену (ответы самого спортсмена не в счёт). После выдачи помечаются прочитанными: «новый» виден один раз. */
export function commentRowsOf(db: Db, athleteId: number): CommentRow[] {
  const rows = db
    .prepare('SELECT id, exercise_slug, exercise_name, video_id, video_label, text, created_at, seen_at FROM comments WHERE athlete_id = ? AND author_id <> athlete_id ORDER BY created_at DESC, id DESC')
    .all(athleteId) as Array<{ id: number; exercise_slug: string | null; exercise_name: string; video_id: string | null; video_label: string | null; text: string; created_at: string; seen_at: string | null }>;
  return rows.map((r) => ({ id: r.id, exerciseSlug: r.exercise_slug, exerciseName: r.exercise_name, videoId: r.video_id, videoLabel: r.video_label, text: r.text, createdAt: r.created_at, seen: r.seen_at !== null }));
}

export function markSeen(db: Db, ids: number[], clock: Clock = now) {
  const upd = db.prepare('UPDATE comments SET seen_at = ? WHERE id = ? AND seen_at IS NULL');
  const at = clock().toISOString();
  for (const id of ids) upd.run(at, id);
}

export type AddResult = { ok: true; id: number } | { ok: false; error: 'forbidden' | 'not_found' | 'unknown_exercise' | 'unknown_session' | 'unknown_video' };

/**
 * Комментарий в данных спортсмена. Писать могут его тренер, админ и сам спортсмен (ответ).
 * Видео и тренировка должны принадлежать этому спортсмену; без явной сессии она берётся из видео.
 */
export function addComment(db: Db, author: { id: number; role: Role }, athleteId: number, c: NewCommentInput, clock: Clock = now): AddResult {
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(athleteId)) return { ok: false, error: 'not_found' };
  if (!canAccessAthlete(db, author, athleteId)) return { ok: false, error: 'forbidden' };

  let name: string | null = null;
  if (c.exerciseId !== undefined) {
    const lib = db.prepare('SELECT name FROM exercises WHERE slug = ?').get(c.exerciseId) as { name: string } | undefined;
    if (!lib) return { ok: false, error: 'unknown_exercise' };
    name = lib.name;
  }

  let sessionId = c.sessionId ?? null;
  if (c.videoId !== undefined) {
    const v = db.prepare('SELECT session_id, step_index FROM videos WHERE id = ? AND athlete_id = ?').get(c.videoId, athleteId) as { session_id: number | null; step_index: number | null } | undefined;
    if (!v) return { ok: false, error: 'unknown_video' };
    sessionId ??= v.session_id;
    if (name === null && v.session_id !== null && v.step_index !== null) {
      const row = db.prepare('SELECT steps FROM sessions_done WHERE id = ?').get(v.session_id) as { steps: string } | undefined;
      name = (JSON.parse(row?.steps ?? '[]') as Array<{ exerciseName: string }>)[v.step_index]?.exerciseName ?? null;
    }
  }

  let title: string | null = null;
  if (sessionId !== null) {
    const s = db.prepare('SELECT title FROM sessions_done WHERE id = ? AND user_id = ?').get(sessionId, athleteId) as { title: string } | undefined;
    if (!s) return { ok: false, error: 'unknown_session' };
    title = s.title;
  }

  const info = db
    .prepare('INSERT INTO comments (athlete_id, author_id, exercise_slug, exercise_name, video_id, video_label, session_id, timecode_sec, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(athleteId, author.id, c.exerciseId ?? null, name ?? title ?? 'Видео', c.videoId ?? null, c.videoId ? (c.videoLabel ?? null) : null, sessionId, c.timecodeSec ?? null, c.text, clock().toISOString());
  return { ok: true, id: Number(info.lastInsertRowid) };
}
