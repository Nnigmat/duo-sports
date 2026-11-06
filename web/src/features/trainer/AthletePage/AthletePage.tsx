import { type ReactNode, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAthletes, useAthleteSessions, useExercises, usePastComments, usePlannedWorkout, useTrainerReview } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { toIso } from '../../plan/plan';
import { markReviewed, deleteComment, postComment, postHint } from '../api';
import { AthleteView } from '../AthleteView/AthleteView';
import { PlannedDetail } from '../PlannedDetail/PlannedDetail';
import { ReviewDetail } from '../ReviewDetail/ReviewDetail';
import { defaultSelection, findSlug, firstName, selectionFor, type Selection } from '../sessions';

/** /trainer/athletes/:id — карточка ученика. После записи данные читаются заново, выбранная тренировка и раскрытые видео остаются. */
export function AthletePage() {
  const { id } = useParams();
  if (!id || !/^\d+$/.test(id)) return <Navigate to="/trainer" replace />;
  return <AthleteContent athleteId={Number(id)} />;
}

function AthleteContent({ athleteId }: { athleteId: number }) {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [picked, setPicked] = useState<Selection | null>(null);
  // Телефон: открыта ли тренировка. Приходя из плана по ссылке с датой, сразу показываем её
  const [search] = useSearchParams();
  const [open, setOpen] = useState(() => search.has('date'));
  const listScroll = useRef(0);
  const reload = () => setVersion((v) => v + 1);

  const list = useAthletes('all', '');
  const sessions = useAthleteSessions(athleteId, version);
  const athlete = list.data?.athletes.find((a) => a.id === athleteId);
  // ?date=…&workout=… приходит из плана: открываем итоги или запланированную тренировку этого дня
  const fromPlan = sessions.data ? selectionFor(sessions.data, search.get('date'), search.get('workout')) : null;
  const selection = picked ?? fromPlan ?? (sessions.data ? defaultSelection(sessions.data) : null);

  const reviewId = selection?.kind === 'session' ? selection.sessionId : null;
  const plan = selection?.kind === 'plan' ? sessions.data?.planned.find((p) => p.kind === 'planned' && p.date === selection.date && p.workoutId === selection.workoutId) : undefined;
  const review = useTrainerReview(reviewId, version);
  const workout = usePlannedWorkout(athleteId, plan ? plan.workoutId : null);
  const library = useExercises();
  const exerciseHref = (name: string) => {
    const slug = library.data ? findSlug(name, library.data.map((e) => ({ id: e.id, name: e.name, aliases: e.aliases ?? [] }))) : null;
    return slug ? `/exercises/${slug}` : undefined;
  };
  const names = useMemo(() => review.data?.exercises.map((e) => e.name) ?? [], [review.data]);
  const past = usePastComments(athleteId, names, reviewId);

  const error = list.error ?? sessions.error;
  if (error) return <p role="alert">{error}</p>;
  if (!list.data || !sessions.data) return <Skeleton height={480} />;
  if (!athlete) return <p role="alert">Ученик не найден</p>;

  const today = toIso(new Date());
  const historyItem = sessions.data.history.find((h) => h.sessionId === reviewId);

  let detail: ReactNode;
  if (reviewId !== null) {
    detail = review.error ? (
      <p role="alert">{review.error}</p>
    ) : review.data && review.data.sessionId === reviewId ? (
      <ReviewDetail
        today={today}
        athleteName={firstName(athlete.name || athlete.email)}
        review={review.data}
        movedFrom={historyItem?.movedFrom}
        past={past.data ?? {}}
        videoSrc={(videoId) => `/api/videos/${videoId}`}
        exerciseHref={exerciseHref}
        onOpenExercise={(href) => navigate(href)}
        onComment={async (comment) => {
          await postComment(athleteId, comment);
          reload();
        }}
        onDeleteComment={async (commentId) => {
          await deleteComment(athleteId, commentId);
          reload();
        }}
        onMarkReviewed={async () => {
          await markReviewed(reviewId);
          reload();
        }}
      />
    ) : (
      <Skeleton height={360} />
    );
  } else if (plan) {
    detail = workout.error ? (
      <p role="alert">{workout.error}</p>
    ) : workout.data && library.data ? (
      <PlannedDetail
        today={today}
        item={plan}
        workout={workout.data.workout}
        library={library.data.map((e) => ({ id: e.id, name: e.name, aliases: e.aliases ?? [] }))}
        exerciseHref={exerciseHref}
        onOpenExercise={(href) => navigate(href)}
        onEdit={(workoutId) => navigate(`/trainer/athletes/${athleteId}/workouts/${workoutId}/edit`)}
        onHint={(workoutId, exerciseId, text) => postHint(athleteId, { workoutId, exerciseId, text })}
      />
    ) : (
      <Skeleton height={360} />
    );
  } else {
    detail = <p>Выберите тренировку слева</p>;
  }

  return (
    <AthleteView
      today={today}
      athlete={athlete}
      sessions={sessions.data}
      selection={selection}
      onSelect={(sel) => {
        setPicked(sel);
        listScroll.current = window.scrollY;
        setOpen(true);
        window.scrollTo(0, 0);
      }}
      open={open}
      onClose={() => {
        setOpen(false);
        requestAnimationFrame(() => window.scrollTo(0, listScroll.current));
      }}
      backHref="/trainer"
      onBack={() => navigate('/trainer')}
      onTab={(tab) => navigate(tab === 'plan' ? `/trainer/athletes/${athleteId}/plan` : `/trainer/athletes/${athleteId}`)}
      detail={detail}
    />
  );
}
