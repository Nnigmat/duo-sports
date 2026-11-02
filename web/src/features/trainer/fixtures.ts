import type { AthleteListResponse, AthleteRow, AthleteSessionsResponse, ExerciseCommentItem, Workout } from '../../../../shared/types';

/** Данные макета «Тренер · Ученики»; сегодня 3 ноября 2026 */
export const TODAY = '2026-11-03';

export const athletesFixture: AthleteRow[] = [
  {
    id: 1,
    name: 'Никита Н.',
    email: 'nikita@example.com',
    goal: 'Сила · 4 дня в неделю',
    lastSession: { date: '2026-11-02', title: 'Всё тело' },
    done7: 4,
    planned7: 4,
    status: 'review',
    waitingSessions: 1,
    waitingVideos: 2,
    daysSinceLast: 1,
  },
  {
    id: 2,
    name: 'Алексей П.',
    email: 'alexey@example.com',
    goal: 'Общая форма',
    lastSession: { date: '2026-10-23', title: 'Всё тело' },
    done7: 0,
    planned7: 2,
    status: 'inactive',
    waitingSessions: 0,
    waitingVideos: 0,
    daysSinceLast: 11,
  },
  {
    id: 3,
    name: 'Дмитрий С.',
    email: 'dmitry@example.com',
    goal: null,
    lastSession: { date: '2026-10-31', title: 'Спина' },
    done7: 4,
    planned7: 4,
    status: 'ok',
    waitingSessions: 0,
    waitingVideos: 0,
    daysSinceLast: 3,
  },
];

export const countsFixture: AthleteListResponse['counts'] = { all: 3, review: 1, inactive: 1, ok: 1 };

export const sessionsFixture: AthleteSessionsResponse = {
  planned: [
    { kind: 'planned', date: '2026-11-03', workoutId: 11, title: 'Верх тела', exerciseCount: 4 },
    { kind: 'moved', date: '2026-11-04', workoutId: 12, title: 'Кардио и пресс', exerciseCount: 3, movedTo: '2026-11-06' },
    { kind: 'planned', date: '2026-11-05', workoutId: 13, title: 'Ноги и ягодицы', exerciseCount: 3 },
    { kind: 'planned', date: '2026-11-06', workoutId: 12, title: 'Кардио и пресс', exerciseCount: 3, movedFrom: '2026-11-04' },
  ],
  history: [
    { sessionId: 8, date: '2026-11-02', title: 'Всё тело', durationSec: 46 * 60, volumeKg: 4380, setsDone: 20, videos: 2, reviewedAt: null, newFromAthlete: 1 },
    { sessionId: 7, date: '2026-10-31', title: 'Ноги и ягодицы', durationSec: 48 * 60, volumeKg: 5840, setsDone: 10, videos: 1, reviewedAt: '2026-11-01T19:40:00', newFromAthlete: 0, movedFrom: '2026-10-29' },
    { sessionId: 6, date: '2026-10-28', title: 'Кардио и пресс', durationSec: 43 * 60, volumeKg: 0, setsDone: 7, videos: 0, reviewedAt: '2026-10-29T09:00:00', newFromAthlete: 0 },
  ],
};

export const pastCommentsFixture: Record<string, ExerciseCommentItem[]> = {
  'Приседания со штангой': [
    { id: 'p1', date: '2026-10-21', timecodeSec: 18, text: 'Колени чуть заваливаются внутрь на подъёме, следим.' },
    { id: 'p2', date: '2026-10-14', timecodeSec: null, text: 'Не отрывай пятки внизу.' },
    { id: 'p3', date: '2026-10-10', timecodeSec: null, text: 'Вдох перед опусканием, корпус жёсткий.' },
    { id: 'p4', date: '2026-10-07', timecodeSec: 15, text: 'Хорошая глубина, продолжай так.' },
  ],
};

export const libraryFixture = [
  { id: 'bench', name: 'Жим лёжа', aliases: [] as string[] },
  { id: 'lat-pulldown', name: 'Тяга верхнего блока', aliases: [] as string[] },
  { id: 'squat', name: 'Приседания со штангой', aliases: [] as string[] },
];

export const plannedWorkoutFixture: Workout = {
  id: '11',
  title: 'Верх тела',
  blocks: [
    { id: 'b0', mode: 'sets', title: 'Силовая', restSec: 90, videoRounds: [], exercises: [
      { id: 'b0-e0', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 62.5, sets: 4 },
      { id: 'b0-e1', name: 'Тяга верхнего блока', kind: 'weight', target: { min: 10, max: 10 }, weight: 57.5, sets: 3 },
    ] },
    { id: 'b1', mode: 'circuit', title: 'Круг', rounds: 3, restSec: 30, videoRounds: [], exercises: [{ id: 'b1-e0', name: 'Круг: мост, выпады', kind: 'reps', target: { min: 12, max: 12 } }] },
  ],
};
