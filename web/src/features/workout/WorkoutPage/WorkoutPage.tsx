import { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToday, useWorkoutById } from '../../../data/hooks';
import type { WorkoutData } from '../../../data/api';
import { Skeleton } from '../../../shared';
import { Button, EmptyState, Notice } from '../../../ui';
import { toIso } from '../../plan/plan';
import { useAuth } from '../../../app/auth/AuthProvider';
import { saveSession, uploadVideo } from '../api';
import { clearDraft, loadDraft, saveDraft } from '../draftStorage';
import { draftKey, type Session } from '../flow';
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
  const [failure, setFailure] = useState<string | null>(null);
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
  const onSessionChange = useCallback(
    (session: Session) => {
      if (!key) return;
      if (session.phase === 'start') {
        startedAt.current = null;
        setStartedMs(null);
        clearDraft(key);
        return;
      }
      if (startedAt.current === null) {
        startedAt.current = Date.now();
        setStartedMs(startedAt.current);
      }
      saveDraft(key, { session, startedAt: startedAt.current, updatedAt: Date.now() });
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
    <>
      {failure && <Notice tone="error">{failure}</Notice>}
      <Flow
        data={data}
        dateLabel={formatLongDate(parseIso(date))}
        initialSession={draft?.session}
        startedAt={startedAtMs}
        onSessionChange={onSessionChange}
        onExit={leave}
        onFinish={async (steps, videos) => {
          setFailure(null);
          try {
            await saveSession(id, { date, steps, videos, durationSec: Math.max(0, Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000)) });
            leave();
          } catch (e) {
            setFailure(e instanceof Error ? e.message : 'Итоги не сохранены');
          }
        }}
      />
    </>
  );
}

type FlowProps = {
  data: WorkoutData;
  dateLabel: string;
  onFinish: (steps: import('../../../../../shared/types').SessionStepResult[], videos: number) => Promise<void>;
  onExit: () => void;
  initialSession?: Session;
  startedAt: number | null;
  onSessionChange: (session: Session) => void;
};

function Flow({ data, dateLabel, onFinish, onExit, initialSession, startedAt, onSessionChange }: FlowProps) {
  return (
    <WorkoutFlow
      workout={data.workout}
      comments={data.comments}
      techniques={data.techniques}
      gender={data.gender}
      dateLabel={dateLabel}
      onUploadVideo={async (blob, _step, durationSec) => (await uploadVideo(blob, durationSec)).id}
      onFinish={(stats, steps) => void onFinish(steps, stats.videos)}
      initialSession={initialSession}
      startedAt={startedAt}
      onSessionChange={onSessionChange}
      onExit={onExit}
    />
  );
}
