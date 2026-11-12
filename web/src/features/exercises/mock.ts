import { createExercise, emptyDraft } from './library';
import type { ExerciseDefaults, ExerciseSession, LibraryExercise, MuscleGroupId, SessionComment, SessionVideo, SetResult } from './types';
import type { ExerciseKind } from '../../../../shared/types';

/** Моки для историй и пока единственный источник данных вкладки. Заменятся на API. */

const SAT = 'Сб, 31 окт · Ноги и ягодицы';
const SUN = 'Вс, 1 ноя · Всё тело';
const DATES = ['', '19 окт', '12 окт', '5 окт', '28 сен', '21 сен', '14 сен', '7 сен'];

interface Media {
  videos?: SessionVideo[];
  comments?: SessionComment[];
}

/** Последняя тренировка — lastSets, остальные выводятся из динамики лучшего подхода */
function sessions(
  kind: ExerciseKind,
  trend: number[],
  lastDate: string,
  lastSets: SetResult[],
  media: Record<number, Media> = {},
): ExerciseSession[] {
  const best = Math.max(...trend);
  const recordIdx = trend.indexOf(best);
  return [...trend].reverse().map((v, i) => {
    let sets: SetResult[];
    if (i === 0) sets = lastSets;
    else if (kind === 'weight') {
      sets = lastSets.map((s, j) => ({ weight: v, reps: j === lastSets.length - 1 && i % 2 ? Math.max(1, (s.reps ?? 1) - 1) : s.reps }));
    } else if (kind === 'reps') sets = [{ reps: v }, { reps: v }, { reps: Math.max(1, v - 1) }];
    else sets = [{ seconds: v }, { seconds: Math.max(10, v - 10) }, { seconds: Math.max(10, v - 15) }];
    return {
      date: i === 0 ? lastDate : DATES[i],
      sets,
      isRecord: trend.length - 1 - i === recordIdx,
      videos: media[i]?.videos ?? [],
      comments: media[i]?.comments ?? [],
    };
  });
}

interface Spec {
  id: string;
  name: string;
  group: MuscleGroupId;
  muscles: string[];
  equipment: string;
  kind: ExerciseKind;
  pair?: boolean;
  defaults: Partial<ExerciseDefaults>;
  record: SetResult & { date: string };
  total: number;
  trend: number[];
  lastDate: string;
  lastSets: SetResult[];
  plan?: string;
  media?: Record<number, Media>;
}

function make(s: Spec): LibraryExercise {
  return {
    id: s.id, name: s.name, kind: s.kind, group: s.group, muscles: s.muscles, equipment: s.equipment, pair: s.pair,
    defaults: { reps: 10, weight: 20, seconds: 30, ...s.defaults },
    record: s.record, sessionsTotal: s.total, trend: s.trend, plan: s.plan,
    sessions: sessions(s.kind, s.trend, s.lastDate, s.lastSets, s.media),
  };
}

const w = (weight: number, reps: number): SetResult => ({ weight, reps });
const r = (reps: number): SetResult => ({ reps });
const t = (seconds: number): SetResult => ({ seconds });

export const squat = make({
  id: 'squat', name: 'Приседания со штангой', group: 'legs', muscles: ['Квадрицепс', 'Ягодицы'], equipment: 'Штанга',
  kind: 'weight', defaults: { reps: 5, weight: 80 }, record: { weight: 80, reps: 5, date: '28 окт' }, total: 14,
  trend: [60, 62.5, 65, 67.5, 70, 72.5, 75, 80], lastDate: '28 окт', lastSets: [w(80, 5), w(80, 5), w(80, 5), w(80, 4)], plan: SAT,
  media: {
    0: { videos: [{ title: 'Подход 4 · 80 кг × 4', duration: '0:21' }], comments: [{ author: 'Настя', text: 'Глубина хорошая. На последнем повторе колени немного заваливаются внутрь.' }] },
    2: { videos: [{ title: 'Подход 1 · 75 кг × 5', duration: '0:19' }], comments: [{ author: 'Настя', text: 'Спина ровная всю амплитуду, можно добавлять вес.' }] },
    4: { comments: [{ author: 'Никита', text: 'Колено немного тянуло, в следующий раз разминаться дольше.' }] },
  },
});

export const pullup = make({
  id: 'pullup', name: 'Подтягивания', group: 'back', muscles: ['Широчайшие', 'Бицепс'], equipment: 'Турник', kind: 'reps',
  defaults: { reps: 6 }, record: { reps: 6, date: '12 окт' }, total: 10, trend: [2, 3, 3, 4, 4, 5, 6, 5], lastDate: '26 окт',
  lastSets: [r(5), r(5), r(4)], plan: SUN,
  media: {
    0: { videos: [{ title: 'Подход 1 · 5 повторов', duration: '0:18' }], comments: [{ author: 'Настя', text: 'Последний повтор с рывком, попробуй опускаться медленнее.' }] },
    1: { videos: [{ title: 'Подход 1 · 6 повторов', duration: '0:20' }] },
  },
});

export const plank = make({
  id: 'plank', name: 'Планка', group: 'core', muscles: ['Пресс', 'Кор'], equipment: 'Без снаряда', kind: 'time',
  defaults: { seconds: 90 }, record: { seconds: 105, date: '21 окт' }, total: 15, trend: [60, 70, 75, 80, 90, 95, 105, 90],
  lastDate: '28 окт', lastSets: [t(90), t(80), t(75)], plan: SUN,
  media: {
    0: { videos: [{ title: 'Подход 1 · 1:30', duration: '1:30' }], comments: [{ author: 'Настя', text: 'Под конец таз начал проседать, но держался ровно до последних секунд.' }] },
    3: { comments: [{ author: 'Никита', text: 'Первый раз продержался полторы минуты.' }] },
  },
});

const rest: LibraryExercise[] = [
  make({ id: 'rdl', name: 'Румынская тяга', group: 'legs', muscles: ['Бицепс бедра', 'Ягодицы'], equipment: 'Штанга', kind: 'weight',
    defaults: { reps: 10, weight: 50 }, record: { weight: 55, reps: 8, date: '17 окт' }, total: 11, trend: [40, 40, 42.5, 45, 47.5, 50, 52.5, 55],
    lastDate: '22 окт', lastSets: [w(50, 10), w(50, 10), w(50, 9)], plan: SAT }),
  make({ id: 'lunge', name: 'Выпады с гантелями', group: 'legs', muscles: ['Квадрицепс', 'Ягодицы'], equipment: 'Гантели', kind: 'weight', pair: true,
    defaults: { reps: 12, weight: 12 }, record: { weight: 14, reps: 12, date: '15 окт' }, total: 9, trend: [8, 10, 10, 10, 12, 12, 14, 14],
    lastDate: '22 окт', lastSets: [w(12, 12), w(12, 12), w(12, 12)], plan: SAT }),
  make({ id: 'pulldown', name: 'Тяга верхнего блока', group: 'back', muscles: ['Широчайшие', 'Бицепс'], equipment: 'Тренажёр', kind: 'weight',
    defaults: { reps: 10, weight: 55 }, record: { weight: 55, reps: 10, date: '26 окт' }, total: 13, trend: [40, 42.5, 45, 45, 47.5, 50, 52.5, 55],
    lastDate: '26 окт', lastSets: [w(55, 10), w(55, 10), w(52.5, 10), w(52.5, 10)] }),
  make({ id: 'bench', name: 'Жим штанги лёжа', group: 'chest', muscles: ['Грудь', 'Трицепс'], equipment: 'Штанга', kind: 'weight',
    defaults: { reps: 8, weight: 57.5 }, record: { weight: 62.5, reps: 5, date: '5 окт' }, total: 13, trend: [45, 47.5, 50, 52.5, 55, 62.5, 57.5, 57.5],
    lastDate: '26 окт', lastSets: [w(57.5, 8), w(57.5, 8), w(57.5, 7), w(57.5, 6)], plan: SUN }),
  make({ id: 'pushup', name: 'Отжимания', group: 'chest', muscles: ['Грудь', 'Трицепс'], equipment: 'Без снаряда', kind: 'reps',
    defaults: { reps: 25 }, record: { reps: 25, date: '30 сен' }, total: 7, trend: [12, 14, 15, 18, 20, 22, 25, 20],
    lastDate: '14 окт', lastSets: [r(20), r(18), r(15)] }),
  make({ id: 'biceps', name: 'Подъём гантелей на бицепс', group: 'arms', muscles: ['Бицепс'], equipment: 'Гантели', kind: 'weight', pair: true,
    defaults: { reps: 10, weight: 12 }, record: { weight: 12, reps: 10, date: '12 окт' }, total: 9, trend: [7, 8, 8, 10, 10, 10, 12, 12],
    lastDate: '26 окт', lastSets: [w(12, 8), w(12, 8), w(10, 10)] }),
  make({ id: 'rope', name: 'Прыжки на скакалке', group: 'cardio', muscles: ['Икры', 'Выносливость'], equipment: 'Скакалка', kind: 'time',
    defaults: { seconds: 180 }, record: { seconds: 180, date: '14 окт' }, total: 6, trend: [60, 75, 90, 100, 120, 150, 180, 150],
    lastDate: '28 окт', lastSets: [t(150), t(120), t(120)] }),
];

/** Упражнение, которое ещё ни разу не выполнялось */
export const fresh: LibraryExercise = createExercise(
  { ...emptyDraft(), name: 'Болгарские выпады', muscles: ['Квадрицепс', 'Ягодицы'], equipment: 'Гантели', params: { reps: 10, weight: 12, seconds: 30 } },
  'bulgarian',
);

export const exerciseLibrary: LibraryExercise[] = [squat, ...rest.slice(0, 3), pullup, ...rest.slice(3, 5), ...rest.slice(5, 6), plank, rest[6], fresh];

/** Приседания с метками времени: у свежих тренировок время есть, у самой старой нет, у одной известно не у всех подходов */
export const squatTimed: LibraryExercise = {
  ...squat,
  typicalSetSec: 45,
  sessions: squat.sessions.map((s, i, all) => {
    if (i === all.length - 1) return s;
    const times = [40 + i, 45, 52 + i, 48].slice(0, s.sets.length);
    const sets = s.sets.map((x, j) => (i === 2 && j === 0 ? x : { ...x, timeSec: times[j] ?? 45 }));
    return { ...s, sets, ...(i === 2 ? {} : { totalSec: times.reduce((a, b) => a + b, 0) + (s.sets.length > times.length ? 45 * (s.sets.length - times.length) : 0) }) };
  }),
};
