import type { SetActual } from '../../../../../shared/types';
import type { Step } from './buildSteps';

export type Phase = 'start' | 'work' | 'rest' | 'finish' | 'feedback';

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
  /** Фактический отдых после шага i в секундах (в том числе сверх цели); null — отдыха не было (последний шаг, пропущенный подход, старый черновик); при «Пропустить» на отдыхе — время до нажатия */
  restSec: Array<number | null>;
  /** Запущен ли таймер текущего шага: в таймерных блоках сам, у упражнений на время по «Старт» */
  timerStarted: boolean;
  /** Самочувствие 1–5; null — ещё не выбрано. Без него итог не отправить. */
  feeling: number | null;
  /** Комментарий ко всей тренировке, необязательный */
  comment: string;
}

export type Action =
  | { type: 'begin' }
  | { type: 'startTimer' }
  /** «Готово»; actual — факт из шторки, у разминки и заминки его нет */
  | { type: 'done'; actual?: SetActual }
  /** На отдыхе `restSec` — сколько он шёл до нажатия; на подходе не нужен */
  | { type: 'skip'; restSec?: number }
  | { type: 'back' }
  /** Отдых закончен кнопкой «Начать»: `restSec` — сколько он шёл, включая время сверх цели */
  | { type: 'restOver'; restSec: number }
  /** видео записано и сохранено: подход считается выполненным */
  | { type: 'recorded'; videoId?: string; actual?: SetActual }
  | { type: 'finishNow' }
  /** «Дальше» на финише: к обратной связи */
  | { type: 'toFeedback' }
  /** Стрелка на обратной связи: назад к итогам */
  | { type: 'toSummary' }
  | { type: 'rate'; value: number }
  | { type: 'comment'; text: string };

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
    restSec: steps.map(() => null),
    timerStarted: false,
    feeling: null,
    comment: '',
  };
}

function goTo(s: Session, index: number): Session {
  return { ...s, phase: 'work', index, timerStarted: autoStart(s.steps[index]) };
}

function withRest(s: Session, sec: number | undefined): Session {
  if (sec === undefined) return s;
  return { ...s, restSec: s.restSec.map((v, i) => (i === s.index ? sec : v)) };
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

/** Шаг снова не выполнен; записанное на нём видео тоже снимается: повторная запись его заменит. */
function uncomplete(s: Session, index: number): Session {
  const hadVideo = s.videoIds[index] !== null;
  return {
    ...s,
    completed: s.completed.map((c, i) => (i === index ? false : c)),
    videos: hadVideo ? s.videos - 1 : s.videos,
    videoIds: s.videoIds.map((v, i) => (i === index ? null : v)),
    // Отдых после этого шага начнётся заново при следующем «Готово»
    restSec: s.restSec.map((v, i) => (i === index ? null : v)),
  };
}

/** Есть ли у экрана подхода кнопка «Назад»: с первого шага, на отдыхе и на финише её нет */
export function canGoBack(s: Session): boolean {
  return s.phase === 'work' && s.index > 0;
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
        ? complete({ ...s, videos: s.videos + 1, videoIds: s.videoIds.map((v, i) => (i === s.index ? (a.videoId ?? null) : v)) }, a.actual)
        : s;

    case 'skip':
      if (s.phase === 'rest') return next(withRest(s, a.restSec));
      // Пропуск подхода стирает факт, оставшийся после «Назад»; пропуск отдыха подход не трогает
      if (s.phase === 'work') return next({ ...s, actuals: s.actuals.map((x, i) => (i === s.index ? null : x)) });
      return s;

    case 'restOver':
      return s.phase === 'rest' ? next(withRest(s, a.restSec)) : s;

    case 'back':
      if (s.phase === 'rest') return goTo(uncomplete(s, s.index), s.index);
      if (s.phase !== 'work') return s;
      if (s.index === 0) return { ...s, phase: 'start', timerStarted: false };
      return goTo(uncomplete(s, s.index - 1), s.index - 1);

    case 'finishNow':
      return s.phase === 'finish' || s.phase === 'feedback' ? s : { ...s, phase: 'finish' };

    case 'toFeedback':
      return s.phase === 'finish' ? { ...s, phase: 'feedback' } : s;

    case 'toSummary':
      return s.phase === 'feedback' ? { ...s, phase: 'finish' } : s;

    case 'rate':
      return s.phase === 'feedback' && Number.isInteger(a.value) && a.value >= 1 && a.value <= 5 ? { ...s, feeling: a.value } : s;

    case 'comment':
      return s.phase === 'feedback' ? { ...s, comment: a.text } : s;
  }
}

/** После перезагрузки таймер упражнения на время начинается заново: снова «Старт», с середины не продолжаем. Разминка и заминка идут сами. */
export function afterReload(s: Session): Session {
  const step = s.steps[s.index];
  return s.phase === 'work' && step?.kind === 'time' && step.mode !== 'timed' ? { ...s, timerStarted: false } : s;
}
