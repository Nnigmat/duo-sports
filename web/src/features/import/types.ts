/** Что сделать с упражнением, которого нет в библиотеке */
export type ExerciseAction = 'create' | 'use' | 'skip';

/** Новое упражнение из файла: по умолчанию его предлагается создать */
export interface NewExercise {
  key: string;
  name: string;
  /** В скольких тренировках файла оно стоит */
  usedIn: number;
  hasVideo: boolean;
  /** «трицепс»; пусто — группа мышц не указана */
  muscles: string;
  /** Название похожего упражнения из библиотеки, если нашлось */
  similar?: string;
  /** Названия из библиотеки, которые могли иметь в виду (опечатка, похожее название); самые близкие первыми */
  candidates?: string[];
  /** Что понадобится при создании: id из файла, другие названия, как считать, ссылка на технику */
  slug?: string;
  aliases?: string[];
  measure?: Measure;
  video?: string;
  notes?: string;
}

/** Как считать упражнение в файле; distance в библиотеке хранится как time */
export type Measure = 'weight' | 'reps' | 'time' | 'distance';

/** Выбор пользователя на проверке: действие и группа мышц для упражнений без неё */
export interface ExerciseChoices {
  action: Record<string, ExerciseAction>;
  group: Record<string, string>;
  /** Какое упражнение библиотеки имелось в виду, когда выбрано «взять похожее»; без выбора — NewExercise.similar */
  target?: Record<string, string>;
}

export interface PreviewItem {
  name: string;
  /** «18–20», «10–12 · 8 кг» */
  value: string;
}

/** Блок тренировки на проверке: разминка и заминка — текстом, остальные — списком упражнений */
export interface PreviewBlock {
  kind: 'warmup' | 'cooldown' | 'exercises';
  /** «Разминка · 5–7 мин», «Круг · 3 раунда», «Подходами» */
  heading: string;
  text?: string;
  items: PreviewItem[];
  /** slug разминки или заминки, если блок подключён ссылкой: в тренировку он не записывается, а показывается на проверке */
  routine?: string;
}

export interface PreviewSession {
  id: string;
  /** «Вт, 27 окт» */
  date: string;
  title: string;
  blocks: PreviewBlock[];
  /** Замечание разбора: «Строка 38: …» */
  note?: string;
  /** День уже прошёл */
  past?: boolean;
}

export interface PreviewWeek {
  /** «27 окт – 2 нояб» */
  range: string;
  sessions: PreviewSession[];
}

export interface PreviewData {
  /** Строк в вставленном тексте */
  lines: number;
  /** «Вт · Чт» */
  days: string;
  /** «27 окт — 21 янв» */
  period: string;
  /** Упражнений, которые нашлись в библиотеке */
  found: number;
  newExercises: NewExercise[];
  weeks: PreviewWeek[];
  /** Описание круга над списком недель */
  weeksNote: string;
  /** Предупреждения разбора: незнакомые поля, тренировки без даты */
  warnings?: string[];
}
