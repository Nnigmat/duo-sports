import type { SetActual, SetPlan } from '../../../../../shared/types';
import type { Step } from './buildSteps';
import { applyToFollowing, updatePlan } from './edit';

export type Phase = 'start' | 'work' | 'rest' | 'finish';

/** Ход тренировки: где мы, что выполнено. Всё остальное (шторки, камера) — состояние экрана. */
export interface Session {
  steps: Step[];
  index: number;
  phase: Phase;
  /** Выполнен ли шаг i; пропущенные остаются false */
  completed: boolean[];
  /** Факт подхода i: что реально сделано; null — факта нет (пропуск, разминка, ещё не делали). План не трогает. */
  actuals: Array<SetActual | null>;
  /** Сколько видео записано */
  videos: number;
  /** id видео подхода i с сервера; null — видео нет или сервер id не вернул */
  videoIds: Array<string | null>;
  /** Запущен ли таймер текущего шага: в таймерных блоках сам, у упражнений на время по «Старт» */
  timerStarted: boolean;
}

export type Action =
  | { type: 'begin' }
  | { type: 'startTimer' }
  /** «Готово»; actual — факт из шторки, у разминки и заминки его нет */
  | { type: 'done'; actual?: SetActual }
  | { type: 'skip' }
  | { type: 'back' }
  | { type: 'restOver' }
  /** видео записано и сохранено: подход считается выполненным */
  | { type: 'recorded'; videoId?: string }
  | { type: 'finishNow' }
  | { type: 'editPlan'; plan: SetPlan; apply: boolean };

/** Разминка и заминка идут сами; упражнение на время в блоке подходами ждёт «Старт». */
const autoStart = (step: Step) => step.mode === 'timed';

export function initSession(steps: Step[]): Session {
  return {
    steps,
    index: 0,
    phase: 'start',
    completed: steps.map(() => false),
    actuals: steps.map(() => null),
    videos: 0,
    videoIds: steps.map(() => null),
    timerStarted: false,
  };
}

function goTo(s: Session, index: number): Session {
  return { ...s, phase: 'work', index, timerStarted: autoStart(s.steps[index]) };
}

/** К следующему шагу или на финиш, если шаги кончились */
function next(s: Session): Session {
  return s.index + 1 >= s.steps.length ? { ...s, phase: 'finish' } : goTo(s, s.index + 1);
}

function complete(s: Session, actual?: SetActual): Session {
  const completed = s.completed.map((c, i) => (i === s.index ? true : c));
  const actuals = s.actuals.map((a, i) => (i === s.index ? (actual ?? null) : a));
  const done = { ...s, completed, actuals };
  if (s.index + 1 >= s.steps.length) return { ...done, phase: 'finish' };
  return s.steps[s.index].restAfterSec > 0 ? { ...done, phase: 'rest' } : goTo(done, s.index + 1);
}

function uncomplete(s: Session, index: number): Session {
  return { ...s, completed: s.completed.map((c, i) => (i === index ? false : c)) };
}

export function reduce(s: Session, a: Action): Session {
  switch (a.type) {
    case 'begin':
      return s.phase === 'start' ? goTo(s, 0) : s;

    case 'startTimer':
      return s.phase === 'work' ? { ...s, timerStarted: true } : s;

    case 'done':
      return s.phase === 'work' ? complete(s, a.actual) : s;

    case 'recorded':
      return s.phase === 'work'
        ? complete({ ...s, videos: s.videos + 1, videoIds: s.videoIds.map((v, i) => (i === s.index ? (a.videoId ?? null) : v)) })
        : s;

    case 'skip':
      // Пропуск подхода стирает факт, оставшийся после «Назад»; пропуск отдыха подход не трогает
      if (s.phase === 'work') return next({ ...s, actuals: s.actuals.map((x, i) => (i === s.index ? null : x)) });
      return s.phase === 'rest' ? next(s) : s;

    case 'restOver':
      return s.phase === 'rest' ? next(s) : s;

    case 'back':
      if (s.phase === 'rest') return goTo(uncomplete(s, s.index), s.index);
      if (s.phase !== 'work') return s;
      if (s.index === 0) return { ...s, phase: 'start', timerStarted: false };
      return goTo(uncomplete(s, s.index - 1), s.index - 1);

    case 'finishNow':
      return s.phase === 'finish' ? s : { ...s, phase: 'finish' };

    case 'editPlan':
      return {
        ...s,
        steps: a.apply ? applyToFollowing(s.steps, s.index, a.plan) : updatePlan(s.steps, s.index, a.plan),
      };
  }
}
