import type { ExerciseComment, ExerciseHistory, ExerciseHistoryResponse, ExerciseKind, HistorySession, HistorySet, SessionStepResult } from '../shared/types';
import { libraryIndex, libraryOf, type LibraryRow } from './comments';
import type { Db } from './db';
import { effectiveSet } from './today';

/** Сколько последних тренировок с упражнением отдаём списком; всего и тренд считаются по всем */
export const HISTORY_SESSIONS = 20;

export interface HistorySource {
  date: string;
  steps: SessionStepResult[];
}

/** Время подхода в секундах; нет обеих меток или они перепутаны (часы ушли назад) — нет и времени */
export function stepSec(st: SessionStepResult): number | undefined {
  const { startedAt, endedAt } = st;
  if (typeof startedAt !== 'number' || typeof endedAt !== 'number' || endedAt < startedAt) return undefined;
  return Math.round((endedAt - startedAt) / 1000);
}

/** Медиана; пустой список — undefined. Чётное число замеров — среднее двух средних, округлённое */
export function median(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  const a = [...nums].sort((x, y) => x - y);
  const mid = a.length >> 1;
  return a.length % 2 ? a[mid]! : Math.round((a[mid - 1]! + a[mid]!) / 2);
}

/** Сколько замеров нужно, чтобы говорить о типичном времени подхода */
const MIN_TIMED_SETS = 2;

const setOf = (kind: ExerciseKind, st: SessionStepResult): HistorySet => {
  const { weight, value } = effectiveSet(st);
  const timeSec = stepSec(st);
  return { ...(kind === 'weight' ? { weight, value } : { value }), ...(timeSec === undefined ? {} : { timeSec }) };
};
/** Сумма времени подходов, если оно известно у каждого; частичную сумму не отдаём */
const totalOf = (sets: HistorySet[]): number | undefined =>
  sets.every((s) => s.timeSec !== undefined) ? sets.reduce((n, s) => n + s.timeSec!, 0) : undefined;

/** Чем больше, тем лучше: вес, потом повторы; повторы или секунды */
const score = (s: HistorySet): number[] => [s.weight ?? 0, s.value];
const better = (a: number[], b: number[]) => (a[0]! !== b[0]! ? a[0]! > b[0]! : (a[1] ?? 0) > (b[1] ?? 0));

/**
 * История упражнений по выполненным тренировкам. Подход относим к упражнению библиотеки по названию или псевдониму
 * (у тренировки свои id), поэтому замена упражнения по ходу тренировки идёт в историю того, что делали на самом деле.
 * Рекорд — лучший подход, дата — первый день с этим результатом; первая тренировка рекордом не считается.
 */
export function exerciseHistories(sessions: HistorySource[], library: LibraryRow[]): ExerciseHistory[] {
  const index = libraryIndex(library);
  type Acc = { id: string; best: { set: HistorySet; score: number[]; date: string } | null; days: HistorySession[]; trend: number[]; times: number[] };
  const byId = new Map<string, Acc>();
  for (const sess of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    const sets = new Map<string, HistorySet[]>();
    for (const st of sess.steps) {
      if (!st.completed) continue;
      const lib = index.get(st.exerciseName.trim().toLowerCase());
      if (!lib) continue;
      sets.set(lib.slug, [...(sets.get(lib.slug) ?? []), setOf(st.kind, st)]);
    }
    for (const [id, list] of sets) {
      const acc = byId.get(id) ?? { id, best: null, days: [], trend: [], times: [] };
      byId.set(id, acc);
      const first = acc.best === null;
      let improved = false;
      for (const set of list) {
        const sc = score(set);
        if (!acc.best || better(sc, acc.best.score)) {
          acc.best = { set, score: sc, date: sess.date };
          improved = true;
        }
      }
      const top = list.map(score).reduce((a, b) => (better(b, a) ? b : a));
      acc.trend.push(list[0]!.weight === undefined ? top[1]! : top[0]!);
      const totalSec = totalOf(list);
      for (const set of list) if (set.timeSec !== undefined) acc.times.push(set.timeSec);
      acc.days.push({ date: sess.date, sets: list, ...(totalSec === undefined ? {} : { totalSec }), ...(improved && !first ? { isRecord: true as const } : {}) });
    }
  }
  return [...byId.values()].map((a) => {
    const { weight, value } = a.best!.set;
    const typicalSetSec = a.times.length >= MIN_TIMED_SETS ? median(a.times) : undefined;
    return {
      id: a.id,
      record: { ...(weight === undefined ? {} : { weight }), value, date: a.best!.date },
      sessionsTotal: a.days.length,
      sessions: a.days.slice(-HISTORY_SESSIONS).reverse(),
      trend: a.trend,
      ...(typicalSetSec === undefined ? {} : { typicalSetSec }),
    };
  });
}

/** GET /api/exercises/history: выполненные тренировки пользователя */
export function exerciseHistoryOf(db: Db, userId: number): ExerciseHistoryResponse {
  const rows = db.prepare('SELECT date, steps FROM sessions_done WHERE user_id = ? ORDER BY date, id').all(userId) as Array<{ date: string; steps: string }>;
  const sessions = rows.map((r) => ({ date: r.date, steps: JSON.parse(r.steps) as SessionStepResult[] }));
  return { history: exerciseHistories(sessions, libraryOf(db)), comments: exerciseCommentsOf(db, userId) };
}

/**
 * Комментарии тренера к упражнениям: к видео подхода и к самому упражнению; ответы спортсмена не в счёт.
 * У комментария к видео slug пуст, остаётся только название из тренировки: находим упражнение по названию или псевдониму.
 */
export function exerciseCommentsOf(db: Db, userId: number): Record<string, ExerciseComment[]> {
  const rows = db
    .prepare('SELECT id, exercise_slug, exercise_name, text, created_at FROM comments WHERE athlete_id = ? AND author_id <> athlete_id ORDER BY created_at DESC, id DESC')
    .all(userId) as Array<{ id: number; exercise_slug: string | null; exercise_name: string; text: string; created_at: string }>;
  const index = libraryIndex(libraryOf(db));
  const out: Record<string, ExerciseComment[]> = {};
  for (const r of rows) {
    const slug = r.exercise_slug ?? index.get(r.exercise_name.trim().toLowerCase())?.slug;
    if (!slug) continue;
    const list = out[slug] ?? [];
    list.push({ id: String(r.id), createdAt: r.created_at, text: r.text });
    out[slug] = list;
  }
  return out;
}
