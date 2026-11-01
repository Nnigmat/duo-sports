/** reps — повторы, weight — вес × повторы, time — мм:сс */
export type ExerciseKind = 'reps' | 'weight' | 'time';

/** Цель-диапазон «18–20»; для одного значения min === max. Для time — секунды. */
export interface Range {
  min: number;
  max: number;
}

/** Позы персонажа: рабочие под упражнения и служебные (старт, отдых, камера, финиш) */
export type Pose =
  | 'stand'
  | 'headroll'
  | 'shoulders'
  | 'dips'
  | 'scissors'
  | 'lunge'
  | 'squat'
  | 'plank'
  | 'rest'
  | 'camera'
  | 'stretch'
  | 'cheer'
  | 'wave';

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** поза персонажа; если не задана, стоит на месте */
  pose?: Pose;
  /** reps/weight — повторы, time — секунды */
  target: Range;
  /** кг, только для kind === 'weight' */
  weight?: number;
}

export interface SetsExercise extends Exercise {
  /** число подходов этого упражнения */
  sets: number;
}

/** Разминка/заминка: упражнения по таймеру подряд */
export interface TimedBlock {
  id: string;
  mode: 'timed';
  title: string;
  /** Пояснение на экране старта: «Повторяйте за персонажем» */
  note?: string;
  exercises: Exercise[];
}

/** Все подходы упражнения, потом следующее */
export interface SetsBlock {
  id: string;
  mode: 'sets';
  title: string;
  exercises: SetsExercise[];
  restSec: number;
  /** номера подходов упражнения (с 1), которые пишем на видео */
  videoRounds: number[];
}

/** По кругу N кругов, отдых после каждого подхода */
export interface CircuitBlock {
  id: string;
  mode: 'circuit';
  title: string;
  exercises: Exercise[];
  rounds: number;
  restSec: number;
  /** номера кругов (с 1), которые пишем на видео */
  videoRounds: number[];
}

export type Block = TimedBlock | SetsBlock | CircuitBlock;

/** План подхода: из него считается строка в облачке и значения в «Изменить» */
export interface SetPlan {
  target: Range;
  weight?: number;
}

/** Комментарий тренера к упражнению или к видео подхода */
export interface CoachComment {
  id: string;
  /** null — комментарий ко всей тренировке */
  exerciseId: string | null;
  exerciseName: string;
  /** ISO-дата */
  createdAt: string;
  text: string;
  /** Спортсмен ещё не открывал */
  isNew: boolean;
  /** Если комментарий к видео: подпись вида «Видео · круг 2, подход 4» */
  video?: { id: string; label: string };
}

/** Описание техники упражнения */
export interface Technique {
  /** Шаги «Как выполнять» */
  instructions: string[];
  /** Частая ошибка */
  mistake?: string;
  /** Видео-пример; без него вкладка «Видео» показывает пустое состояние */
  videoUrl?: string;
}

/** Тренировка дня: блоки по порядку */
export interface Workout {
  id: string;
  title: string;
  blocks: Block[];
}

/** Роли: аккаунты создаёт админ, саморегистрации нет */
export type Role = 'athlete' | 'trainer' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  /** ISO-время последней смены пароля; null, если пароль ещё не менялся */
  passwordChangedAt: string | null;
}

/** Ответ POST /api/auth/login при отказе */
export type LoginFailure = { error: 'wrong_credentials' } | { error: 'locked'; retryAfterSec: number };
