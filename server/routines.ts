import type {
  Block, CommitBlock, Range, Routine, RoutineDetail, RoutineInput, RoutineItem, RoutineKind, RoutineSummary,
} from '../shared/types';
import { composeBlocks, routineBlock } from '../shared/routines';
import type { Db } from './db';
import { type Checked, slugify, uniqueSlug } from './exercises';
import { displayBlocks } from './workoutEdit';

type Clock = () => Date;
const now: Clock = () => new Date();

export const ROUTINE_LIMITS = { title: 80, note: 300, items: 30, sec: 3600 };
export const ROUTINES_WRITE_FORBIDDEN = 'Разминки меняют тренер и админ';
export const ROUTINE_NOT_FOUND = 'Разминка не найдена';
export const ROUTINE_DUPLICATE = 'Разминка с таким названием уже есть';
export const ROUTINE_IN_USE = 'Разминка стоит в тренировках';
export const ROUTINE_KIND_IN_USE = 'Вид разминки нельзя менять, пока она стоит в тренировках';
export const ROUTINE_UNKNOWN_EXERCISE = 'Нет такого упражнения в библиотеке';
export const ROUTINE_NOT_TIME = 'В разминке и заминке нужны упражнения с измерением time';

const bad = (error: string): { ok: false; error: string } => ({ ok: false, error });
const KINDS: RoutineKind[] = ['warmup', 'cooldown'];

function secRange(v: unknown): Range | null {
  if (typeof v !== 'object' || v === null) return null;
  const { min, max } = v as Record<string, unknown>;
  if (!Number.isInteger(min) || !Number.isInteger(max)) return null;
  const lo = min as number;
  const hi = max as number;
  if (lo <= 0 || hi < lo || hi > ROUTINE_LIMITS.sec) return null;
  return { min: lo, max: hi };
}

export function validateRoutine(body: unknown): Checked<RoutineInput> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return bad('Нужен объект с полями разминки');
  const b = body as Record<string, unknown>;
  if (!KINDS.includes(b.kind as RoutineKind)) return bad('kind: warmup или cooldown');
  if (typeof b.title !== 'string' || !b.title.trim()) return bad('Нужно название');
  const title = b.title.trim();
  if (title.length > ROUTINE_LIMITS.title) return bad(`Название длиннее ${ROUTINE_LIMITS.title} символов`);
  let note: string | undefined;
  if (b.note !== undefined && b.note !== null) {
    if (typeof b.note !== 'string') return bad('Пояснение: нужна строка');
    note = b.note.trim() || undefined;
    if (note && note.length > ROUTINE_LIMITS.note) return bad(`Пояснение длиннее ${ROUTINE_LIMITS.note} символов`);
  }
  if (!Array.isArray(b.items) || b.items.length === 0) return bad('Нужно хотя бы одно упражнение');
  if (b.items.length > ROUTINE_LIMITS.items) return bad(`Не больше ${ROUTINE_LIMITS.items} упражнений`);
  const items: RoutineInput['items'] = [];
  for (const raw of b.items as unknown[]) {
    if (typeof raw !== 'object' || raw === null) return bad('Упражнение: нужен объект');
    const it = raw as Record<string, unknown>;
    if (typeof it.exercise !== 'string' || !it.exercise) return bad('Упражнение: нужен slug');
    const sec = secRange(it.sec);
    if (!sec) return bad(`Секунды: целые от 1 до ${ROUTINE_LIMITS.sec}, min не больше max`);
    let sides: [string, string] | undefined;
    if (it.sides !== undefined && it.sides !== null) {
      const s = it.sides;
      if (!Array.isArray(s) || s.length !== 2 || s.some((x) => typeof x !== 'string' || !x.trim())) return bad('Стороны: две непустые строки');
      sides = [(s[0] as string).trim(), (s[1] as string).trim()];
    }
    items.push({ exercise: it.exercise, sec, ...(sides ? { sides } : {}) });
  }
  return { ok: true, value: { kind: b.kind as RoutineKind, title, ...(note ? { note } : {}), items } };
}

type RoutineRow = { id: number; slug: string; kind: RoutineKind; title: string; note: string | null };
type ItemRow = { slug: string; name: string; min_sec: number; max_sec: number; sides: string | null };

/** Единственное место, где считается длительность: sides удваивают позицию */
export const totalSec = (items: Array<{ sec: Range; sides?: [string, string] }>): number =>
  items.reduce((sum, it) => sum + it.sec.max * (it.sides ? 2 : 1), 0);

function itemsOf(db: Db, routineId: number): RoutineItem[] {
  const rows = db
    .prepare(
      `SELECT e.slug, e.name, i.min_sec, i.max_sec, i.sides FROM routine_items i
       JOIN exercises e ON e.id = i.exercise_id WHERE i.routine_id = ? ORDER BY i.position`,
    )
    .all(routineId) as ItemRow[];
  return rows.map((r) => ({
    exercise: r.slug,
    name: r.name,
    sec: { min: r.min_sec, max: r.max_sec },
    ...(r.sides ? { sides: JSON.parse(r.sides) as [string, string] } : {}),
  }));
}

function build(db: Db, r: RoutineRow): Routine {
  const items = itemsOf(db, r.id);
  return { id: r.slug, kind: r.kind, title: r.title, ...(r.note ? { note: r.note } : {}), items, totalSec: totalSec(items) };
}

export function routineById(db: Db, id: number): Routine | null {
  const r = db.prepare('SELECT id, slug, kind, title, note FROM routines WHERE id = ?').get(id) as RoutineRow | undefined;
  return r ? build(db, r) : null;
}

const bySlug = (db: Db, slug: string) =>
  db.prepare('SELECT id, slug, kind, title, note FROM routines WHERE slug = ?').get(slug) as RoutineRow | undefined;

const usedByRows = (db: Db, routineId: number) =>
  db
    .prepare('SELECT id AS workoutId, title FROM workouts WHERE warmup_routine_id = @id OR cooldown_routine_id = @id ORDER BY id')
    .all({ id: routineId }) as Array<{ workoutId: number; title: string }>;

export function listRoutines(db: Db, kind?: RoutineKind): RoutineSummary[] {
  const rows = (
    kind
      ? db.prepare('SELECT id, slug, kind, title, note FROM routines WHERE kind = ? ORDER BY id').all(kind)
      : db.prepare('SELECT id, slug, kind, title, note FROM routines ORDER BY id').all()
  ) as RoutineRow[];
  return rows.map((r) => {
    const items = itemsOf(db, r.id);
    return { id: r.slug, kind: r.kind, title: r.title, itemCount: items.length, totalSec: totalSec(items), usedIn: usedByRows(db, r.id).length };
  });
}

/** usedBy — только тренировки viewerId; usedIn считает все */
export function getRoutine(db: Db, slug: string, viewerId: number): RoutineDetail | null {
  const r = bySlug(db, slug);
  if (!r) return null;
  const all = usedByRows(db, r.id);
  const mine = db
    .prepare('SELECT id AS workoutId, title FROM workouts WHERE user_id = @viewer AND (warmup_routine_id = @id OR cooldown_routine_id = @id) ORDER BY id')
    .all({ id: r.id, viewer: viewerId }) as Array<{ workoutId: number; title: string }>;
  return { ...build(db, r), usedIn: all.length, usedBy: mine };
}

type Resolved = { id: number; kind: string };
type WriteError = 'unknown_exercise' | 'not_time' | 'duplicate';

/** Находит упражнения по slug и проверяет, что все они по времени */
function resolveItems(db: Db, input: RoutineInput): { ok: true; rows: Array<{ exerciseId: number }> } | { ok: false; error: WriteError } {
  const rows: Array<{ exerciseId: number }> = [];
  for (const it of input.items) {
    const e = db.prepare('SELECT id, kind FROM exercises WHERE slug = ?').get(it.exercise) as Resolved | undefined;
    if (!e) return { ok: false, error: 'unknown_exercise' };
    if (e.kind !== 'time') return { ok: false, error: 'not_time' };
    rows.push({ exerciseId: e.id });
  }
  return { ok: true, rows };
}

function writeItems(db: Db, routineId: number, input: RoutineInput, rows: Array<{ exerciseId: number }>) {
  db.prepare('DELETE FROM routine_items WHERE routine_id = ?').run(routineId);
  const ins = db.prepare('INSERT INTO routine_items (routine_id, position, exercise_id, min_sec, max_sec, sides) VALUES (?, ?, ?, ?, ?, ?)');
  input.items.forEach((it, i) => ins.run(routineId, i, rows[i]!.exerciseId, it.sec.min, it.sec.max, it.sides ? JSON.stringify(it.sides) : null));
}

const titleTaken = (db: Db, kind: RoutineKind, title: string, exceptId?: number) =>
  !!db
    .prepare('SELECT 1 FROM routines WHERE kind = ? AND lower(title) = lower(?) AND id != ?')
    .get(kind, title, exceptId ?? -1);

export type RoutineWrite = { ok: true; routine: Routine } | { ok: false; error: WriteError };

export function createRoutine(db: Db, input: RoutineInput, importId: number | null = null, clock: Clock = now): RoutineWrite {
  return db.transaction((): RoutineWrite => {
    if (titleTaken(db, input.kind, input.title)) return { ok: false, error: 'duplicate' };
    const resolved = resolveItems(db, input);
    if (!resolved.ok) return resolved;
    const taken = new Set((db.prepare('SELECT slug FROM routines').all() as Array<{ slug: string }>).map((r) => r.slug));
    const slug = uniqueSlug(slugify(input.title), taken);
    const at = clock().toISOString();
    const id = Number(
      db
        .prepare('INSERT INTO routines (slug, kind, title, note, import_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(slug, input.kind, input.title, input.note ?? null, importId, at, at).lastInsertRowid,
    );
    writeItems(db, id, input, resolved.rows);
    return { ok: true, routine: routineById(db, id)! };
  })();
}

export type RoutineUpdate = { ok: true; routine: Routine } | { ok: false; error: WriteError | 'not_found' | 'in_use' };

/** Заменяет состав целиком; slug не меняется. kind менять нельзя, пока разминка используется */
export function updateRoutine(db: Db, slug: string, input: RoutineInput, clock: Clock = now): RoutineUpdate {
  return db.transaction((): RoutineUpdate => {
    const cur = bySlug(db, slug);
    if (!cur) return { ok: false, error: 'not_found' };
    if (cur.kind !== input.kind && usedByRows(db, cur.id).length > 0) return { ok: false, error: 'in_use' };
    if (titleTaken(db, input.kind, input.title, cur.id)) return { ok: false, error: 'duplicate' };
    const resolved = resolveItems(db, input);
    if (!resolved.ok) return resolved;
    db.prepare('UPDATE routines SET kind = ?, title = ?, note = ?, updated_at = ? WHERE id = ?').run(input.kind, input.title, input.note ?? null, clock().toISOString(), cur.id);
    writeItems(db, cur.id, input, resolved.rows);
    return { ok: true, routine: routineById(db, cur.id)! };
  })();
}

export type RoutineDelete =
  | { ok: true }
  | { ok: false; error: 'not_found' }
  | { ok: false; error: 'in_use'; workouts: Array<{ workoutId: number; title: string }> };

export function deleteRoutine(db: Db, slug: string): RoutineDelete {
  return db.transaction((): RoutineDelete => {
    const cur = bySlug(db, slug);
    if (!cur) return { ok: false, error: 'not_found' };
    const workouts = usedByRows(db, cur.id);
    if (workouts.length > 0) return { ok: false, error: 'in_use', workouts };
    db.prepare('DELETE FROM routines WHERE id = ?').run(cur.id);
    return { ok: true };
  })();
}

export type RoutineLinks = { warmup_routine_id: number | null; cooldown_routine_id: number | null };

export const linksOf = (db: Db, workoutId: number): RoutineLinks =>
  (db.prepare('SELECT warmup_routine_id, cooldown_routine_id FROM workouts WHERE id = ?').get(workoutId) as RoutineLinks | undefined) ?? {
    warmup_routine_id: null,
    cooldown_routine_id: null,
  };

function linkedBlocks(db: Db, links: RoutineLinks) {
  const at = (id: number | null) => {
    const r = id === null ? null : routineById(db, id);
    return r && id !== null ? routineBlock(r, id) : null;
  };
  return { warmup: at(links.warmup_routine_id), cooldown: at(links.cooldown_routine_id) };
}

/** Структура тренировки для экрана: сохранённые блоки, обёрнутые подключёнными разминкой и заминкой. null — структуры нет. */
export function composeStructure(db: Db, row: RoutineLinks & { structure: string | null }): Block[] | null {
  if (!row.structure) return null;
  const main = JSON.parse(row.structure) as Block[];
  const { warmup, cooldown } = linkedBlocks(db, row);
  return composeBlocks(main, warmup, cooldown);
}

/** Блоки для списков и оценки минут: подключённые разминка и заминка вокруг сохранённых */
export function composeDisplay(db: Db, row: RoutineLinks & { blocks: string }): CommitBlock[] {
  const main = JSON.parse(row.blocks) as CommitBlock[];
  const { warmup, cooldown } = linkedBlocks(db, row);
  const wrap = (b: ReturnType<typeof routineBlock> | null) => (b && b.exercises.length > 0 ? displayBlocks([b]) : []);
  return [...wrap(warmup), ...main, ...wrap(cooldown)];
}
