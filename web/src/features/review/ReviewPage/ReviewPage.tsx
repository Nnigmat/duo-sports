import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { ReviewExercise } from '../../../../../shared/types';
import { useSessionReview } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { deleteComment, postReply } from '../api';
import { ReviewView } from '../ReviewView/ReviewView';

/** /review/:sessionId — разбор тренировки для ученика. После ответа страница читает разбор заново. */
export function ReviewPage() {
  const { sessionId } = useParams();
  if (!sessionId || !/^\d+$/.test(sessionId)) return <Navigate to="/" replace />;
  return <ReviewLoader sessionId={Number(sessionId)} />;
}

function ReviewLoader({ sessionId }: { sessionId: number }) {
  const [version, setVersion] = useState(0);
  return <ReviewContent key={`${sessionId}:${version}`} sessionId={sessionId} onChanged={() => setVersion((v) => v + 1)} />;
}

function ReviewContent({ sessionId, onChanged }: { sessionId: number; onChanged: () => void }) {
  const { data, error } = useSessionReview(sessionId);
  const navigate = useNavigate();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={480} />;

  const reply = async (exercise: ReviewExercise, text: string) => {
    // Упражнения нет в библиотеке: ответ привязываем к его видео, а без видео ко всей тренировке
    const videoId = exercise.sets.find((s) => s.videoId)?.videoId;
    await postReply(data.athleteId, {
      text,
      sessionId,
      ...(exercise.slug ? { exerciseId: exercise.slug } : videoId ? { videoId } : {}),
    });
    onChanged();
  };
  const videoHref = (id: string, t?: number) => `/review/video/${id}${t === undefined ? '' : `?t=${t}`}`;
  return (
    <ReviewView
      review={data}
      onBack={() => navigate('/')}
      videoHref={videoHref}
      onOpenVideo={(id, t) => navigate(videoHref(id, t))}
      onReply={reply}
      onDeleteComment={async (id) => {
        await deleteComment(data.athleteId, id);
        onChanged();
      }}
      planHref="/plan"
      onOpenPlan={() => navigate('/plan')}
    />
  );
}
