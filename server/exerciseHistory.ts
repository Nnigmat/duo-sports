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

const setOf = (kind: ExerciseKind, st: SessionStepResult): HistorySet => {
  const { weight, value } = effectiveSet(st);
  return kind === 'weight' ? { weight, value } : { value };
};
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
  type Acc = { id: string; best: { set: HistorySet; score: number[]; date: string } | null; days: HistorySession[]; trend: number[] };
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
      const acc = byId.get(id) ?? { id, best: null, days: [], trend: [] };
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
      acc.days.push({ date: sess.date, sets: list, ...(improved && !first ? { isRecord: true as const } : {}) });
    }
  }
  return [...byId.values()].map((a) => ({
    id: a.id,
    record: { ...a.best!.set, date: a.best!.date },
    sessionsTotal: a.days.length,
    sessions: a.days.slice(-HISTORY_SESSIONS).reverse(),
    trend: a.trend,
  }));
}

/** GET /api/exercises/history: выполненные тренировки пользователя */
export function exerciseHistoryOf(db: Db, userId: number): ExerciseHistoryResponse {
  const rows = db.prepare('SELECT date, steps FROM sessions_done WHERE user_id = ? ORDER BY date, id').all(userId) as Array<{ date: string; steps: string }>;
  const sessions = rows.map((r) => ({ date: r.date, steps: JSON.parse(r.steps) as SessionStepResult[] }));
  return { history: exerciseHistories(sessions, libraryOf(db)), comments: exerciseCommentsOf(db, userId) };
}

/** Комментарии тренера к упражнениям: к видео подхода и к самому упражнению; ответы спортсмена не в счёт */
export function exerciseCommentsOf(db: Db, userId: number): Record<string, ExerciseComment[]> {
  const rows = db
    .prepare('SELECT id, exercise_slug, text, created_at FROM comments WHERE athlete_id = ? AND author_id <> athlete_id AND exercise_slug IS NOT NULL ORDER BY created_at DESC, id DESC')
    .all(userId) as Array<{ id: number; exercise_slug: string; text: string; created_at: string }>;
  const out: Record<string, ExerciseComment[]> = {};
  for (const r of rows) {
    const list = out[r.exercise_slug] ?? [];
    list.push({ id: String(r.id), createdAt: r.created_at, text: r.text });
    out[r.exercise_slug] = list;
  }
  return out;
}
