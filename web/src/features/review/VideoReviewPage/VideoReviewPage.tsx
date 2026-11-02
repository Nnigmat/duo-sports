import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useVideoReview } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { postReply } from '../api';
import { VideoReviewView } from '../VideoReviewView/VideoReviewView';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** /review/video/:videoId?t=21 — видео с комментариями; t — секунда, с которой открыть. */
export function VideoReviewPage() {
  const { videoId } = useParams();
  if (!videoId || !UUID.test(videoId)) return <Navigate to="/" replace />;
  return <VideoReviewLoader videoId={videoId} />;
}

function VideoReviewLoader({ videoId }: { videoId: string }) {
  const [version, setVersion] = useState(0);
  /** После ответа страница читается заново; место в видео не теряем */
  const [resumeAt, setResumeAt] = useState<number | undefined>();
  return (
    <VideoReviewContent
      key={`${videoId}:${version}`}
      videoId={videoId}
      resumeAt={resumeAt}
      onChanged={(at) => {
        setResumeAt(at);
        setVersion((v) => v + 1);
      }}
    />
  );
}

function VideoReviewContent({ videoId, resumeAt, onChanged }: { videoId: string; resumeAt?: number; onChanged: (at?: number) => void }) {
  const { data, error } = useVideoReview(videoId);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={480} />;
  const t = Number(params.get('t'));
  const sessionId = data.video.sessionId;
  return (
    <VideoReviewView
      video={data.video}
      comments={data.comments}
      src={`/api/videos/${videoId}`}
      startSec={resumeAt ?? (params.has('t') && Number.isFinite(t) && t >= 0 ? t : undefined)}
      onBack={() => navigate(sessionId === null ? '/' : `/review/${sessionId}`)}
      onReply={async (text, timecodeSec) => {
        await postReply(data.athleteId, { text, videoId, ...(timecodeSec === null ? {} : { timecodeSec }) });
        onChanged(timecodeSec ?? undefined);
      }}
    />
  );
}
