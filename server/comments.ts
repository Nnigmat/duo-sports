import type { Block, CoachComment, Role, Technique } from '../shared/types';
import type { Db } from './db';

type Clock = () => Date;
const now: Clock = () => new Date();

export const MAX_COMMENT_LENGTH = 1000;
export const canComment = (role: Role) => role === 'trainer' || role === 'admin';

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
  exerciseId: string;
  text: string;
  videoId?: string;
  videoLabel?: string;
}

export type ValidComment = { ok: true; comment: NewComment } | { ok: false; error: string };

export function validateComment(body: unknown): ValidComment {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'Ждём объект' };
  const b = body as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text || text.length > MAX_COMMENT_LENGTH) return { ok: false, error: `text: от 1 до ${MAX_COMMENT_LENGTH} символов` };
  const exerciseId = b.exerciseId;
  if (typeof exerciseId !== 'string' || !exerciseId || exerciseId.length > 100) return { ok: false, error: 'exerciseId: обязательная строка, комментарий пишется к упражнению' };
  for (const k of ['videoId', 'videoLabel'] as const) {
    if (b[k] !== undefined && (typeof b[k] !== 'string' || (b[k] as string).length > 200)) return { ok: false, error: `${k}: строка до 200 символов` };
  }
  if (b.videoLabel !== undefined && b.videoId === undefined) return { ok: false, error: 'videoLabel без videoId' };
  return { ok: true, comment: { exerciseId, text, videoId: b.videoId as string | undefined, videoLabel: b.videoLabel as string | undefined } };
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

/** Комментарии спортсмена. После выдачи помечаются прочитанными: «новый» виден один раз. */
export function commentRowsOf(db: Db, athleteId: number): CommentRow[] {
  const rows = db
    .prepare('SELECT id, exercise_slug, exercise_name, video_id, video_label, text, created_at, seen_at FROM coach_comments WHERE athlete_id = ? ORDER BY created_at DESC, id DESC')
    .all(athleteId) as Array<{ id: number; exercise_slug: string | null; exercise_name: string; video_id: string | null; video_label: string | null; text: string; created_at: string; seen_at: string | null }>;
  return rows.map((r) => ({ id: r.id, exerciseSlug: r.exercise_slug, exerciseName: r.exercise_name, videoId: r.video_id, videoLabel: r.video_label, text: r.text, createdAt: r.created_at, seen: r.seen_at !== null }));
}

export function markSeen(db: Db, ids: number[], clock: Clock = now) {
  const upd = db.prepare('UPDATE coach_comments SET seen_at = ? WHERE id = ? AND seen_at IS NULL');
  const at = clock().toISOString();
  for (const id of ids) upd.run(at, id);
}

export type AddResult = { ok: true; id: number } | { ok: false; error: 'forbidden' | 'not_found' | 'unknown_exercise' };

/** Комментарий тренера спортсмену: к упражнению из общей библиотеки. */
export function addComment(db: Db, author: { id: number; role: Role }, athleteId: number, c: NewComment, clock: Clock = now): AddResult {
  if (!canComment(author.role)) return { ok: false, error: 'forbidden' };
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(athleteId)) return { ok: false, error: 'not_found' };
  const lib = db.prepare('SELECT name FROM exercises WHERE slug = ?').get(c.exerciseId) as { name: string } | undefined;
  if (!lib) return { ok: false, error: 'unknown_exercise' };
  const name = lib.name;
  const info = db
    .prepare('INSERT INTO coach_comments (athlete_id, author_id, exercise_slug, exercise_name, video_id, video_label, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(athleteId, author.id, c.exerciseId, name, c.videoId ?? null, c.videoId ? (c.videoLabel ?? null) : null, c.text, clock().toISOString());
  return { ok: true, id: Number(info.lastInsertRowid) };
}
