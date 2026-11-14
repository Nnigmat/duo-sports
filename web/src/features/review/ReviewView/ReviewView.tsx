import { useState, type MouseEvent } from 'react';
import type { ReviewComment, ReviewExercise, SessionReviewResponse } from '../../../../../shared/types';
import { commentsCount, formatMinutes, formatReviewedAt, formatVolume } from '../../../shared/format';
import { Comment, CommentField, Icon, IconButton, SetChip } from '../../../ui';
import { formatTime } from '../../../ui/VideoPlayer/player';
import { formatLongDate } from '../../workout/flow/ru';
import { parseIso } from '../../plan/plan';
import { FoldedSection } from '../FoldedSection/FoldedSection';
import { sectionStarts } from '../sections';
import styles from './ReviewView.module.css';

const FACT_MARK = {
  'В плане': { state: 'within', text: 'В плане' },
  'Меньше плана': { state: 'below', text: 'Меньше' },
  'Больше плана': { state: 'above', text: 'Больше' },
} as const;

type Props = {
  review: SessionReviewResponse;
  onBack: () => void;
  /** Ссылка на видео с комментариями; позиция (секунды) добавляется к адресу снаружи */
  videoHref: (videoId: string, timecodeSec?: number) => string;
  onOpenVideo: (videoId: string, timecodeSec?: number) => void;
  /** Ответ к упражнению; промис отклонён — показываем ошибку под полем */
  onReply: (exercise: ReviewExercise, text: string) => Promise<void>;
  /** Удалить свой ответ; без колбэка кнопки нет */
  onDeleteComment?: (commentId: string) => Promise<void>;
  planHref?: string;
  onOpenPlan?: () => void;
  layout?: 'mobile' | 'desktop';
};

const author = (c: ReviewComment) => (c.author === 'trainer' ? 'Тренер' : 'Ты');

/** Ученик удаляет только свои ответы */
const deleteOf = (c: ReviewComment, onDelete?: (id: string) => Promise<void>) => (c.author === 'athlete' && onDelete ? () => onDelete(c.id) : undefined);

/** Разбор для ученика: комментарии тренера по упражнениям, ответы и подсказки к следующему занятию. */
export function ReviewView({ review, onBack, videoHref, onOpenVideo, onReply, onDeleteComment, planHref, onOpenPlan, layout = 'mobile' }: Props) {
  const meta = [review.durationSec ? formatMinutes(Math.round(review.durationSec / 60)) : null, review.volumeKg > 0 ? formatVolume(review.volumeKg) : null].filter(Boolean).join(' · ');
  const starts = sectionStarts(review.sections);
  return (
    <div className={styles.root} data-layout={layout}>
      <header className={styles.header}>
        <IconButton bare icon="back" aria-label="Назад" onClick={onBack} />
        <span className={styles.headerTitle}>Разбор тренировки</span>
      </header>
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.banner}>
            <span className={styles.bannerIcon} aria-hidden="true">
              <Icon name="comment" size={20} />
            </span>
            <span className={styles.bannerText}>
              <strong>{review.reviewedAt ? 'Тренер разобрал тренировку' : 'Тренер ещё не разобрал тренировку'}</strong>
              <span>
                {commentsCount(review.trainerCommentCount)}
                {review.reviewedAt && ` · ${formatReviewedAt(review.reviewedAt)}`}
              </span>
            </span>
          </div>

          <div className={styles.title}>
            <span className={styles.eyebrow}>{formatLongDate(parseIso(review.date))}</span>
            <h1 className={styles.h1}>{review.title}</h1>
            {meta && <span className={styles.meta}>{meta}</span>}
          </div>

          {review.general.length > 0 && (
            <ul className={styles.thread} aria-label="Комментарии ко всей тренировке">
              {review.general.map((c) => (
                <Comment key={c.id} author={author(c)} text={c.text} isNew={c.isNew} reply={c.author === 'athlete'} onDelete={deleteOf(c, onDeleteComment)} />
              ))}
            </ul>
          )}

          {review.sections.map((sec, si) => {
            const start = starts[si];
            const list = (
              <ol key={sec.key} className={styles.exercises} aria-label={sec.title}>
                {sec.exercises.map((ex, i) => (
                  <ExerciseCard key={ex.id} index={start === null ? undefined : start + i} exercise={ex} videoHref={videoHref} onOpenVideo={onOpenVideo} onReply={onReply} onDelete={onDeleteComment} />
                ))}
              </ol>
            );
            return sec.folded ? (
              <FoldedSection key={sec.key} section={sec}>
                {list}
              </FoldedSection>
            ) : (
              <div key={sec.key}>{list}</div>
            );
          })}

        </div>

        {review.hints && (
          <section className={styles.hints} aria-labelledby="hints-title">
            <div className={styles.hintsHead}>
              <span className={styles.eyebrow}>Следующая тренировка · {formatLongDate(parseIso(review.hints.date))}</span>
              <h2 id="hints-title" className={styles.h2}>
                Подсказки от тренера
              </h2>
            </div>
            <ul className={styles.hintList}>
              {review.hints.hints.map((h) => (
                <li key={`${h.exerciseName}:${h.text}`} className={styles.hint}>
                  <span className={styles.hintName}>
                    {h.exerciseName}
                    {h.detail && ` · ${h.detail}`}
                  </span>
                  <span className={styles.hintText}>{h.text}</span>
                </li>
              ))}
            </ul>
            {planHref && (
              <a
                className={styles.planLink}
                href={planHref}
                onClick={(e) => {
                  if (!onOpenPlan) return;
                  e.preventDefault();
                  onOpenPlan();
                }}
              >
                Открыть план
              </a>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function ExerciseCard({
  index,
  exercise,
  videoHref,
  onOpenVideo,
  onReply,
  onDelete,
}: {
  /** Номер карточки; у свёрнутых блоков (разминка, заминка) номера нет */
  index?: number;
  exercise: ReviewExercise;
  videoHref: Props['videoHref'];
  onOpenVideo: Props['onOpenVideo'];
  onReply: Props['onReply'];
  onDelete: Props['onDeleteComment'];
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const withVideo = exercise.sets.find((s) => s.videoId);
  const hasThread = exercise.thread.length > 0;
  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(undefined);
    try {
      await onReply(exercise, text);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        {index !== undefined && (
          <span className={styles.num} aria-hidden="true">
            {index}
          </span>
        )}
        <h2 className={styles.name}>
          {exercise.name}
          {exercise.replacedFrom && <span className={styles.replaced}>вместо «{exercise.replacedFrom}»</span>}
        </h2>
        {exercise.newCount > 0 && <span className={styles.newBadge}>{exercise.newCount} {exercise.newCount === 1 ? 'новый' : 'новых'}</span>}
      </div>
      <ul className={styles.sets} aria-label="Подходы">
        {exercise.sets.map((s) => (
          <li key={s.n}>
            <SetChip n={s.n} label={s.label} completed={s.completed} hasVideo={!!s.videoId} />
          </li>
        ))}
      </ul>
      {exercise.sets.some((s) => s.actualLabel) && (
        <ul className={styles.facts} aria-label="Факт и план">
          {exercise.sets.map((s) =>
            s.actualLabel ? (
              <li key={s.n} className={styles.fact}>
                <span className={styles.factN}>{s.n}.</span>
                <span className={styles.factValue}>{s.actualLabel}</span>
                <span className={styles.factPlan}>план {s.label}</span>
                {s.factMark && (
                  <span className={styles.factMark} data-mark={FACT_MARK[s.factMark].state}>
                    {FACT_MARK[s.factMark].text}
                  </span>
                )}
                {s.extraWeight && <span className={styles.factExtra}>Был доп. вес</span>}
              </li>
            ) : null,
          )}
        </ul>
      )}
      {withVideo?.videoId && (
        <a
          className={styles.video}
          href={videoHref(withVideo.videoId)}
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            onOpenVideo(withVideo.videoId!);
          }}
        >
          <span className={styles.videoTag}>
            <span>
              Подход {withVideo.n} · {withVideo.actualLabel ?? withVideo.label}
            </span>
            {withVideo.actualLabel && <span className={styles.videoTagPlan}>план {withVideo.label}</span>}
          </span>
          <span className={styles.play} aria-hidden="true">
            <Icon name="play" size={24} />
          </span>
          <span className={styles.videoFoot}>
            <span className={styles.videoCta}>
              <Icon name="comment" size={20} />
              Смотреть с комментариями
            </span>
            {withVideo.videoDurationSec !== undefined && <span>{formatTime(withVideo.videoDurationSec)}</span>}
          </span>
        </a>
      )}
      {exercise.note && (
        <div className={styles.note}>
          <span className={styles.noteHead}>Ты написал</span>
          <span className={styles.noteText}>{exercise.note}</span>
        </div>
      )}
      {hasThread && (
        <ul className={styles.thread} aria-label="Комментарии тренера">
          {exercise.thread.map((c) => (
            <Comment
              key={c.id}
              author={author(c)}
              text={c.text}
              isNew={c.isNew}
              reply={c.author === 'athlete'}
              timecodeSec={c.videoId ? c.timecodeSec : null}
              onSeek={c.videoId ? (sec) => onOpenVideo(c.videoId!, sec) : undefined}
              onDelete={deleteOf(c, onDelete)}
            />
          ))}
        </ul>
      )}
      {!hasThread && <span className={styles.empty}>Без комментариев тренера</span>}
      {hasThread && (
        <CommentField
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          label={`Ответ тренеру по упражнению «${exercise.name}»`}
          placeholder="Ответить"
          sending={sending}
          error={error}
        />
      )}
    </li>
  );
}
