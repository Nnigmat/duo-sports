import { useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import type { CoachComment, Gender, SessionStepResult, Technique, Workout } from '../../../../../shared/types';
import { Dialog } from '../../../ui/Dialog/Dialog';
import { cameraUrl, idleUrl, restUrl, successUrl } from '../chibi/idle';
import { poseFor } from '../chibi/poseFor';
import {
  blockLabel,
  buildSteps,
  afterReload,
  canGoBack,
  commentsFor,
  demoFor,
  eyebrow,
  feedbackOf,
  finishStats,
  sessionSteps,
  hasNewComments,
  initSession,
  LEAD_SEC,
  latestComment,
  markRead,
  recordingEyebrow,
  reduce,
  restEyebrow,
  signalAt,
  stepLine,
  timedView,
  timerSeconds,
  totalSec,
  type Action,
  type FinishStats,
  type Session,
  type Step,
} from '../flow';
import { FeedbackScreen } from '../FeedbackScreen/FeedbackScreen';
import { FinishScreen } from '../FinishScreen/FinishScreen';
import { useRest } from '../parts/RestRing/useRest';
import { useCountdown } from '../parts/TimerRing/useCountdown';
import { createBeeper, type Beeper } from '../sound/beeper';
import { RecordingScreen } from '../RecordingScreen/RecordingScreen';
import { CommentsSheet } from '../sheets/CommentsSheet/CommentsSheet';
import { ResultSheet } from '../sheets/ResultSheet/ResultSheet';
import { TechSheet } from '../sheets/TechSheet/TechSheet';
import { StartScreen } from '../StartScreen/StartScreen';
import { TrainingScreen } from '../TrainingScreen/TrainingScreen';

type Props = {
  workout: Workout;
  /** «Пятница, 30 октября» */
  dateLabel: string;
  comments: CoachComment[];
  /** Описание техники по id упражнения; без него панель «Техника» показывает только анимацию */
  techniques: Record<string, Technique>;
  /** Пол спортсмена: каким чибиком показать «стоит» */
  gender?: Gender;
  /** Загрузить видео подхода. Ошибка (reject) остаётся на экране записи, можно повторить. */
  /** Возвращает id видео на сервере; без него подход всё равно считается записанным */
  onUploadVideo: (video: Blob, step: Step, durationSec: number) => Promise<string | undefined>;
  /**
   * «Отправить тренеру» на обратной связи: итоги, каждый подход с планом и отметкой «выполнен» и самочувствие.
   * Reject оставляет экран как есть с текстом ошибки: можно отправить ещё раз, итог не задвоится (ключ тот же).
   */
  onFinish: (stats: FinishStats, steps: SessionStepResult[], feedback: { feeling: number; comment?: string }) => Promise<void>;
  /** Выход с экрана старта и ✕ на финише */
  onExit: () => void;
  /** Сохранённое прохождение: тренировка продолжается с него, а не с экрана старта */
  initialSession?: Session;
  /** Метка начала тренировки (мс): от неё идёт общее время. Нет — время не показывается. */
  startedAt?: number | null;
  /** Момент финиша (мс): с него общее время замирает. Нет — время идёт, пока тренировка не закончена. */
  finishedAt?: number | null;
  /** Ход изменился: контейнер сохраняет прохождение, чтобы оно пережило перезагрузку */
  onSessionChange?: (session: Session) => void;
  /** Секунд до начала записи после «Старт» */
  recordingDelaySec?: number;
  /** Для дат комментариев; в приложении не передаётся */
  now?: Date;
};

type Sheet = 'result' | 'tech' | 'comments' | null;

/**
 * Весь сценарий тренировки: старт → подходы, таймеры, отдых, запись, панели → финиш.
 * Ход тренировки считает чистый автомат из flow/session, здесь только экран и побочные эффекты.
 * Данные и сохранение приходят пропсами: контейнер выше делает запросы к API.
 */
export function WorkoutFlow({ workout, dateLabel, techniques, gender, onUploadVideo, onFinish, onExit, recordingDelaySec, now, initialSession, onSessionChange, startedAt, finishedAt, ...rest }: Props) {
  const [session, dispatch] = useReducer(reduce, workout, (w) => initialSession ? afterReload(initialSession) : initSession(buildSteps(w.blocks)));
  // Один AudioContext на Прохождение: создаётся по «Начать тренировку», закрывается при выходе
  const [beeper] = useState(createBeeper);
  useEffect(() => () => beeper.close(), [beeper]);
  useEffect(() => onSessionChange?.(session), [session, onSessionChange]);
  const [comments, setComments] = useState(rest.comments);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [commentsFromTech, setCommentsFromTech] = useState(false);
  const [recording, setRecording] = useState(false);
  // Видео записано и загружено, ждём факт подхода; шаг засчитывается после шторки
  const [recorded, setRecorded] = useState<{ videoId?: string } | null>(null);
  const [exiting, setExiting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { steps, index, phase } = session;
  const step = steps[index];

  if (phase === 'start') {
    return (
      <StartScreen
        title={workout.title}
        blocks={workout.blocks}
        dateLabel={dateLabel}
        idleUrl={idleUrl(gender)}
        onBack={onExit}
        onStart={() => {
          beeper.unlock();
          dispatch({ type: 'begin' });
        }}
      />
    );
  }

  if (phase === 'feedback') {
    const send = async () => {
      const feedback = feedbackOf(session);
      // Без оценки итог не уходит, даже если кнопку как-то нажали
      if (!feedback || sending) return;
      setSending(true);
      setSendError(null);
      try {
        await onFinish(finishStats(steps, session.completed, session.videos), sessionSteps(steps, session.completed, session.videoIds, session.restSec, session.actuals), feedback);
      } catch (e) {
        setSendError(e instanceof Error ? e.message : 'Итоги не отправлены');
      }
      setSending(false);
    };
    return (
      <FeedbackScreen
        feeling={session.feeling}
        comment={session.comment}
        sending={sending}
        error={sendError}
        onRate={(value) => dispatch({ type: 'rate', value })}
        onComment={(text) => dispatch({ type: 'comment', text })}
        onSend={() => void send()}
        onBack={() => dispatch({ type: 'toSummary' })}
      />
    );
  }

  if (phase === 'finish') {
    const stats = finishStats(steps, session.completed, session.videos);
    // Время на финише то же, что в шапке, и дальше не растёт
    const total = startedAt == null ? 0 : totalSec(startedAt, finishedAt, Date.now());
    return <FinishScreen stats={stats} totalSec={total} successUrl={successUrl(gender)} onNext={() => dispatch({ type: 'toFeedback' })} onClose={onExit} />;
  }

  if (recording) {
    return (
      <RecordingScreen
        eyebrow={recordingEyebrow(step)}
        line={stepLine(step)}
        startDelaySec={recordingDelaySec}
        beeper={beeper}
        onUpload={async (video, durationSec) => {
          const videoId = await onUploadVideo(video, step, durationSec);
          setRecording(false);
          setRecorded(videoId ? { videoId } : {});
        }}
        onCancel={() => setRecording(false)}
      />
    );
  }

  // На отдыхе экран про следующий подход: его техника, его комментарии
  const resting = phase === 'rest';
  const shown = resting ? steps[index + 1] : step;
  const note = latestComment(comments, shown.exerciseId);

  const closeReading = (open: boolean) => {
    if (open) return;
    setSheet(null);
    setComments((c) => markRead(c, shown.exerciseId));
  };

  return (
    <>
      <Stage
        // Новый отсчёт на каждом шаге, отдыхе и запуске таймера
        key={`${index}-${phase}-${session.timerStarted}`}
        session={session}
        dispatch={dispatch}
        beeper={beeper}
        shown={shown}
        idleUrl={idleUrl(gender)}
        restUrl={restUrl(gender)}
        cameraUrl={cameraUrl(gender)}
        demoUrl={demoFor({ phase, record: step.record, demoUrl: techniques[shown.exerciseId]?.demoUrl })}
        thinkDemoUrl={resting ? techniques[shown.exerciseId]?.demoUrl : undefined}
        note={note?.text}
        techNew={hasNewComments(comments, shown.exerciseId)}
        startedAt={startedAt}
        // На подходах упражнений «Готово» сначала спрашивает факт; у разминки и заминки шторки нет
        onDone={() => (step.mode === 'timed' ? dispatch({ type: 'done' }) : setSheet('result'))}
        onTech={() => setSheet('tech')}
        onOpenNotes={() => {
          setCommentsFromTech(false);
          setSheet('comments');
        }}
        onRecord={() => setRecording(true)}
        onExit={() => setExiting(true)}
      />

      <ResultSheet
        open={(sheet === 'result' || recorded !== null) && phase === 'work'}
        onOpenChange={(open) => {
          if (open) return;
          setSheet(null);
          // Шторку после записи закрыли без факта: видео уже на сервере, подход засчитываем по плану
          if (recorded) dispatch({ type: 'recorded', ...(recorded.videoId ? { videoId: recorded.videoId } : {}) });
          setRecorded(null);
        }}
        eyebrow={eyebrow(step)}
        kind={step.kind}
        plan={step.plan}
        actual={session.actuals[index]}
        onSave={(actual) => {
          if (recorded) dispatch({ type: 'recorded', ...(recorded.videoId ? { videoId: recorded.videoId } : {}), actual });
          else dispatch({ type: 'done', actual });
          setRecorded(null);
        }}
      />

      <TechSheet
        open={sheet === 'tech'}
        onOpenChange={closeReading}
        title={shown.exerciseName}
        pose={shown.pose ?? 'stand'}
        idleUrl={idleUrl(gender)}
        technique={techniques[shown.exerciseId] ?? { instructions: [] }}
        comment={note}
        commentsCount={commentsFor(comments, shown.exerciseId).length}
        now={now}
        onOpenComments={() => {
          setCommentsFromTech(true);
          setSheet('comments');
        }}
      />

      <CommentsSheet
        open={sheet === 'comments'}
        onOpenChange={closeReading}
        onBack={commentsFromTech ? () => setSheet('tech') : undefined}
        exerciseId={shown.exerciseId}
        exerciseName={shown.exerciseName}
        comments={comments}
        now={now}
      />

      <Dialog
        open={exiting}
        onOpenChange={setExiting}
        title="Закончить тренировку?"
        description="Выполненные подходы сохранятся"
        confirmLabel="Закончить"
        onConfirm={() => {
          setExiting(false);
          dispatch({ type: 'finishNow' });
        }}
      />
    </>
  );
}

type StageProps = {
  session: Session;
  dispatch: Dispatch<Action>;
  beeper: Beeper;
  /** Шаг, про который экран: текущий или (на отдыхе) следующий */
  shown: Step;
  demoUrl?: string;
  /** Ролик следующего упражнения для облачка на отдыхе */
  thinkDemoUrl?: string;
  idleUrl: string;
  restUrl: string;
  cameraUrl: string;
  note?: string;
  techNew: boolean;
  startedAt?: number | null;
  /** «Готово» на подходе: у упражнения откроет шторку факта, у разминки завершит шаг */
  onDone: () => void;
  onTech: () => void;
  onOpenNotes: () => void;
  onRecord: () => void;
  onExit: () => void;
};

/** Экран шага. Часы нужны только отдыху и упражнению на время, остальным хуки не запускаем. */
function Stage(props: StageProps) {
  const { session } = props;
  const step = session.steps[session.index];
  if (session.phase === 'rest') return <RestStage {...props} />;
  return step.kind === 'time' && session.timerStarted ? <TimedStage {...props} /> : <SetStage {...props} />;
}

/** Подход на повторы или упражнение на время до «Старт» */
function SetStage(props: StageProps) {
  const { session, dispatch, onDone, beeper } = props;
  const step = session.steps[session.index];
  const onSkip = () => dispatch({ type: 'skip' });
  const onBack = canGoBack(session) ? () => dispatch({ type: 'back' }) : undefined;
  return (
    <StageView
      {...props}
      bar={
        step.kind === 'time'
          ? { mode: 'start', onStart: () => {
                // Нажатие даёт право на звук; после перезагрузки контекст создаётся заново
                beeper.unlock();
                dispatch({ type: 'startTimer' });
              }, onBack, onSkip }
          : { mode: 'set', onDone, onBack, onSkip }
      }
    />
  );
}

/**
 * Идущий таймер. Разминка и заминка просто считают время и засчитываются сами.
 * Упражнение на время: отсчёт 5 с, работа, финиш; сигналы по расписанию, в конце кнопка «Готово».
 */
function TimedStage(props: StageProps) {
  const { session, dispatch, beeper, onDone } = props;
  const step = session.steps[session.index];
  const warm = step.mode === 'timed';
  const workSec = timerSeconds(step.plan);
  const t = useCountdown({
    seconds: warm ? workSec : LEAD_SEC + workSec,
    // Конец таймера разминки засчитывает её сам; у упражнения круг ждёт «Готово»
    onFinish: warm ? () => dispatch({ type: 'done' }) : undefined,
  });
  const elapsed = t.total - t.seconds;

  // Сигнал в каждую новую секунду. На паузе секунда не меняется, значит, и звука нет
  const last = useRef(-1);
  useEffect(() => {
    if (warm || elapsed <= last.current) return;
    last.current = elapsed;
    const signal = signalAt(workSec, elapsed);
    if (signal) beeper.play(signal);
  }, [warm, elapsed, workSec, beeper]);

  const view = warm ? null : timedView(workSec, elapsed);
  return (
    <StageView
      {...props}
      onBack={() => dispatch({ type: 'back' })}
      bar={{
        mode: 'timer',
        seconds: view ? view.seconds : t.seconds,
        total: view ? view.total : t.total,
        paused: t.paused,
        alert: view?.alert,
        caption: view?.caption,
        onDone: view ? onDone : undefined,
        onPauseToggle: t.toggle,
        onSkip: () => dispatch({ type: 'skip' }),
      }}
    />
  );
}

/** Отдых: считает вверх до цели и дальше; сколько он шёл, уходит в факт при «Начать» и «Пропустить» */
function RestStage(props: StageProps) {
  const { session, dispatch } = props;
  const step = session.steps[session.index];
  const rest = useRest(step.restAfterSec);
  return (
    <StageView
      {...props}
      restOver={rest.reached}
      onBack={() => dispatch({ type: 'back' })}
      bar={{
        mode: 'rest',
        elapsed: rest.elapsed,
        goalSec: rest.goalSec,
        reached: rest.reached,
        progress: rest.progress,
        onAddTime: () => rest.add(15),
        onStart: () => dispatch({ type: 'restOver', restSec: rest.elapsedNow() }),
        onSkip: () => dispatch({ type: 'skip', restSec: rest.elapsedNow() }),
      }}
    />
  );
}

function StageView({ session, shown, demoUrl, thinkDemoUrl, idleUrl, restUrl, cameraUrl, note, techNew, startedAt, bar, restOver, onBack, onTech, onOpenNotes, onRecord, onExit }: StageProps & {
  bar: React.ComponentProps<typeof TrainingScreen>['bar'];
  /** Стрелка в шапке: только на таймере и отдыхе */
  onBack?: () => void;
  /** На отдыхе: цель достигнута, подпись «Отдых окончен» */
  restOver?: boolean;
}) {
  const step = session.steps[session.index];
  const resting = session.phase === 'rest';
  return (
    <TrainingScreen
      blockLabel={blockLabel(shown)}
      progress={{ count: shown.blockSize, current: shown.indexInBlock - 1 }}
      eyebrow={resting ? restEyebrow(shown, restOver) : eyebrow(step)}
      line={stepLine(shown)}
      demoUrl={demoUrl}
      idleUrl={idleUrl}
      restUrl={restUrl}
      cameraUrl={cameraUrl}
      pose={poseFor({ phase: resting ? 'rest' : 'work', exercisePose: step.pose, record: step.record })}
      thinkPose={resting ? (shown.pose ?? 'stand') : undefined}
      thinkDemoUrl={thinkDemoUrl}
      note={note}
      techNew={techNew}
      recordable={!resting && step.record}
      canRecord={!resting}
      bar={bar}
      startedAt={startedAt}
      onBack={onBack}
      onExit={onExit}
      onTech={onTech}
      onRecord={onRecord}
      onOpenNotes={onOpenNotes}
    />
  );
}
