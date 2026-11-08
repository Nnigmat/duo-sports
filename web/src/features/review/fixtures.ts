import type { SessionReviewResponse } from '../../../../shared/types';

const NB = ' ';
const V = '11111111-1111-4111-8111-111111111111';

/** Данные макета «Ученик · Разбор от тренера» */
export const reviewFixture: SessionReviewResponse = {
  sessionId: 7,
  athleteId: 1,
  title: 'Ноги и ягодицы',
  date: '2026-10-31',
  durationSec: 48 * 60,
  feeling: 4,
  feelingLabel: 'Хорошо',
  feedbackComment: 'Колено после третьего подхода ныло, но терпимо.',
  volumeKg: 5840,
  reviewedAt: '2026-11-01T19:40:00',
  trainerCommentCount: 4,
  general: [],
  exercises: [
    {
      id: '1:e0',
      name: 'Приседания со штангой',
      slug: 'squat',
      sets: [
        { n: 1, label: `75${NB}кг × 5`, completed: true },
        { n: 2, label: `80${NB}кг × 5`, completed: true, actualLabel: `85${NB}кг × 6`, factMark: 'Больше плана', extraWeight: true },
        { n: 3, label: `80${NB}кг × 5`, completed: true, actualLabel: `80${NB}кг × 4`, factMark: 'Меньше плана' },
        { n: 4, label: `80${NB}кг × 5`, completed: true, videoId: V, videoDurationSec: 38 },
      ],
      note: 'Последний повтор дался тяжело.',
      newCount: 3,
      thread: [
        { id: '1', author: 'trainer', text: 'Глубина отличная, бедро ниже параллели — так и держим.', timecodeSec: 9, videoId: V, createdAt: '2026-11-01T19:30:00', isNew: true },
        { id: '2', author: 'trainer', text: 'На 4-м повторе колени уходят внутрь. Думай «раздвинуть пол» стопами.', timecodeSec: 21, videoId: V, createdAt: '2026-11-01T19:31:00', isNew: true },
        { id: '3', author: 'trainer', text: `Последний повтор медленный, но техника держится. В следующий раз 82,5${NB}кг.`, timecodeSec: 31, videoId: V, createdAt: '2026-11-01T19:32:00', isNew: true },
        { id: '4', author: 'athlete', text: 'Понял, попробую с паузой внизу на разминочных.', timecodeSec: null, videoId: null, createdAt: '2026-11-02T08:00:00', isNew: false },
      ],
    },
    {
      id: '1:e1',
      name: 'Румынская тяга',
      slug: 'rdl',
      sets: [1, 2, 3].map((n) => ({ n, label: `50${NB}кг × 10`, completed: true })),
      note: null,
      newCount: 1,
      thread: [{ id: '5', author: 'trainer', text: `Спину держишь хорошо. На следующей можно 52,5${NB}кг.`, timecodeSec: null, videoId: null, createdAt: '2026-11-01T19:33:00', isNew: true }],
    },
    {
      id: '2:e2',
      name: 'Круг: мост, выпады, отведения',
      slug: null,
      sets: [1, 2, 3].map((n) => ({ n, label: `Круг ${n}`, completed: true })),
      note: null,
      newCount: 0,
      thread: [],
    },
  ],
  hints: {
    date: '2026-11-05',
    workoutId: 3,
    title: 'Ноги и ягодицы',
    hints: [{ exerciseName: 'Приседания со штангой', detail: `82,5${NB}кг`, text: 'Разминочные подходы — с паузой внизу. Колени над стопами.' }],
  },
};

export const reviewPendingFixture: SessionReviewResponse = {
  ...reviewFixture,
  reviewedAt: null,
  trainerCommentCount: 0,
  hints: null,
  exercises: reviewFixture.exercises.map((e) => ({ ...e, thread: [], newCount: 0 })),
};
