import { useReducer, useState, type Dispatch } from 'react';
import type { CoachComment, Gender, SessionStepResult, Technique, Workout } from '../../../../../shared/types';
import { Dialog } from '../../../ui/Dialog/Dialog';
import { idleUrl, restUrl } from '../chibi/idle';
import { poseFor } from '../chibi/poseFor';
import {
  applyLabel,
  blockLabel,
  buildSteps,
  commentsFor,
  demoFor,
  editEyebrow,
  eyebrow,
  finishStats,
  sessionSteps,
  followingNumbers,
  formatFollowing,
  hasNewComments,
  initSession,
  latestComment,
  markRead,
  recordingEyebrow,
  reduce,
  restEyebrow,
  stepLine,
  timerSeconds,
  type Action,
  type FinishStats,
  type Session,
  type Step,
} from '../flow';
import { FinishScreen } from '../FinishScreen/FinishScreen';
import { useCountdown } from '../parts/TimerRing/useCountdown';
import { RecordingScreen } from '../RecordingScreen/RecordingScreen';
import { CommentsSheet } from '../sheets/CommentsSheet/CommentsSheet';
import { EditSheet } from '../sheets/EditSheet/EditSheet';
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
  onUploadVideo: (video: Blob, step: Step, durationSec: number) => Promise<string | void>;
  /** «Завершить» на финише: итоги и каждый подход с планом и отметкой «выполнен» */
  onFinish: (stats: FinishStats, steps: SessionStepResult[]) => void;
  /** Выход с экрана старта и ✕ на финише */
  onExit: () => void;
  /** Секунд до начала записи после «Старт» */
  recordingDelaySec?: number;
  /** Для дат комментариев; в приложении не передаётся */
  now?: Date;
};

type Sheet = 'edit' | 'tech' | 'comments' | null;

/**
 * Весь сценарий тренировки: старт → подходы, таймеры, отдых, запись, панели → финиш.
 * Ход тренировки считает чистый автомат из flow/session, здесь только экран и побочные эффекты.
 * Данные и сохранение приходят пропсами: контейнер выше делает запросы к API.
 */
export function WorkoutFlow({ workout, dateLabel, techniques, gender, onUploadVideo, onFinish, onExit, recordingDelaySec, now, ...rest }: Props) {
  const [session, dispatch] = useReducer(reduce, workout, (w) => initSession(buildSteps(w.blocks)));
  const [comments, setComments] = useState(rest.comments);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [commentsFromTech, setCommentsFromTech] = useState(false);
  const [recording, setRecording] = useState(false);
  const [exiting, setExiting] = useState(false);

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
        onStart={() => dispatch({ type: 'begin' })}
      />
    );
  }

  if (phase === 'finish') {
    const stats = finishStats(steps, session.completed, session.videos);
    return <FinishScreen stats={stats} onFinish={() => onFinish(stats, sessionSteps(steps, session.completed, session.videoIds))} onClose={onExit} />;
  }

  if (recording) {
    return (
      <RecordingScreen
        eyebrow={recordingEyebrow(step)}
        line={stepLine(step)}
        startDelaySec={recordingDelaySec}
        onUpload={async (video, durationSec) => {
          const videoId = await onUploadVideo(video, step, durationSec);
          setRecording(false);
          dispatch({ type: 'recorded', ...(videoId ? { videoId } : {}) });
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
        shown={shown}
        idleUrl={idleUrl(gender)}
        restUrl={restUrl(gender)}
        demoUrl={demoFor({ phase, record: step.record, demoUrl: techniques[shown.exerciseId]?.demoUrl })}
        note={note?.text}
        techNew={hasNewComments(comments, shown.exerciseId)}
        onEdit={() => setSheet('edit')}
        onTech={() => setSheet('tech')}
        onOpenNotes={() => {
          setCommentsFromTech(false);
          setSheet('comments');
        }}
        onRecord={() => setRecording(true)}
        onExit={() => setExiting(true)}
      />

      <EditSheet
        open={sheet === 'edit' && phase === 'work'}
        onOpenChange={(open) => !open && setSheet(null)}
        eyebrow={editEyebrow(step)}
        title={step.exerciseName}
        kind={step.kind}
        plan={step.plan}
        applyLabel={applyLabel(step)}
        applyHint={formatFollowing(followingNumbers(steps, index))}
        onSave={(plan, apply) => dispatch({ type: 'editPlan', plan, apply })}
      />

      <TechSheet
        open={sheet === 'tech'}
        onOpenChange={closeReading}
        title={shown.exerciseName}
        pose={shown.pose ?? 'stand'}
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
  /** Шаг, про который экран: текущий или (на отдыхе) следующий */
  shown: Step;
  demoUrl?: string;
  idleUrl: string;
  restUrl: string;
  note?: string;
  techNew: boolean;
  onEdit: () => void;
  onTech: () => void;
  onOpenNotes: () => void;
  onRecord: () => void;
  onExit: () => void;
};

/** Экран шага. Таймер нужен только отдыху и упражнению на время, остальным хук не запускаем. */
function Stage(props: StageProps) {
  const { session } = props;
  const step = session.steps[session.index];
  const running = session.phase === 'rest' || (step.kind === 'time' && session.timerStarted);
  return running ? <TimedStage {...props} /> : <SetStage {...props} />;
}

/** Подход на повторы или упражнение на время до «Старт» */
function SetStage(props: StageProps) {
  const { session, dispatch, onEdit } = props;
  const step = session.steps[session.index];
  const onSkip = () => dispatch({ type: 'skip' });
  return (
    <StageView
      {...props}
      bar={
        step.kind === 'time'
          ? { mode: 'start', onStart: () => dispatch({ type: 'startTimer' }), onEdit, onSkip }
          : { mode: 'set', onDone: () => dispatch({ type: 'done' }), onEdit, onSkip }
      }
    />
  );
}

/** Идущий таймер упражнения или отдых */
function TimedStage(props: StageProps) {
  const { session, dispatch } = props;
  const step = session.steps[session.index];
  const resting = session.phase === 'rest';
  const t = useCountdown({
    seconds: resting ? step.restAfterSec : timerSeconds(step.plan),
    onFinish: () => dispatch({ type: resting ? 'restOver' : 'done' }),
  });
  const onSkip = () => dispatch({ type: 'skip' });
  return (
    <StageView
      {...props}
      bar={
        resting
          ? { mode: 'rest', seconds: t.seconds, total: t.total, onAddTime: () => t.add(15), onSkip }
          : { mode: 'timer', seconds: t.seconds, total: t.total, paused: t.paused, onPauseToggle: t.toggle, onSkip }
      }
    />
  );
}

function StageView({ session, dispatch, shown, demoUrl, idleUrl, restUrl, note, techNew, bar, onTech, onOpenNotes, onRecord, onExit }: StageProps & {
  bar: React.ComponentProps<typeof TrainingScreen>['bar'];
}) {
  const step = session.steps[session.index];
  const resting = session.phase === 'rest';
  return (
    <TrainingScreen
      blockLabel={blockLabel(shown)}
      progress={{ count: shown.blockSize, current: shown.indexInBlock - 1 }}
      eyebrow={resting ? restEyebrow(shown) : eyebrow(step)}
      line={stepLine(shown)}
      demoUrl={demoUrl}
      idleUrl={idleUrl}
      restUrl={restUrl}
      pose={poseFor({ phase: resting ? 'rest' : 'work', exercisePose: step.pose, record: step.record })}
      note={note}
      techNew={techNew}
      recordable={!resting && step.record}
      canRecord={!resting}
      bar={bar}
      onBack={() => dispatch({ type: 'back' })}
      onExit={onExit}
      onTech={onTech}
      onRecord={onRecord}
      onOpenNotes={onOpenNotes}
    />
  );
}
