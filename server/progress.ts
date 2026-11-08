import type { ProgressRecord, SessionStepResult } from '../shared/types';
import { actualLabel } from './sessionReview';
import { addDays, effectiveSet, sessionVolume, weekStart } from './today';

export interface ProgressSession {
  date: string;
  steps: SessionStepResult[];
}

/** Тонны по неделям с понедельника, старые первыми; последняя — неделя `today`. Пустые недели — 0. */
export function weeklyVolumes(sessions: ProgressSession[], today: string, weeks = 8): Array<{ weekStart: string; tons: number }> {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const kg = new Map<string, number>();
  for (const s of sessions) {
    if (s.date < first || s.date > today) continue;
    const k = weekStart(s.date);
    kg.set(k, (kg.get(k) ?? 0) + sessionVolume(s.steps));
  }
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(first, 7 * i);
    return { weekStart: start, tons: Math.round(((kg.get(start) ?? 0) / 1000) * 10) / 10 };
  });
}

/** Результат подхода для сравнения: вес и повторы, повторы или секунды; чем больше, тем лучше */
const score = (s: SessionStepResult): number[] => {
  const { weight, value } = effectiveSet(s);
  return s.kind === 'weight' ? [weight, value] : [value];
};
const better = (a: number[], b: number[]) => (a[0]! !== b[0]! ? a[0]! > b[0]! : (a[1] ?? 0) > (b[1] ?? 0));

export const RECORD_WINDOW_DAYS = 30;

/**
 * Лучший выполненный подход по каждому упражнению (названия без учёта регистра) и счёт улучшений за последние 30 дней.
 * Дата рекорда — первый день, когда этот результат показан. Первый подход упражнения рекордом не считается.
 */
export function recordsOf(sessions: ProgressSession[], today: string, limit = 8): { records: ProgressRecord[]; recordsMonth: number } {
  const best = new Map<string, { name: string; step: SessionStepResult; score: number[]; date: string }>();
  const since = addDays(today, -(RECORD_WINDOW_DAYS - 1));
  let recordsMonth = 0;
  for (const sess of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    // Несколько улучшений одного упражнения за тренировку — один рекорд
    const improved = new Set<string>();
    for (const st of sess.steps) {
      if (!st.completed) continue;
      const key = st.exerciseName.trim().toLowerCase();
      const sc = score(st);
      const cur = best.get(key);
      if (!cur) best.set(key, { name: st.exerciseName, step: st, score: sc, date: sess.date });
      else if (better(sc, cur.score)) {
        best.set(key, { name: cur.name, step: st, score: sc, date: sess.date });
        if (sess.date >= since && sess.date <= today) improved.add(key);
      }
    }
    recordsMonth += improved.size;
  }
  const records = [...best.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'ru'))
    .slice(0, limit)
    .map((b) => ({ exerciseName: b.name, label: actualLabel(b.step), date: b.date }));
  return { records, recordsMonth };
}
