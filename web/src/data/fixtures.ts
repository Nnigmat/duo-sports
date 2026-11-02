export { COMMENTS as workoutComments, TECHNIQUES as workoutTechniques, WORKOUT as workoutFixture } from '../features/workout/WorkoutFlow/mockWorkout';
import { addDays, parseIso } from '../features/plan/plan';
import type { AchievementsData, PlanData, PlanEntry, PlanTemplate, ScheduleData, TodayData, TodayState } from './types';

/** 12 недель по 7 дней; детерминированно, чтобы истории не мигали */
function heatLevels(): Array<0 | 1 | 2 | 3> {
  const out: Array<0 | 1 | 2 | 3> = [];
  for (let w = 0; w < 12; w++) {
    for (let k = 0; k < 7; k++) {
      const trains = k === 0 || k === 2 || k === 3 || k === 6;
      const r = (w * 7 + k * 3 + w * w) % 5;
      out.push(trains && r !== 0 ? (((r % 3) + 1) as 1 | 2 | 3) : 0);
    }
  }
  return out;
}

type Kind = TodayState['kind'];

/** Неделя с 26 октября; суббота (сегодня) зависит от состояния дня */
function weekFor(kind: Kind): TodayData['week'] {
  const sat: TodayData['week'][number] =
    kind === 'done'
      ? { weekday: 'сб', date: '31', status: 'done', today: true, caption: 'Верх тела', fullLabel: 'Сегодня, 31 октября', title: 'Верх тела', meta: '48 мин · 5 840 кг · 2 рекорда', actionLabel: 'Итоги' }
      : kind === 'rest'
        ? { weekday: 'сб', date: '31', status: 'rest', today: true, fullLabel: 'Сегодня, 31 октября', title: 'День отдыха', meta: 'Без тренировки' }
        : { weekday: 'сб', date: '31', status: 'planned', today: true, caption: 'Ноги и ягодицы', fullLabel: 'Сегодня, 31 октября', title: 'Ноги и ягодицы', meta: '5 упражнений · ≈ 50 мин', actionLabel: 'Начать' };
  const thu: TodayData['week'][number] =
    kind === 'rest'
      ? { weekday: 'чт', date: '29', status: 'missed', caption: 'Ноги и ягодицы', fullLabel: 'Четверг, 29 октября', title: 'Ноги и ягодицы', meta: 'Пропущена, план не сдвигался' }
      : { weekday: 'чт', date: '29', status: 'moved', caption: 'Ноги и ягодицы', fullLabel: 'Четверг, 29 октября', title: 'Ноги и ягодицы', meta: 'Перенесена на субботу' };
  return [
    { weekday: 'пн', date: '26', status: 'done', caption: 'Верх тела', fullLabel: 'Понедельник, 26 октября', title: 'Верх тела', meta: '52 мин · 4 120 кг · 18 подходов' },
    { weekday: 'вт', date: '27', status: 'rest', fullLabel: 'Вторник, 27 октября', title: 'День отдыха', meta: 'Без тренировки' },
    { weekday: 'ср', date: '28', status: 'done', caption: 'Кардио и пресс', fullLabel: 'Среда, 28 октября', title: 'Кардио и пресс', meta: '43 мин · 3 круга · рекорд в приседе' },
    thu,
    { weekday: 'пт', date: '30', status: 'rest', fullLabel: 'Пятница, 30 октября', title: 'День отдыха', meta: 'Без тренировки' },
    sat,
    { weekday: 'вс', date: '1', status: 'planned', caption: 'Всё тело', fullLabel: 'Воскресенье, 1 ноября', title: 'Всё тело', meta: '6 упражнений · ≈ 45 мин', actionLabel: 'Перенести' },
  ];
}

export const workoutState: TodayState = {
  kind: 'workout',
  workout: {
    id: 'w1',
    title: 'Ноги и ягодицы',
    whenLabel: 'сегодня, сб 31 окт',
    movedFrom: 'четверга',
    exerciseCount: 5,
    minutes: 50,
    modeLabel: 'Подходами + круг',
    muscles: ['Квадрицепс', 'Ягодицы', 'Бицепс бедра'],
    exercises: [
      { name: 'Приседания со штангой', plan: '4 × 8 · 75 кг' },
      { name: 'Румынская тяга', plan: '3 × 10 · 50 кг' },
      { name: '+ ещё 3 в круге', plan: '3 круга' },
    ],
  },
};

export const restState: TodayState = {
  kind: 'rest',
  next: { whenLabel: 'завтра', title: 'Всё тело', minutes: 45 },
};

export const doneState: TodayState = {
  kind: 'done',
  summary: { title: 'Верх тела', minutes: 48, volumeKg: 5840, records: 2 },
};

export const todayFixture: TodayData = {
  dateLabel: 'Суббота, 31 октября',
  userName: 'Никита',
  state: workoutState,
  week: weekFor('workout'),
  streakWeeks: 3,
  insights: {
    achievements: {
      earnedTiers: 13,
      totalTiers: 33,
      latest: {
        name: 'Без пропусков',
        icon: 'flame',
        tier: 1,
        streak: true,
        dateLabel: '26 окт',
        description: '4 недели подряд всё по плану',
      },
      near: [
        { name: 'Без пропусков · II', icon: 'flame', progressLabel: '5 из 8 нед', pct: 63 },
        { name: 'Тяжёлый день · III', icon: 'kettlebell', progressLabel: '4 120 из 5 000 кг', pct: 82 },
      ],
    },
    weekStats: { minutes: 95, volumeKg: 4120, sets: 34 },
    records: [
      { exercise: 'Приседания со штангой', value: '80 кг × 5', dateLabel: '28 окт' },
      { exercise: 'Тяга верхнего блока', value: '55 кг × 10', dateLabel: '26 окт' },
      { exercise: 'Планка', value: '01:45', dateLabel: '21 окт' },
    ],
    activity: { levels: heatLevels(), workouts: 31 },
  },
};

export const todayRestFixture: TodayData = { ...todayFixture, state: restState, week: weekFor('rest') };
export const todayDoneFixture: TodayData = { ...todayFixture, state: doneState, week: weekFor('done') };

export const achievementsFixture: AchievementsData = {
  categories: [
    {
      id: 'streak',
      name: 'Регулярность',
      note: 'Неделя засчитывается, если все тренировки плана сделаны с понедельника по воскресенье. Перенос внутри недели серию не прерывает.',
      items: [
        { id: 'no-skips', name: 'Без пропусков', icon: 'flame', description: 'Недели подряд, когда весь план выполнен', tier: 1, earnedDates: ['26 окт'], streak: true, levels: [4, 8, 16], levelLabels: ['4 нед', '8 нед', '16 нед'], current: 5, unit: 'нед' },
        { id: 'full-week', name: 'Полная неделя', icon: 'calendar', description: 'Недели с выполненным планом, не обязательно подряд', tier: 1, earnedDates: ['12 сен'], levels: [1, 10, 25], levelLabels: ['1', '10', '25'], current: 7, unit: 'нед' },
      ],
    },
    {
      id: 'count',
      name: 'Тренировки',
      items: [
        { id: 'workouts', name: 'Тренировки', icon: 'dumbbell', description: 'Тренировок за всё время', tier: 1, earnedDates: ['29 авг'], levels: [10, 50, 100], levelLabels: ['10', '50', '100'], current: 31 },
        { id: 'circuits', name: 'По кругу', icon: 'loop', description: 'Круговых тренировок, пройденных целиком', tier: 1, earnedDates: ['28 окт'], levels: [1, 10, 25], levelLabels: ['1', '10', '25'], current: 3 },
      ],
    },
    {
      id: 'strength',
      name: 'Сила и объём',
      items: [
        { id: 'heavy-day', name: 'Тяжёлый день', icon: 'kettlebell', description: 'Поднятый объём за одну тренировку', tier: 2, earnedDates: ['9 авг', '12 окт'], levels: [1000, 3000, 5000], levelLabels: ['1 т', '3 т', '5 т'], current: 4120, unit: 'кг' },
        { id: 'tonnage', name: 'Тоннаж', icon: 'bars', description: 'Суммарный объём за всё время', tier: 2, earnedDates: ['30 авг', '19 окт'], levels: [10, 50, 100], levelLabels: ['10 т', '50 т', '100 т'], current: 68, unit: 'т' },
        { id: 'records', name: 'Рекорды', icon: 'trophy', description: 'Личных рекордов в любых упражнениях', tier: 1, earnedDates: ['16 авг'], levels: [1, 10, 25], levelLabels: ['1', '10', '25'], current: 7 },
        { id: 'squat', name: 'Присед', icon: 'target', description: 'Вес штанги в приседе относительно веса тела', tier: 1, earnedDates: ['21 сен'], levels: [62, 82, 123], levelLabels: ['¾ веса', 'вес тела', '1,5 веса'], current: 80, unit: 'кг' },
      ],
    },
    {
      id: 'duo',
      name: 'Вдвоём',
      items: [
        { id: 'together', name: 'Вместе', icon: 'duo', description: 'Тренировок в один день с партнёром', tier: 1, earnedDates: ['4 авг'], levels: [1, 10, 50], levelLabels: ['1', '10', '50'], current: 6 },
        { id: 'shared-streak', name: 'Общая серия', icon: 'flame', description: 'Недели подряд, когда план выполнен у обоих', tier: 1, earnedDates: ['26 окт'], streak: true, levels: [2, 4, 8], levelLabels: ['2 нед', '4 нед', '8 нед'], current: 2, unit: 'нед' },
      ],
    },
    {
      id: 'special',
      name: 'Особые',
      items: [
        { id: 'on-video', name: 'На видео', icon: 'video', description: 'Подходов, записанных на видео', tier: 1, earnedDates: ['3 окт'], levels: [1, 10, 50], levelLabels: ['1', '10', '50'], current: 4 },
        { id: 'secret', name: 'Секретное', icon: 'secret', description: 'Условие откроется, когда вы его выполните', tier: 0, earnedDates: [], secret: true },
      ],
    },
  ],
};

export const scheduleFixture: ScheduleData = {
  workout: { id: 'w1', title: 'Ноги и ягодицы', whenLabel: 'сегодня, сб 31 окт' },
  sameWeek: { date: '2026-11-01', weekday: 'вс', day: '1', relative: 'Завтра', busy: 'Всё тело' },
  nextWeek: {
    rangeLabel: '2–8 ноября',
    days: [
      { date: '2026-11-02', weekday: 'пн', day: '2', busy: 'Верх тела' },
      { date: '2026-11-03', weekday: 'вт', day: '3' },
      { date: '2026-11-04', weekday: 'ср', day: '4', busy: 'Кардио и пресс' },
      { date: '2026-11-05', weekday: 'чт', day: '5', busy: 'Ноги и ягодицы' },
      { date: '2026-11-06', weekday: 'пт', day: '6' },
      { date: '2026-11-07', weekday: 'сб', day: '7' },
      { date: '2026-11-08', weekday: 'вс', day: '8', busy: 'Всё тело' },
    ],
  },
};
export const planTemplates: PlanTemplate[] = [
  {
    id: 'upper', title: 'Верх тела', minutes: 55, tone: 'primary',
    exercises: [
      { name: 'Жим лёжа', detail: '4 × 8 · 50 кг' },
      { name: 'Тяга верхнего блока', detail: '3 × 10 · 55 кг' },
      { name: 'Жим гантелей сидя', detail: '3 × 10 · 2 × 14 кг' },
      { name: 'Тяга гантели в наклоне', detail: '3 × 10 · 20 кг' },
      { name: 'Отжимания на брусьях', detail: '3 × 8' },
      { name: 'Подъём на бицепс', detail: '3 × 12 · 2 × 10 кг' },
    ],
  },
  {
    id: 'cardio', title: 'Кардио и пресс', minutes: 45, tone: 'teal',
    exercises: [
      { name: 'Гребной тренажёр', detail: '10 мин' },
      { name: 'Скручивания', detail: '3 × 15' },
      { name: 'Планка', detail: '3 × 1:00' },
      { name: 'Велосипед', detail: '3 × 20' },
      { name: 'Берпи', detail: '3 × 10' },
    ],
  },
  {
    id: 'legs', title: 'Ноги и ягодицы', minutes: 50, tone: 'amber',
    exercises: [
      { name: 'Приседания со штангой', detail: '4 × 8 · 75 кг' },
      { name: 'Румынская тяга', detail: '3 × 10 · 50 кг' },
      { name: 'Выпады с гантелями', detail: '3 × 12 · 2 × 12 кг' },
      { name: 'Ягодичный мост', detail: '3 × 15 · 40 кг' },
      { name: 'Сгибание ног в тренажёре', detail: '3 × 12 · 30 кг' },
    ],
  },
  {
    id: 'full', title: 'Всё тело', minutes: 45, tone: 'slate',
    exercises: [
      { name: 'Становая тяга', detail: '3 × 6 · 70 кг' },
      { name: 'Жим гантелей лёжа', detail: '3 × 10 · 2 × 18 кг' },
      { name: 'Гоблет-присед', detail: '3 × 12 · 20 кг' },
      { name: 'Тяга горизонтального блока', detail: '3 × 10 · 45 кг' },
      { name: 'Махи гирей', detail: '3 × 15 · 16 кг' },
      { name: 'Планка', detail: '3 × 1:00' },
    ],
  },
];

/** Недельный шаблон: пн — верх, ср — кардио, чт — ноги, вс — всё тело */
function planEntries(today: string, min: string, max: string): Record<string, PlanEntry> {
  const byDow: Record<number, string> = { 1: 'upper', 3: 'cardio', 4: 'legs', 0: 'full' };
  const skipped = new Set(['2026-10-11', '2026-09-17']);
  const out: Record<string, PlanEntry> = {};
  for (let d = min; d <= max; d = addDays(d, 1)) {
    const templateId = byDow[parseIso(d).getDay()];
    if (!templateId) continue;
    out[d] = { templateId, status: skipped.has(d) ? 'skipped' : d < today ? 'done' : 'planned' };
  }
  // Четверг перенесён на сегодня
  out['2026-10-29'] = { templateId: 'legs', status: 'moved', movedTo: '31 октября' };
  out['2026-10-31'] = { templateId: 'legs', status: 'planned' };
  return out;
}

export const planFixture: PlanData = {
  today: '2026-10-31',
  min: '2026-09-01',
  max: '2026-12-31',
  templates: planTemplates,
  entries: planEntries('2026-10-31', '2026-09-01', '2026-12-31'),
};

export { exerciseLibrary as exercisesFixture } from '../features/exercises/mock';

/** Тренер разобрал вчерашнюю тренировку; одна тренировка с видео ждёт разбора */
export const todayReviewFixture: TodayData = {
  ...todayFixture,
  unread: 1,
  reviewNotice: {
    notificationId: 1,
    sessionId: 7,
    title: 'Ноги и ягодицы',
    reviewedAt: '2026-10-30T19:40:00',
    commentCount: 4,
    videoCommentCount: 3,
    preview: { exerciseName: 'Приседания со штангой', timecodeSec: 21, text: 'На 4-м повторе колени уходят внутрь. Думай «раздвинуть пол» стопами.' },
  },
  awaitingReview: { sessionId: 8, title: 'Всё тело', whenLabel: 'вчера', videos: 2 },
};
