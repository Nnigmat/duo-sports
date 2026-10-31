import type { IconName, WeekDay } from '../ui';

export type WorkoutSummary = {
  id: string;
  title: string;
  /** «сегодня, сб 31 окт» */
  whenLabel: string;
};

export type TodayExercise = {
  name: string;
  /** «4 × 8 · 75 кг» */
  plan: string;
};

export type TodayWorkout = WorkoutSummary & {
  /** «четверга»: тренировка перенесена с этого дня */
  movedFrom?: string;
  exerciseCount: number;
  minutes: number;
  /** «Подходами + круг» */
  modeLabel: string;
  muscles: string[];
  exercises: TodayExercise[];
};

export type TodayState =
  | { kind: 'workout'; workout: TodayWorkout }
  | { kind: 'rest'; next: { whenLabel: string; title: string; minutes: number } | null }
  | { kind: 'done'; summary: { title: string; minutes: number; volumeKg: number; records: number } };

/** День недели со всем, что показывает карточка выбранного дня */
export type TodayWeekDay = WeekDay & {
  /** «Суббота, 31 октября» */
  fullLabel: string;
  title: string;
  /** «52 мин · 4 120 кг · 18 подходов» */
  meta: string;
  /** Кнопка в карточке дня: «Начать», «Перенести», «Итоги» */
  actionLabel?: string;
};

export type TodayData = {
  /** «Суббота, 31 октября» */
  dateLabel: string;
  userName: string;
  state: TodayState;
  week: TodayWeekDay[];
  streakWeeks: number;
  /** Блоки только для широкого экрана; без них страница показывает hero и неделю */
  insights?: TodayInsights;
};

export type NearAchievement = {
  name: string;
  icon: IconName;
  /** «5 из 8 нед» */
  progressLabel: string;
  /** 0–100 */
  pct: number;
};

export type TodayInsights = {
  achievements: {
    earnedTiers: number;
    totalTiers: number;
    latest: { name: string; icon: IconName; tier: 1 | 2 | 3; streak?: boolean; dateLabel: string; description: string };
    near: NearAchievement[];
  };
  weekStats: { minutes: number; volumeKg: number; sets: number };
  records: Array<{ exercise: string; value: string; dateLabel: string }>;
  activity: {
    /** по 7 дней на неделю, 12 недель */
    levels: Array<0 | 1 | 2 | 3>;
    workouts: number;
  };
};

export type Achievement = {
  id: string;
  name: string;
  icon: IconName;
  /** Что считается: «Недели подряд, когда весь план выполнен» */
  description: string;
  /** 0 — не получена, 1 — бронза, 2 — серебро, 3 — золото */
  tier: 0 | 1 | 2 | 3;
  /** Даты получения уровней по порядку: «26 окт». Длина равна tier */
  earnedDates: string[];
  /** Секретное: условие скрыто, уровней нет */
  secret?: boolean;
  /** Награда за серию */
  streak?: boolean;
  /** Пороги трёх уровней, в единицах progress.unit; у секретных нет */
  levels?: [number, number, number];
  /** Пороги словами: «4 нед», «¾ веса» */
  levelLabels?: [string, string, string];
  /** Сколько набрано сейчас */
  current?: number;
  /** Единица для «5 из 8 нед»: «нед», «кг», «т»; пусто для штук */
  unit?: string;
};

export type AchievementCategory = {
  id: string;
  name: string;
  /** Пояснение под названием раздела */
  note?: string;
  items: Achievement[];
};

export type AchievementsData = {
  categories: AchievementCategory[];
};

/** День, на который можно перенести тренировку */
export type RescheduleTarget = {
  /** «2026-11-01» */
  date: string;
  /** «вс» */
  weekday: string;
  /** «1» */
  day: string;
  /** Тренировка, которая уже стоит в этот день */
  busy?: string;
};

export type ScheduleData = {
  workout: WorkoutSummary;
  /** Ближайший свободный или занятый день этой недели; null, если неделя закончилась */
  sameWeek: (RescheduleTarget & { relative?: string }) | null;
  nextWeek: { rangeLabel: string; days: RescheduleTarget[] };
};

/** Цвет-метка типа тренировки в календаре; всегда рядом с названием */
export type PlanTone = 'primary' | 'teal' | 'amber' | 'slate';

export type PlanTemplate = {
  id: string;
  title: string;
  /** Ориентировочная длительность */
  minutes: number;
  tone: PlanTone;
  /** detail: «4 × 8 · 50 кг» */
  exercises: Array<{ name: string; detail: string }>;
};

export type PlanEntryStatus = 'planned' | 'done' | 'skipped' | 'moved';

/** Тренировка, стоящая в конкретный день */
export type PlanEntry = {
  templateId: string;
  status: PlanEntryStatus;
  /** Для status = moved: «31 октября» */
  movedTo?: string;
  /** Добавлена или скопирована вручную: её можно убрать */
  custom?: boolean;
};

export type PlanData = {
  /** «2026-10-31» */
  today: string;
  /** Границы календаря */
  min: string;
  max: string;
  templates: PlanTemplate[];
  /** Ключ — дата «2026-10-31» */
  entries: Record<string, PlanEntry>;
};
