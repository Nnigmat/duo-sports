import type { ExerciseInput, ExerciseKind, LibraryEntry, MuscleGroupId } from '../shared/types';
import type { Db } from './db';
import { GROUPS, libraryOf } from './imports';

type Clock = () => Date;
const now: Clock = () => new Date();

const KINDS: ExerciseKind[] = ['reps', 'weight', 'time'];
export const EXERCISE_LIMITS = { name: 80, list: 12, item: 60, notes: 4000, video: 500 };
export const EXERCISES_WRITE_FORBIDDEN = 'Упражнения меняют тренер и админ';

// ── Слаг ──────────────────────────────────────────────────

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** «Жим лёжа» → «zhim-lezha»; пустой результат → «exercise». */
export function slugify(name: string): string {
  const latin = [...name.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join('');
  return latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'exercise';
}

/** Первый свободный слаг: base, base-2, base-3… */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ── Валидация ─────────────────────────────────────────────

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };
const bad = (error: string): { ok: false; error: string } => ({ ok: false, error });

function list(v: unknown, field: string): Checked<string[]> {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) return bad(`${field}: нужен список строк`);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of v as string[]) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > EXERCISE_LIMITS.item) return bad(`${field}: элемент длиннее ${EXERCISE_LIMITS.item} символов`);
    if (seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  if (out.length > EXERCISE_LIMITS.list) return bad(`${field}: не больше ${EXERCISE_LIMITS.list} элементов`);
  return { ok: true, value: out };
}

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Проверяет и нормализует поля; отсутствующие пропускает (для PATCH). Пустая строка в notes/video остаётся пустой. */
export function validateFields(body: unknown): Checked<Partial<ExerciseInput>> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return bad('Нужен объект с полями упражнения');
  const b = body as Record<string, unknown>;
  const out: Partial<ExerciseInput> = {};
  if (b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    if (name.length < 1 || name.length > EXERCISE_LIMITS.name) return bad(`Название: от 1 до ${EXERCISE_LIMITS.name} символов`);
    out.name = name;
  }
  if (b.group !== undefined) {
    if (!GROUPS.includes(b.group as MuscleGroupId)) return bad('Группа мышц: неизвестное значение');
    out.group = b.group as MuscleGroupId;
  }
  if (b.kind !== undefined) {
    if (!KINDS.includes(b.kind as ExerciseKind)) return bad('Тип: reps, weight или time');
    out.kind = b.kind as ExerciseKind;
  }
  for (const f of ['muscles', 'aliases'] as const) {
    if (b[f] === undefined) continue;
    const r = list(b[f], f === 'muscles' ? 'Мышцы' : 'Псевдонимы');
    if (!r.ok) return r;
    out[f] = r.value;
  }
  if (b.notes !== undefined) {
    if (typeof b.notes !== 'string' || b.notes.length > EXERCISE_LIMITS.notes) return bad(`Описание: до ${EXERCISE_LIMITS.notes} символов`);
    out.notes = b.notes.trim();
  }
  if (b.video !== undefined) {
    const v = typeof b.video === 'string' ? b.video.trim() : null;
    if (v === null || v.length > EXERCISE_LIMITS.video || (v !== '' && !isHttpUrl(v))) {
      return bad(`Видео: ссылка http или https до ${EXERCISE_LIMITS.video} символов`);
    }
    out.video = v;
  }
  return { ok: true, value: out };
}

export function validateCreate(body: unknown): Checked<ExerciseInput> {
  const r = validateFields(body);
  if (!r.ok) return r;
  const v = r.value;
  if (v.name === undefined) return bad(`Название: от 1 до ${EXERCISE_LIMITS.name} символов`);
  if (v.group === undefined) return bad('Группа мышц: обязательное поле');
  if (v.kind === undefined) return bad('Тип: reps, weight или time');
  return { ok: true, value: { name: v.name, group: v.group, kind: v.kind, muscles: v.muscles ?? [], aliases: v.aliases ?? [], ...(v.notes !== undefined ? { notes: v.notes } : {}), ...(v.video !== undefined ? { video: v.video } : {}) } };
}

// ── База ──────────────────────────────────────────────────

const lower = (s: string) => s.trim().toLowerCase();

/** Есть ли другое упражнение с таким названием или псевдонимом (без учёта регистра). */
export function nameTaken(db: Db, name: string, exceptSlug?: string): boolean {
  const k = lower(name);
  return libraryOf(db).some((e) => e.id !== exceptSlug && [e.name, ...e.aliases].some((n) => lower(n) === k));
}

export const DUPLICATE_ERROR = 'Упражнение с таким названием уже есть';

export type WriteResult = { ok: true; entry: LibraryEntry } | { ok: false; error: 'duplicate' | 'not_found' };

const entryOf = (db: Db, slug: string) => libraryOf(db).find((e) => e.id === slug)!;

export function createExercise(db: Db, input: ExerciseInput, clock: Clock = now): WriteResult {
  return db.transaction((): WriteResult => {
    if (nameTaken(db, input.name)) return { ok: false, error: 'duplicate' };
    const taken = new Set((db.prepare('SELECT slug FROM exercises').all() as Array<{ slug: string }>).map((r) => r.slug));
    const slug = uniqueSlug(slugify(input.name), taken);
    db.prepare(
      `INSERT INTO exercises (slug, name, aliases, muscles, kind, group_id, video_url, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(slug, input.name, JSON.stringify(input.aliases), JSON.stringify(input.muscles), input.kind, input.group, input.video || null, input.notes || null, clock().toISOString());
    return { ok: true, entry: entryOf(db, slug) };
  })();
}

export function updateExercise(db: Db, slug: string, patch: Partial<ExerciseInput>): WriteResult {
  return db.transaction((): WriteResult => {
    const cur = libraryOf(db).find((e) => e.id === slug);
    if (!cur) return { ok: false, error: 'not_found' };
    if (patch.name !== undefined && lower(patch.name) !== lower(cur.name) && nameTaken(db, patch.name, slug)) return { ok: false, error: 'duplicate' };
    const next = {
      name: patch.name ?? cur.name,
      group: patch.group ?? cur.group,
      kind: patch.kind ?? cur.kind,
      muscles: patch.muscles ?? cur.muscles,
      aliases: patch.aliases ?? cur.aliases,
      notes: patch.notes !== undefined ? patch.notes : cur.notes ?? '',
      video: patch.video !== undefined ? patch.video : cur.video ?? '',
    };
    db.prepare('UPDATE exercises SET name = ?, group_id = ?, kind = ?, muscles = ?, aliases = ?, notes = ?, video_url = ? WHERE slug = ?').run(
      next.name, next.group, next.kind, JSON.stringify(next.muscles), JSON.stringify(next.aliases), next.notes || null, next.video || null, slug,
    );
    return { ok: true, entry: entryOf(db, slug) };
  })();
}

export function deleteExercise(db: Db, slug: string): boolean {
  return db.prepare('DELETE FROM exercises WHERE slug = ?').run(slug).changes > 0;
}
