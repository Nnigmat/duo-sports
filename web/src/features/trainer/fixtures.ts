import type { AthleteListResponse, AthleteRow } from '../../../../shared/types';

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
