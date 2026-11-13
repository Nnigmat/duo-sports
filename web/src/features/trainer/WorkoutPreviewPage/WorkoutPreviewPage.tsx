import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../app/auth/AuthProvider';
import { useAthletePreview } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { parseIso, toIso } from '../../plan/plan';
import { formatLongDate } from '../../workout/flow/ru';
import { WorkoutFlow } from '../../workout';

/**
 * /trainer/athletes/:id/preview/:wid — тренировка ученика в режиме превью: весь сценарий, но ничего не сохраняется,
 * видео не загружается, комментарии ученика остаются непрочитанными.
 */
export function WorkoutPreviewPage() {
  const { id, wid } = useParams();
  if (!id || !wid || !/^\d+$/.test(id) || !/^\d+$/.test(wid)) return <Navigate to="/trainer" replace />;
  return <Preview athleteId={Number(id)} workoutId={Number(wid)} />;
}

function Preview({ athleteId, workoutId }: { athleteId: number; workoutId: number }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [search] = useSearchParams();
  const { data, error } = useAthletePreview(athleteId, workoutId);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(search.get('date') ?? '') ? search.get('date')! : toIso(new Date());
  const back = () => navigate(`/trainer/athletes/${athleteId}/plan`);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return (
    <WorkoutFlow
      workout={data.workout}
      comments={data.comments}
      techniques={data.techniques}
      equipment={data.equipment}
      gender={data.gender}
      recordingDelaySec={auth.status === 'in' ? auth.user.startDelaySec : undefined}
      dateLabel={`Превью · ${formatLongDate(parseIso(day))}`}
      // Видео в превью на сервер не уходит: загрузка отключена, id не возвращается
      onUploadVideo={async () => undefined}
      onFinish={async () => back()}
      onExit={back}
    />
  );
}
