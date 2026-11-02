import type {
  CommitBlock, CommitExercise, CommitWorkout, ExerciseKind, ImportCommit, ImportRecord, ImportSummary, LibraryEntry, MuscleGroupId, Role,
} from '../shared/types';
import { DEFAULT_EXERCISES } from './defaultExercises';
import type { Db } from './db';

type Clock = () => Date;
const now: Clock = () => new Date();

export const UNDO_HOURS = 24;
export const GROUPS: MuscleGroupId[] = ['legs', 'back', 'chest', 'arms', 'core', 'cardio', 'other'];
const KINDS: ExerciseKind[] = ['reps', 'weight', 'time'];
const BLOCK_KINDS = ['warmup', 'cooldown', 'exercises'];

/** Пределы одного импорта: больше — отказ, а не тихая обрезка */
export const LIMITS = { exercises: 1000, workouts: 500, entries: 5000, blocks: 50, items: 200, text: 1000, name: 200 };

// ── Библиотека и план ─────────────────────────────────────

/** Общая библиотека: стартовый набор кладётся один раз, пока она пуста. */
export function ensureLibrary(db: Db, clock: Clock = now): void {
  db.transaction(() => {
    if (db.prepare('SELECT 1 FROM exercises LIMIT 1').get()) return;
    const insert = db.prepare(
      `INSERT OR IGNORE INTO exercises (slug, name, aliases, muscles, kind, group_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const e of DEFAULT_EXERCISES) insert.run(e.id, e.name, JSON.stringify(e.aliases), JSON.stringify(e.muscles), e.kind, e.group, clock().toISOString());
  })();
}

type ExerciseRow = { slug: string; name: string; aliases: string; muscles: string; kind: ExerciseKind; group_id: MuscleGroupId; notes: string | null; video_url: string | null };

/** Общая библиотека для всех пользователей; notes и video есть, только если заполнены. */
export function libraryOf(db: Db): LibraryEntry[] {
  const rows = db.prepare('SELECT slug, name, aliases, muscles, kind, group_id, notes, video_url FROM exercises ORDER BY id').all() as ExerciseRow[];
  return rows.map((r) => ({
    id: r.slug, name: r.name, aliases: JSON.parse(r.aliases), kind: r.kind, group: r.group_id, muscles: JSON.parse(r.muscles),
    ...(r.notes ? { notes: r.notes } : {}),
    ...(r.video_url ? { video: r.video_url } : {}),
  }));
}

/** Добавлять упражнения в общую библиотеку могут только тренер и админ. */
export const canAddExercises = (role: Role): boolean => role === 'trainer' || role === 'admin';
export const EXERCISES_FORBIDDEN = 'Упражнения добавляют тренер и админ';

/** Ошибка прав: импорт с упражнениями от спортсмена. */
export class ImportForbiddenError extends Error {
  constructor() {
    super(EXERCISES_FORBIDDEN);
  }
}

/** Дата → название тренировки; если в дне две, показываем через « + » */
export function planTitles(db: Db, userId: number): Record<string, string> {
  const rows = db
    .prepare('SELECT p.date, w.title FROM plan_entries p JOIN workouts w ON w.id = p.workout_id WHERE p.user_id = ? ORDER BY p.date, w.id')
    .all(userId) as Array<{ date: string; title: string }>;
  const out: Record<string, string> = {};
  for (const r of rows) out[r.date] = out[r.date] ? `${out[r.date]} + ${r.title}` : r.title;
  return out;
}

// ── Проверка присланного ──────────────────────────────────

export type Validated = { ok: true; commit: ImportCommit } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const optStr = (v: unknown, max: number): boolean => v === undefined || (typeof v === 'string' && v.length <= max);
const strList = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= 50 && v.every((s) => isStr(s, max));
const SLUG = /^[A-Za-z0-9-]{1,80}$/;

export function isDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function checkBlock(b: unknown): b is CommitBlock {
  if (!isObj(b) || !BLOCK_KINDS.includes(String(b.kind)) || !isStr(b.heading, LIMITS.text) || !optStr(b.text, LIMITS.text)) return false;
  if (!Array.isArray(b.items) || b.items.length > LIMITS.items) return false;
  return b.items.every((i) => isObj(i) && isStr(i.name, LIMITS.name) && isStr(i.value, LIMITS.text));
}

const MODES = ['timed', 'sets', 'circuit'];
const EX_KINDS = ['reps', 'weight', 'time'];

function checkRange(r: unknown): boolean {
  return isObj(r) && Number.isFinite(r.min) && Number.isFinite(r.max) && (r.min as number) >= 0 && (r.max as number) >= (r.min as number) && (r.max as number) <= 86_400;
}

function checkExercise(e: unknown, withSets: boolean): boolean {
  if (!isObj(e) || !isStr(e.id, 100) || !isStr(e.name, LIMITS.name) || !EX_KINDS.includes(String(e.kind)) || !checkRange(e.target)) return false;
  if (e.weight !== undefined && !(typeof e.weight === 'number' && e.weight >= 0 && e.weight <= 1000)) return false;
  return !withSets || (Number.isInteger(e.sets) && (e.sets as number) >= 1 && (e.sets as number) <= 100);
}

/** Блоки экрана тренировки: форма и пределы, чтобы в базу не попало то, на чём экран упадёт */
function checkStructure(blocks: unknown): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0 || blocks.length > LIMITS.blocks) return false;
  return blocks.every((b) => {
    if (!isObj(b) || !MODES.includes(String(b.mode)) || !isStr(b.id, 100) || !isStr(b.title, LIMITS.name)) return false;
    if (!Array.isArray(b.exercises) || b.exercises.length === 0 || b.exercises.length > LIMITS.items) return false;
    if (!b.exercises.every((e) => checkExercise(e, b.mode === 'sets'))) return false;
    if (b.mode === 'timed') return true;
    const rest = Number.isInteger(b.restSec) && (b.restSec as number) >= 0 && (b.restSec as number) <= 3600;
    const video = Array.isArray(b.videoRounds) && b.videoRounds.every((n) => Number.isInteger(n));
    return rest && video && (b.mode === 'sets' || (Number.isInteger(b.rounds) && (b.rounds as number) >= 1 && (b.rounds as number) <= 100));
  });
}

/** Проверяет форму и пределы присланного; разбор YAML сервер не повторяет, это сделал браузер. */
export function validateCommit(body: unknown): Validated {
  if (!isObj(body)) return { ok: false, error: 'Ждём объект с exercises, workouts, entries' };
  const { exercises, workouts, entries, replaceDates } = body;
  if (!Array.isArray(exercises) || exercises.length > LIMITS.exercises) return { ok: false, error: 'exercises: список до 1000' };
  if (!Array.isArray(workouts) || workouts.length === 0 || workouts.length > LIMITS.workouts) return { ok: false, error: 'workouts: список от 1 до 500' };
  if (!Array.isArray(entries) || entries.length > LIMITS.entries) return { ok: false, error: 'entries: список до 5000' };
  if (!Array.isArray(replaceDates) || replaceDates.length > LIMITS.entries || !replaceDates.every(isDate)) return { ok: false, error: 'replaceDates: список дат' };

  for (const [i, e] of exercises.entries()) {
    const ok =
      isObj(e) && isStr(e.name, LIMITS.name) && (e.id === undefined || (typeof e.id === 'string' && SLUG.test(e.id))) &&
      strList(e.aliases, LIMITS.name) && strList(e.muscles, LIMITS.name) && KINDS.includes(e.kind as ExerciseKind) &&
      GROUPS.includes(e.group as MuscleGroupId) && optStr(e.video, 500) && optStr(e.notes, LIMITS.text);
    if (!ok) return { ok: false, error: `exercises[${i}]: неверные поля` };
  }
  for (const [i, w] of workouts.entries()) {
    const ok =
      isObj(w) && isStr(w.title, LIMITS.name) && (w.id === undefined || (typeof w.id === 'string' && SLUG.test(w.id))) &&
      Array.isArray(w.blocks) && w.blocks.length > 0 && w.blocks.length <= LIMITS.blocks && w.blocks.every(checkBlock) &&
      (w.structure === undefined || checkStructure(w.structure));
    if (!ok) return { ok: false, error: `workouts[${i}]: неверные поля` };
  }
  for (const [i, en] of entries.entries()) {
    if (!isObj(en) || !isDate(en.date) || !Number.isInteger(en.workout) || (en.workout as number) < 0 || (en.workout as number) >= workouts.length) {
      return { ok: false, error: `entries[${i}]: неверная дата или номер тренировки` };
    }
  }
  return { ok: true, commit: body as unknown as ImportCommit };
}

// ── Запись и отмена ───────────────────────────────────────

interface Snapshot {
  /** Свои записи плана, которые заменил импорт */
  removed: Array<{ date: string; workoutId: number; importId: number | null }>;
  /** Тренировки, которые импорт обновил по id: как они выглядели до того */
  updated: Array<{ id: number; title: string; blocks: string; structure: string | null }>;
}

type ImportRow = { id: number; user_id: number; created_at: string; undone_at: string | null; summary: string; payload: string; snapshot: string };

const slugOf = (name: string, taken: (s: string) => boolean): string => {
  let n = 1;
  const base = `my-${[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}`;
  let s = base;
  while (taken(s)) s = `${base}-${++n}`;
  return s;
};

function apply(db: Db, userId: number, importId: number, commit: ImportCommit, clock: Clock): { summary: ImportSummary; snapshot: Snapshot } {
  const at = clock().toISOString();
  const snapshot: Snapshot = { removed: [], updated: [] };
  const summary: ImportSummary = { workouts: commit.workouts.length, inCalendar: 0, created: 0, updated: 0 };

  const hasExercise = db.prepare('SELECT 1 FROM exercises WHERE slug = ?');
  const insertExercise = db.prepare(
    `INSERT INTO exercises (slug, name, aliases, muscles, kind, group_id, video_url, notes, import_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const e of commit.exercises as CommitExercise[]) {
    const slug = e.id ?? slugOf(e.name, (s) => !!hasExercise.get(s));
    if (hasExercise.get(slug)) continue; // уже есть: не дублируем и не перезаписываем
    insertExercise.run(slug, e.name, JSON.stringify(e.aliases), JSON.stringify(e.muscles), e.kind, e.group, e.video ?? null, e.notes ?? null, importId, at);
    summary.created++;
  }

  const findWorkout = db.prepare('SELECT id, title, blocks, structure FROM workouts WHERE user_id = ? AND slug = ?');
  const insertWorkout = db.prepare('INSERT INTO workouts (user_id, slug, title, blocks, structure, import_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const updateWorkout = db.prepare('UPDATE workouts SET title = ?, blocks = ?, structure = ? WHERE id = ?');
  const ids: number[] = [];
  for (const w of commit.workouts as CommitWorkout[]) {
    const blocks = JSON.stringify(w.blocks);
    const structure = w.structure ? JSON.stringify(w.structure) : null;
    const old = w.id ? (findWorkout.get(userId, w.id) as { id: number; title: string; blocks: string; structure: string | null } | undefined) : undefined;
    if (old) {
      snapshot.updated.push(old);
      updateWorkout.run(w.title, blocks, structure, old.id);
      ids.push(old.id);
      summary.updated++;
    } else {
      ids.push(Number(insertWorkout.run(userId, w.id ?? null, w.title, blocks, structure, importId, at).lastInsertRowid));
    }
  }

  const selectOwn = db.prepare('SELECT workout_id, import_id FROM plan_entries WHERE user_id = ? AND date = ?');
  const deleteEntry = db.prepare('DELETE FROM plan_entries WHERE user_id = ? AND date = ? AND workout_id = ?');
  for (const date of new Set(commit.replaceDates)) {
    for (const r of selectOwn.all(userId, date) as Array<{ workout_id: number; import_id: number | null }>) {
      if (ids.includes(r.workout_id)) continue; // та же тренировка при повторном импорте не заменяется сама собой
      snapshot.removed.push({ date, workoutId: r.workout_id, importId: r.import_id });
      deleteEntry.run(userId, date, r.workout_id);
    }
  }

  const insertEntry = db.prepare('INSERT OR IGNORE INTO plan_entries (user_id, date, workout_id, import_id) VALUES (?, ?, ?, ?)');
  for (const en of commit.entries) summary.inCalendar += insertEntry.run(userId, en.date, ids[en.workout], importId).changes;

  return { summary, snapshot };
}

const record = (r: ImportRow): ImportRecord => ({
  id: r.id,
  createdAt: r.created_at,
  undoneAt: r.undone_at,
  undoUntil: new Date(new Date(r.created_at).getTime() + UNDO_HOURS * 3_600_000).toISOString(),
  summary: JSON.parse(r.summary),
});

/** Роль берётся из базы: непустой раздел exercises разрешён только тренеру и админу, иначе ImportForbiddenError. */
export function applyImport(db: Db, userId: number, commit: ImportCommit, clock: Clock = now): ImportRecord {
  if (commit.exercises.length > 0) {
    const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: Role } | undefined;
    if (!u || !canAddExercises(u.role)) throw new ImportForbiddenError();
  }
  return db.transaction(() => {
    const info = db
      .prepare("INSERT INTO imports (user_id, created_at, summary, payload) VALUES (?, ?, '{}', ?)")
      .run(userId, clock().toISOString(), JSON.stringify(commit));
    const id = Number(info.lastInsertRowid);
    const { summary, snapshot } = apply(db, userId, id, commit, clock);
    db.prepare('UPDATE imports SET summary = ?, snapshot = ? WHERE id = ?').run(JSON.stringify(summary), JSON.stringify(snapshot), id);
    return record(db.prepare('SELECT * FROM imports WHERE id = ?').get(id) as ImportRow);
  })();
}

export type ActionResult = { ok: true; record: ImportRecord } | { ok: false; error: 'not_found' | 'expired' | 'bad_state' };

function load(db: Db, userId: number, id: number, clock: Clock): { row: ImportRow } | { error: 'not_found' | 'expired' } {
  const row = db.prepare('SELECT * FROM imports WHERE id = ? AND user_id = ?').get(id, userId) as ImportRow | undefined;
  if (!row) return { error: 'not_found' };
  if (clock().getTime() > new Date(record(row).undoUntil).getTime()) return { error: 'expired' };
  return { row };
}

/** Убирает всё, что создал импорт, и возвращает заменённое. Отменить можно в течение суток. */
export function undoImport(db: Db, userId: number, id: number, clock: Clock = now): ActionResult {
  return db.transaction((): ActionResult => {
    const found = load(db, userId, id, clock);
    if ('error' in found) return { ok: false, error: found.error };
    const { row } = found;
    if (row.undone_at) return { ok: false, error: 'bad_state' };
    const snap = JSON.parse(row.snapshot) as Snapshot;

    db.prepare('DELETE FROM plan_entries WHERE import_id = ? AND user_id = ?').run(id, userId);
    db.prepare('DELETE FROM workouts WHERE import_id = ? AND user_id = ?').run(id, userId);
    db.prepare('DELETE FROM exercises WHERE import_id = ?').run(id);
    for (const u of snap.updated) db.prepare('UPDATE workouts SET title = ?, blocks = ?, structure = ? WHERE id = ? AND user_id = ?').run(u.title, u.blocks, u.structure ?? null, u.id, userId);
    const restore = db.prepare('INSERT OR IGNORE INTO plan_entries (user_id, date, workout_id, import_id) VALUES (?, ?, ?, ?)');
    for (const r of snap.removed) {
      const importStillThere = r.importId !== null && db.prepare('SELECT 1 FROM imports WHERE id = ?').get(r.importId);
      restore.run(userId, r.date, r.workoutId, importStillThere ? r.importId : null);
    }
    db.prepare('UPDATE imports SET undone_at = ?, snapshot = ? WHERE id = ?').run(clock().toISOString(), JSON.stringify({ removed: [], updated: [] }), id);
    return { ok: true, record: record(db.prepare('SELECT * FROM imports WHERE id = ?').get(id) as ImportRow) };
  })();
}

/** «Вернуть импорт»: записывает то же самое ещё раз. */
export function redoImport(db: Db, userId: number, id: number, clock: Clock = now): ActionResult {
  return db.transaction((): ActionResult => {
    const found = load(db, userId, id, clock);
    if ('error' in found) return { ok: false, error: found.error };
    const { row } = found;
    if (!row.undone_at) return { ok: false, error: 'bad_state' };
    const { summary, snapshot } = apply(db, userId, id, JSON.parse(row.payload) as ImportCommit, clock);
    db.prepare('UPDATE imports SET undone_at = NULL, summary = ?, snapshot = ? WHERE id = ?').run(JSON.stringify(summary), JSON.stringify(snapshot), id);
    return { ok: true, record: record(db.prepare('SELECT * FROM imports WHERE id = ?').get(id) as ImportRow) };
  })();
}
