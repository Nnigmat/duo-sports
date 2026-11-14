import { useCallback, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useExercises, useToday, useWorkoutById } from '../../../data/hooks';
import type { WorkoutData } from '../../../data/api';
import { Skeleton } from '../../../shared';
import { Button, EmptyState } from '../../../ui';
import { exerciseHrefFor } from '../../exercises/library';
import { toIso } from '../../plan/plan';
import { useAuth } from '../../../app/auth/AuthProvider';
import { saveSession, uploadVideo } from '../api';
import { clearDraft, loadDraft, saveDraft } from '../draftStorage';
import { draftKey, newSubmitKey, totalSec, type Session } from '../flow';
import { formatLongDate } from '../flow/ru';
import { parseIso } from '../../plan/plan';
import { WorkoutFlow } from '../WorkoutFlow/WorkoutFlow';

/** /workout — тренировка на сегодня из плана; /workout/:id?date=… — импортированная тренировка из плана. */
export function WorkoutPage() {
  const { id } = useParams();
  if (id === undefined) return <TodayWorkout />;
  // Адрес вида /workout/summary (экрана итогов пока нет) и любой нечисловой id ведут обратно в план
  return /^\d+$/.test(id) ? <SavedWorkout id={id} /> : <Navigate to="/plan" replace />;
}

/** /workout без id: тренировка на сегодня из плана; если её нет — подсказка, где её взять. */
function TodayWorkout() {
  const { data, error } = useToday();
  const navigate = useNavigate();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  if (data.state.kind === 'workout') return <Navigate to={`/workout/${data.state.workout.id}?date=${toIso(new Date())}`} replace />;
  return (
    <EmptyState
      title="На сегодня тренировки нет"
      description="Назначьте её в плане или импортируйте файл с тренировками."
      action={
        <>
          <Button onClick={() => navigate('/plan')}>Открыть план</Button>
          <Button variant="secondary" onClick={() => navigate('/import')}>Импорт</Button>
        </>
      }
    />
  );
}

function SavedWorkout({ id }: { id: string }) {
  const { data, error } = useWorkoutById(id);
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  // День плана: из адреса; без него — сегодня
  const date = /^\d{4}-\d{2}-\d{2}$/.test(search.get('date') ?? '') ? search.get('date')! : toIso(new Date());
  const key = auth.status === 'in' ? draftKey(auth.user.id, id, date) : null;
  // Сохранённое прохождение читаем один раз при открытии: после перезагрузки возвращаемся на тот же шаг
  const [draft] = useState(() => (key ? loadDraft(key) : null));
  // Отсчёт времени тренировки: с первого «Старт», после перезагрузки — с сохранённого момента
  const startedAt = useRef<number | null>(draft?.startedAt ?? null);
  // Копия метки в состоянии: по ней экран перерисовывается и показывает общее время
  const [startedAtMs, setStartedMs] = useState<number | null>(startedAt.current);
  // Момент финиша: пишется один раз при переходе на экран итогов и хранится в черновике
  const finishedAt = useRef<number | null>(draft?.finishedAt ?? null);
  const [finishedAtMs, setFinishedMs] = useState<number | null>(finishedAt.current);
  // Ключ против дубликата: один на Прохождение, создаётся при «Начать тренировку» и лежит в черновике
  const submitKey = useRef<string | null>(draft?.submitKey ?? null);
  const onSessionChange = useCallback(
    (session: Session) => {
      if (!key) return;
      if (session.phase === 'start') {
        startedAt.current = null;
        setStartedMs(null);
        finishedAt.current = null;
        setFinishedMs(null);
        submitKey.current = null;
        clearDraft(key);
        return;
      }
      if (startedAt.current === null) {
        startedAt.current = Date.now();
        setStartedMs(startedAt.current);
      }
      if (submitKey.current === null) submitKey.current = newSubmitKey();
      if ((session.phase === 'finish' || session.phase === 'feedback') && finishedAt.current === null) {
        finishedAt.current = Date.now();
        setFinishedMs(finishedAt.current);
      }
      saveDraft(key, { session, startedAt: startedAt.current, ...(finishedAt.current !== null ? { finishedAt: finishedAt.current } : {}), submitKey: submitKey.current, updatedAt: Date.now() });
    },
    [key],
  );
  const leave = () => {
    if (key) clearDraft(key);
    navigate('/plan');
  };

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return (
    <Flow
      data={data}
      dateLabel={formatLongDate(parseIso(date))}
      initialSession={draft?.session}
      startedAt={startedAtMs}
      finishedAt={finishedAtMs}
      onSessionChange={onSessionChange}
      onExit={leave}
      onFinish={async (steps, videos, feedback) => {
        // Черновик чистится только после успеха: при ошибке остаётся ключ, оценка и комментарий, повтор не задвоит итог
        // Ключ запоминаем до отправки: повтор после обрыва сети должен уйти с тем же
        const submit = submitKey.current ?? newSubmitKey();
        submitKey.current = submit;
        await saveSession(id, {
          date,
          steps,
          videos,
          durationSec: startedAt.current === null ? 0 : totalSec(startedAt.current, finishedAt.current, Date.now()),
          ...feedback,
          key: submit,
        });
        leave();
      }}
    />
  );
}

type FlowProps = {
  data: WorkoutData;
  dateLabel: string;
  onFinish: (steps: import('../../../../../shared/types').SessionStepResult[], videos: number, feedback: { feeling: number; comment?: string }) => Promise<void>;
  onExit: () => void;
  initialSession?: Session;
  startedAt: number | null;
  finishedAt: number | null;
  onSessionChange: (session: Session) => void;
};

function Flow({ data, dateLabel, onFinish, onExit, initialSession, startedAt, finishedAt, onSessionChange }: FlowProps) {
  const auth = useAuth();
  // Библиотека нужна только для «Заменить»: пока не пришла или упала, тренировка идёт без этой кнопки
  const { data: library } = useExercises();
  const exerciseHref = useMemo(() => exerciseHrefFor(library ?? undefined), [library]);
  const navigate = useNavigate();
  return (
    <WorkoutFlow
      workout={data.workout}
      comments={data.comments}
      techniques={data.techniques}
      equipment={data.equipment}
      gender={data.gender}
      library={library ?? undefined}
      exerciseHref={exerciseHref}
      onOpenExercise={navigate}
      recordingDelaySec={auth.status === 'in' ? auth.user.startDelaySec : undefined}
      speakNames={auth.status === 'in' ? auth.user.speakNames : undefined}
      sound={auth.status === 'in' ? { style: auth.user.soundStyle, volume: auth.user.soundVolume } : undefined}
      dateLabel={dateLabel}
      onUploadVideo={async (blob, _step, durationSec) => (await uploadVideo(blob, durationSec)).id}
      onFinish={(stats, steps, feedback) => onFinish(steps, stats.videos, feedback)}
      initialSession={initialSession}
      startedAt={startedAt}
      finishedAt={finishedAt}
      onSessionChange={onSessionChange}
      onExit={onExit}
    />
  );
}
