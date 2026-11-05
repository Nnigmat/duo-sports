import type { AchievementItem, AchievementsResponse, SessionStepResult } from '../shared/types';
import { addDays, sessionVolume, streakWeeks, weekStart } from './today';

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** «2026-10-26» -> «26 окт» */
export function dateLabel(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;
}

export interface AchievementSession {
  workoutId: number | null;
  date: string;
  steps: SessionStepResult[];
  /** Записанных видео */
  videos: number;
  /** В тренировке есть круговой блок; неизвестно без структуры */
  hasCircuit: boolean;
}
export interface AchievementsInput {
  today: string;
  entries: Array<{ date: string; workoutId: number }>;
  /** Паузы плана: недели с паузой не обрывают текущую серию */
  pauses?: Array<{ from: string; to: string }>;
  /** От старых к новым */
  sessions: AchievementSession[];
}

type Levels = [number, number, number];
type Point = { date: string; value: number };

/** Уровень и даты по ряду «дата, значение к этой дате»: уровень получен, когда значение впервые достигло порога. */
export function tiersFrom(points: Point[], levels: Levels): { tier: 0 | 1 | 2 | 3; earnedDates: string[] } {
  const earnedDates: string[] = [];
  for (const level of levels) {
    const hit = points.find((p) => p.value >= level);
    if (!hit) break;
    earnedDates.push(dateLabel(hit.date));
  }
  return { tier: earnedDates.length as 0 | 1 | 2 | 3, earnedDates };
}

/** Накопительный ряд: значение к каждой дате не убывает */
const running = (points: Point[]): Point[] => {
  let best = 0;
  return points.map((p) => {
    best = Math.max(best, p.value);
    return { date: p.date, value: best };
  });
};

const completedSteps = (s: AchievementSession) => s.steps.filter((x) => x.completed);

/** Тренировка пройдена целиком: все подходы выполнены */
export const isFinishedWhole = (s: AchievementSession) => s.steps.length > 0 && s.steps.every((x) => x.completed);

/** Новые личные рекорды по весу: подход тяжелее всех прежних в этом упражнении. Первое выполнение рекордом не считается. */
export function recordPoints(sessions: AchievementSession[]): Point[] {
  const best = new Map<string, number>();
  let count = 0;
  const out: Point[] = [];
  for (const s of sessions) {
    const top = new Map<string, number>();
    for (const x of completedSteps(s)) {
      const w = x.plan.weight;
      if (x.kind !== 'weight' || !w || w <= 0) continue;
      const key = x.exerciseName.toLowerCase();
      top.set(key, Math.max(top.get(key) ?? 0, w));
    }
    for (const [key, w] of top) {
      const prev = best.get(key);
      if (prev !== undefined && w > prev) count++;
      best.set(key, Math.max(prev ?? 0, w));
    }
    out.push({ date: s.date, value: count });
  }
  return out;
}

/** Недели плана, где все тренировки сделаны, от старых к новым; date — последний день этой недели с тренировкой плана */
export function completeWeeks(entries: AchievementsInput['entries'], sessions: AchievementSession[]): Array<{ week: string; date: string }> {
  const done = new Set(sessions.filter((s) => s.workoutId !== null).map((s) => `${s.date}:${s.workoutId}`));
  const byWeek = new Map<string, Array<{ date: string; ok: boolean }>>();
  for (const e of entries) {
    const key = weekStart(e.date);
    byWeek.set(key, [...(byWeek.get(key) ?? []), { date: e.date, ok: done.has(`${e.date}:${e.workoutId}`) }]);
  }
  return [...byWeek.entries()]
    .filter(([, days]) => days.every((d) => d.ok))
    .map(([week, days]) => ({ week, date: days.map((d) => d.date).sort().at(-1)! }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/** Ряд длины серии: каждая выполненная неделя — серия на этот момент */
export function streakPoints(weeks: Array<{ week: string; date: string }>): Point[] {
  let run = 0;
  return weeks.map((w, i) => {
    run = i > 0 && weeks[i - 1]!.week === addDays(w.week, -7) ? run + 1 : 1;
    return { date: w.date, value: run };
  });
}

function item(base: Omit<AchievementItem, 'tier' | 'earnedDates' | 'levels' | 'levelLabels'>, points: Point[], levels: Levels, labels: [string, string, string]): AchievementItem {
  return { ...base, ...tiersFrom(running(points), levels), levels, levelLabels: labels };
}

export function buildAchievements(input: AchievementsInput): AchievementsResponse {
  const { sessions, entries, today, pauses } = input;
  const weeks = completeWeeks(entries, sessions);
  const streak = streakPoints(weeks);
  const count = (pred: (s: AchievementSession) => boolean): Point[] => {
    let n = 0;
    return sessions.map((s) => ({ date: s.date, value: pred(s) ? ++n : n }));
  };
  const volumes = sessions.map((s) => ({ date: s.date, value: sessionVolume(s.steps) }));
  let total = 0;
  const tonnage = volumes.map((v) => {
    total += v.value;
    return { date: v.date, value: total / 1000 };
  });
  const records = recordPoints(sessions);
  let videos = 0;
  const videoPoints = sessions.map((s) => {
    videos += s.videos;
    return { date: s.date, value: videos };
  });
  const last = <T extends Point>(p: T[]) => p.at(-1)?.value ?? 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    categories: [
      {
        id: 'streak',
        name: 'Регулярность',
        note: 'Неделя засчитывается, если все тренировки плана сделаны с понедельника по воскресенье. Перенос внутри недели серию не прерывает.',
        items: [
          {
            ...item({ id: 'no-skips', name: 'Без пропусков', icon: 'flame', description: 'Недели подряд, когда весь план выполнен', streak: true, unit: 'нед' }, streak, [4, 8, 16], ['4 нед', '8 нед', '16 нед']),
            current: streakWeeks(today, entries, sessions.map((s) => ({ ...s, title: '' })), pauses),
          },
          { ...item({ id: 'full-week', name: 'Полная неделя', icon: 'calendar', description: 'Недели с выполненным планом, не обязательно подряд', unit: 'нед' }, weeks.map((w, i) => ({ date: w.date, value: i + 1 })), [1, 10, 25], ['1', '10', '25']), current: weeks.length },
        ],
      },
      {
        id: 'count',
        name: 'Тренировки',
        items: [
          { ...item({ id: 'workouts', name: 'Тренировки', icon: 'dumbbell', description: 'Тренировок за всё время' }, count(() => true), [10, 50, 100], ['10', '50', '100']), current: sessions.length },
          { ...item({ id: 'circuits', name: 'По кругу', icon: 'loop', description: 'Круговых тренировок, пройденных целиком' }, count((s) => s.hasCircuit && isFinishedWhole(s)), [1, 10, 25], ['1', '10', '25']), current: last(count((s) => s.hasCircuit && isFinishedWhole(s))) },
        ],
      },
      {
        id: 'strength',
        name: 'Сила и объём',
        items: [
          { ...item({ id: 'heavy-day', name: 'Тяжёлый день', icon: 'kettlebell', description: 'Поднятый объём за одну тренировку', unit: 'кг' }, volumes, [1000, 3000, 5000], ['1 т', '3 т', '5 т']), current: Math.round(Math.max(0, ...volumes.map((v) => v.value))) },
          { ...item({ id: 'tonnage', name: 'Тоннаж', icon: 'bars', description: 'Суммарный объём за всё время', unit: 'т' }, tonnage, [10, 50, 100], ['10 т', '50 т', '100 т']), current: round1(total / 1000) },
          { ...item({ id: 'records', name: 'Рекорды', icon: 'trophy', description: 'Личных рекордов по весу в упражнениях' }, records, [1, 10, 25], ['1', '10', '25']), current: last(records) },
        ],
      },
      {
        id: 'special',
        name: 'Особые',
        items: [
          { ...item({ id: 'on-video', name: 'На видео', icon: 'video', description: 'Подходов, записанных на видео' }, videoPoints, [1, 10, 50], ['1', '10', '50']), current: videos },
          { id: 'secret', name: 'Секретное', icon: 'secret', description: 'Условие откроется, когда вы его выполните', tier: 0, earnedDates: [], secret: true },
        ],
      },
    ],
  };
}
