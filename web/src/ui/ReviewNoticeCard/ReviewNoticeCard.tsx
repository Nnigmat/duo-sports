import { useId, type MouseEventHandler, type ReactNode } from 'react';
import type { ReviewNotice } from '../../../../shared/types';
import { commentsCount, formatReviewedAt } from '../../shared/format';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import { formatTime } from '../VideoPlayer/player';
import styles from './ReviewNoticeCard.module.css';

type Props = {
  notice: ReviewNotice;
  /** Куда ведёт «Посмотреть разбор»; роутер снаружи */
  href: string;
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
  onDismiss: () => void;
  /** Подпись ссылки */
  children?: ReactNode;
  /** Для историй и тестов */
  now?: Date;
  className?: string;
};

/** Карточка «Сегодня»: тренер разобрал тренировку. */
export function ReviewNoticeCard({ notice, href, onLinkClick, onDismiss, children = 'Посмотреть разбор', now, className }: Props) {
  const titleId = useId();
  const { commentCount, videoCommentCount, preview } = notice;
  const when = formatReviewedAt(notice.reviewedAt, now);
  const counts =
    videoCommentCount > 0 ? `${commentsCount(commentCount)} · ${videoCommentCount} к видео` : commentsCount(commentCount);
  return (
    <section className={cx(styles.root, className)} aria-labelledby={titleId}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          <Icon name="comment" size={20} />
        </span>
        <div className={styles.titles}>
          <span className={styles.eyebrow}>Новый разбор{when && ` · ${when}`}</span>
          <h2 id={titleId} className={styles.title}>
            Тренер разобрал «{notice.title}»
          </h2>
          <span className={styles.counts}>{counts}</span>
        </div>
        <button type="button" className={styles.dismiss} aria-label="Скрыть" onClick={onDismiss}>
          <Icon name="close" size={20} />
        </button>
      </div>
      {preview && (
        <div className={styles.preview}>
          <span className={styles.previewHead}>
            {preview.exerciseName}
            {typeof preview.timecodeSec === 'number' && <span className={styles.time}>{formatTime(preview.timecodeSec)}</span>}
          </span>
          <span className={styles.previewText}>«{preview.text}»</span>
        </div>
      )}
      <a className={styles.link} href={href} onClick={onLinkClick}>
        {children}
      </a>
    </section>
  );
}
