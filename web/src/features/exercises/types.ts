import type { ExerciseDemo, ExerciseKind } from '../../../../shared/types';

export type { MuscleGroupId } from '../../../../shared/types';
import type { MuscleGroupId } from '../../../../shared/types';

/** Один выполненный подход; заполнены только поля, которые нужны типу упражнения */
export interface SetResult {
  weight?: number;
  reps?: number;
  seconds?: number;
}

export interface SessionVideo {
  title: string;
  /** мм:сс */
  duration: string;
}

export interface SessionComment {
  author: string;
  text: string;
}

/** Одна тренировка с этим упражнением */
export interface ExerciseSession {
  /** «28 окт» */
  date: string;
  sets: SetResult[];
  /** В этой тренировке побит рекорд */
  isRecord?: boolean;
  videos: SessionVideo[];
  comments: SessionComment[];
}

/** Значения, которые подставятся при добавлении упражнения в тренировку */
export interface ExerciseDefaults {
  reps: number;
  weight: number;
  /** секунды подхода для time */
  seconds: number;
}

export interface LibraryExercise {
  id: string;
  name: string;
  /** Другие названия для импорта: «присед», «РДЛ» */
  aliases?: string[];
  kind: ExerciseKind;
  group: MuscleGroupId;
  muscles: string[];
  equipment: string;
  /** Как выполнять: шаги через \n */
  notes?: string;
  /** Ролики чибика: девочка и мальчик */
  demo?: ExerciseDemo;
  /** Гантели парой: вес показываем как «2 × 14 кг» */
  pair?: boolean;
  defaults: ExerciseDefaults;
  /** Лучший подход; нет — упражнение ещё не выполнялось */
  record?: SetResult & { date: string };
  /** Сколько тренировок было всего; в sessions может лежать только последняя часть */
  sessionsTotal: number;
  /** От новых к старым */
  sessions: ExerciseSession[];
  /** Значение лучшего подхода по тренировкам, от старых к новым */
  trend: number[];
  /** Комментарии тренера к упражнению, от новых к старым; «12 окт» */
  coachComments?: Array<{ id: string; date: string; text: string }>;
  /** «Сб, 31 окт · Ноги и ягодицы» — если упражнение стоит в плане */
  plan?: string;
}

/** Черновик формы создания и редактирования */
export interface ExerciseDraft {
  name: string;
  kind: ExerciseKind;
  muscles: string[];
  equipment: string;
  /** Как выполнять: один шаг на строку */
  notes: string;
  params: ExerciseDefaults;
}
