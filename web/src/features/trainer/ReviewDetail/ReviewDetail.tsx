import { useEffect, useId, useRef, useState } from 'react';
import type { ExerciseCommentItem, ReviewComment, ReviewExercise, SessionReviewResponse } from '../../../../../shared/types';
import { formatMinutes, formatVolume } from '../../../shared/format';
import { Button, Comment, CommentField, PastComments, SetChip, StatusBadge, Text, VideoPlayer, type VideoPlayerHandle } from '../../../ui';
import { formatTime, type PlayerComment } from '../../../ui/VideoPlayer/player';
import type { NewComment } from '../api';
import { buildCommentRequest, movedText, rowDate } from '../sessions';
import styles from './ReviewDetail.module.css';

type Props = {
  today: string;
  /** Имя ученика для подписи его ответов */
  athleteName: string;
  review: SessionReviewResponse;
  /** Тренировка перенесена на этот день с этого */
  movedFrom?: string;
  /** Прошлые комментарии по названию упражнения */
  past: Record<string, ExerciseCommentItem[]>;
  videoSrc: (videoId: string) => string;
  /** Промис отклонён — ошибка показывается под полем */
  onComment: (comment: NewComment) => Promise<void>;
  /** Удалить свой комментарий */
  onDeleteComment: (commentId: string) => Promise<void>;
  onMarkReviewed: () => Promise<void>;
};

/** Справа в карточке ученика: выполненная тренировка по шагам, видео, переписка и «Отметить разобранной». */
export function ReviewDetail({ today, athleteName, review, movedFrom, past, videoSrc, onComment, onDeleteComment, onMarkReviewed }: Props) {
  const meta = [review.durationSec ? formatMinutes(Math.round(review.durationSec / 60)) : null, review.volumeKg > 0 ? formatVolume(review.volumeKg) : null].filter(Boolean).join(' · ');
  const moved = movedText({ movedFrom });
  return (
    <section className={styles.root} aria-labelledby="detail-title">
      <header className={styles.head}>
        <div className={styles.headText}>
          <Text variant="eyebrow">{rowDate(review.date, today)}</Text>
          <Text variant="h3" tag="h2" id="detail-title">
            {review.title}
          </Text>
        </div>
        <div className={styles.headMeta}>
          <StatusBadge status={review.reviewedAt ? 'reviewed' : 'review'} />
          {meta && <span className={styles.meta}>{meta}</span>}
        </div>
      </header>
      {moved && <p className={styles.moved}>{moved}</p>}

      {review.general.length > 0 && (
        <ul className={styles.thread} aria-label="Комментарии ко всей тренировке">
          {review.general.map((c) => (
            <ThreadItem key={c.id} comment={c} athleteName={athleteName} onDelete={onDeleteComment} />
          ))}
        </ul>
      )}

      <ol className={styles.steps} aria-label="Шаги тренировки">
        {review.exercises.map((ex, i) => (
          <Step key={ex.id} index={i + 1} exercise={ex} sessionId={review.sessionId} athleteName={athleteName} past={past[ex.name] ?? []} videoSrc={videoSrc} onComment={onComment} onDelete={onDeleteComment} />
        ))}
      </ol>

      <GeneralField sessionId={review.sessionId} onComment={onComment} />

      <footer className={styles.foot}>
        {review.reviewedAt ? <StatusBadge status="reviewed" /> : <MarkReviewed onMark={onMarkReviewed} />}
        {review.reviewedAt && <span className={styles.meta}>Тренировка разобрана</span>}
      </footer>
    </section>
  );
}

const authorOf = (c: ReviewComment, athleteName: string) => (c.author === 'trainer' ? 'Вы' : athleteName);

function ThreadItem({ comment: c, athleteName, onSeek, onDelete }: { comment: ReviewComment; athleteName: string; onSeek?: (videoId: string, sec: number) => void; onDelete: (commentId: string) => Promise<void> }) {
  return (
    <Comment
      author={authorOf(c, athleteName)}
      text={c.text}
      isNew={c.isNew}
      reply={c.author === 'athlete'}
      timecodeSec={c.videoId ? c.timecodeSec : null}
      onSeek={c.videoId && onSeek ? (sec) => onSeek(c.videoId!, sec) : undefined}
      onDelete={c.author === 'trainer' ? () => onDelete(c.id) : undefined}
    />
  );
}

function useSend(send: () => Promise<void>, after: () => void) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const run = async () => {
    setSending(true);
    setError(undefined);
    try {
      await send();
      after();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };
  return { sending, error, run };
}

function Step({
  index,
  exercise,
  sessionId,
  athleteName,
  past,
  videoSrc,
  onComment,
  onDelete,
}: {
  index: number;
  exercise: ReviewExercise;
  sessionId: number;
  athleteName: string;
  past: ExerciseCommentItem[];
  videoSrc: Props['videoSrc'];
  onComment: Props['onComment'];
  onDelete: Props['onDeleteComment'];
}) {
  const panelId = useId();
  const player = useRef<VideoPlayerHandle>(null);
  /** Какое видео раскрыто и с какой секунды его открыть */
  const [video, setVideo] = useState<{ id: string; startSec?: number } | null>(null);
  const [time, setTime] = useState(0);
  const [draft, setDraft] = useState('');
  /** По умолчанию комментарий к видео привязан к моменту; тренер может снять */
  const [attached, setAttached] = useState(true);
  const videoSets = exercise.sets.filter((s) => s.videoId);
  const openSet = videoSets.find((s) => s.videoId === video?.id);

  useEffect(() => {
    if (video?.startSec !== undefined) player.current?.seek(video.startSec);
  }, [video]);

  const seek = (id: string, sec: number) => {
    if (video?.id === id && player.current) player.current.seek(sec);
    else setVideo({ id, startSec: sec });
  };

  const { sending, error, run } = useSend(
    () =>
      onComment(
        buildCommentRequest({
          text: draft,
          sessionId,
          slug: exercise.slug,
          videoId: video?.id ?? videoSets[0]?.videoId ?? null,
          attachedSec: attached && video ? Math.floor(time) : null,
        }),
      ),
    () => {
      setDraft('');
    },
  );

  const timed: PlayerComment[] = exercise.thread.flatMap((c) =>
    c.author === 'trainer' && c.videoId === video?.id && c.timecodeSec !== null ? [{ id: c.id, timecodeSec: c.timecodeSec, text: c.text, author: 'Вы' }] : [],
  );

  return (
    <li className={styles.step}>
      <span className={styles.num} aria-hidden="true">
        {index}
      </span>
      <div className={styles.stepBody}>
        <div className={styles.stepHead}>
          <h3 className={styles.name}>{exercise.name}</h3>
          {exercise.newCount > 0 && <span className={styles.newBadge}>{exercise.newCount === 1 ? 'Новое' : `Новых: ${exercise.newCount}`}</span>}
        </div>
        <ul className={styles.sets} aria-label="Подходы">
          {exercise.sets.map((s) => (
            <li key={s.n}>
              <SetChip n={s.n} label={s.label} completed={s.completed} hasVideo={!!s.videoId} />
            </li>
          ))}
        </ul>

        {videoSets.length > 0 && (
          <div className={styles.videos}>
            {videoSets.map((s) => {
              const open = video?.id === s.videoId;
              return (
                <Button
                  key={s.videoId}
                  variant="secondary"
                  compact
                  icon="video"
                  aria-expanded={open}
                  aria-controls={open ? panelId : undefined}
                  onClick={() => {
                    setVideo(open ? null : { id: s.videoId! });
                    setAttached(true);
                  }}
                >
                  {open ? 'Скрыть видео' : `Видео, подход ${s.n}`}
                  {!open && s.videoDurationSec !== undefined && ` · ${formatTime(s.videoDurationSec)}`}
                </Button>
              );
            })}
          </div>
        )}
        {video && openSet && (
          <div id={panelId} className={styles.videoPanel}>
            <VideoPlayer ref={player} src={videoSrc(video.id)} durationSec={openSet.videoDurationSec ?? 0} comments={timed} title={exercise.name} subtitle={`Подход ${openSet.n} · ${openSet.label}`} onTimeChange={setTime} />
          </div>
        )}

        {exercise.note && (
          <div className={styles.note}>
            <span className={styles.noteHead}>Ученик написал</span>
            <span>{exercise.note}</span>
          </div>
        )}
        {exercise.thread.length > 0 && (
          <ul className={styles.thread} aria-label="Переписка по упражнению">
            {exercise.thread.map((c) => (
              <ThreadItem key={c.id} comment={c} athleteName={athleteName} onSeek={seek} onDelete={onDelete} />
            ))}
          </ul>
        )}
        <PastComments items={past} />
        <CommentField
          value={draft}
          onChange={setDraft}
          onSubmit={run}
          label={`Ваш комментарий к упражнению «${exercise.name}»`}
          placeholder={video ? 'Комментарий к моменту' : 'Комментарий к упражнению'}
          timecodeSec={video ? Math.floor(time) : undefined}
          attached={attached}
          onAttachedChange={setAttached}
          sending={sending}
          error={error}
        />
      </div>
    </li>
  );
}

function GeneralField({ sessionId, onComment }: { sessionId: number; onComment: Props['onComment'] }) {
  const [draft, setDraft] = useState('');
  const { sending, error, run } = useSend(() => onComment(buildCommentRequest({ text: draft, sessionId, slug: null, videoId: null, attachedSec: null })), () => setDraft(''));
  return (
    <div className={styles.general}>
      <Text variant="h5" tag="h3">
        Ко всей тренировке
      </Text>
      <CommentField value={draft} onChange={setDraft} onSubmit={run} label="Комментарий ко всей тренировке" placeholder="Комментарий ко всей тренировке" sending={sending} error={error} />
    </div>
  );
}

function MarkReviewed({ onMark }: { onMark: () => Promise<void> }) {
  const { sending, error, run } = useSend(onMark, () => undefined);
  return (
    <div className={styles.mark}>
      <Button icon="check" loading={sending} onClick={run}>
        Отметить тренировку разобранной
      </Button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
