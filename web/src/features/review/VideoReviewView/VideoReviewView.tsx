import { useEffect, useRef, useState } from 'react';
import type { ReviewComment, VideoReviewResponse } from '../../../../../shared/types';
import { Comment, CommentField, IconButton, VideoPlayer, type VideoPlayerHandle } from '../../../ui';
import { activeComment, type PlayerComment } from '../../../ui/VideoPlayer/player';
import styles from './VideoReviewView.module.css';

type Props = {
  video: VideoReviewResponse['video'];
  comments: ReviewComment[];
  /** Адрес файла видео */
  src?: string;
  /** С какой секунды открыть (из ссылки на комментарий) */
  startSec?: number;
  onBack: () => void;
  /** timecodeSec — момент видео, если ответ привязан; промис отклонён — показываем ошибку */
  /** Удалить свой ответ; без колбэка кнопки нет */
  onDeleteComment?: (commentId: string) => Promise<void>;
  onReply: (text: string, timecodeSec: number | null) => Promise<void>;
};

const author = (c: ReviewComment) => (c.author === 'trainer' ? 'Тренер' : 'Ты');

/** Видео ученика с комментариями тренера: комментарий всплывает в своё время, ответ можно привязать к моменту. */
export function VideoReviewView({ video, comments, src, startSec, onBack, onReply, onDeleteComment }: Props) {
  const player = useRef<VideoPlayerHandle>(null);
  const [time, setTime] = useState(startSec ?? 0);
  const [draft, setDraft] = useState('');
  const [attached, setAttached] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (startSec !== undefined) player.current?.seek(startSec);
  }, [startSec]);

  const timed: PlayerComment[] = comments.flatMap((c) => (c.timecodeSec === null ? [] : [{ id: c.id, timecodeSec: c.timecodeSec, text: c.text, author: author(c) }]));
  const trainerComments = timed.filter((c) => comments.find((x) => x.id === c.id)?.author === 'trainer');
  const active = activeComment(trainerComments, time)?.id;
  const trainerCount = comments.filter((c) => c.author === 'trainer').length;

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(undefined);
    try {
      await onReply(text, attached ? Math.floor(time) : null);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.root}>
      <VideoPlayer
        ref={player}
        src={src}
        durationSec={video.durationSec}
        comments={trainerComments}
        title={video.exerciseName}
        subtitle={video.label}
        overlayStart={<IconButton bare icon="back" aria-label="Назад к разбору" onClick={onBack} className={styles.back} />}
        onTimeChange={setTime}
      />
      <div className={styles.list}>
        <h2 className={styles.h2}>Комментарии тренера · {trainerCount}</h2>
        {comments.length === 0 ? (
          <p className={styles.empty}>К этому видео пока нет комментариев</p>
        ) : (
          <ul className={styles.items}>
            {comments.map((c) => (
              <Comment
                key={c.id}
                author={author(c)}
                text={c.text}
                isNew={c.isNew}
                reply={c.author === 'athlete'}
                active={c.id === active}
                onDelete={c.author === 'athlete' && onDeleteComment ? () => onDeleteComment(c.id) : undefined}
                timecodeSec={c.timecodeSec}
                onSeek={(sec) => player.current?.seek(sec)}
              />
            ))}
          </ul>
        )}
      </div>
      <div className={styles.footer}>
        <CommentField
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          label="Ответ тренеру"
          placeholder="Ответить"
          timecodeSec={Math.floor(time)}
          attached={attached}
          onAttachedChange={setAttached}
          sending={sending}
          error={error}
        />
      </div>
    </div>
  );
}
