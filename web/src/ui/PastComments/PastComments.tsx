import { useId, useState } from 'react';
import type { ExerciseCommentItem } from '../../../../shared/types';
import { formatShortDate } from '../../shared/format';
import { cx } from '../cx';
import { formatTime } from '../VideoPlayer/player';
import styles from './PastComments.module.css';

const PREVIEW = 3;

type Props = {
  /** От новых к старым */
  items: ExerciseCommentItem[];
  /** Если задан, «Показать все» вызывает его (например, открывает экран); иначе список раскрывается на месте */
  onShowAll?: () => void;
  className?: string;
};

/** «Прошлые комментарии» к упражнению: три последних и «Показать все · N». */
export function PastComments({ items, onShowAll, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();
  if (items.length === 0) return null;
  const hasMore = items.length > PREVIEW;
  const shown = expanded ? items : items.slice(0, PREVIEW);
  return (
    <section className={cx(styles.root, className)} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.title}>
        Прошлые комментарии
      </h3>
      <ul className={styles.list}>
        {shown.map((c) => (
          <li key={c.id} className={styles.item}>
            <span className={styles.meta}>
              <span className={styles.date}>{formatShortDate(c.date)}</span>
              {typeof c.timecodeSec === 'number' && ` · на видео ${formatTime(c.timecodeSec)}`}
            </span>
            <span className={styles.text}>{c.text}</span>
          </li>
        ))}
      </ul>
      {hasMore && !(expanded && !onShowAll) && (
        <button
          type="button"
          className={styles.more}
          aria-expanded={onShowAll ? undefined : expanded}
          onClick={() => (onShowAll ? onShowAll() : setExpanded(true))}
        >
          Показать все · {items.length}
        </button>
      )}
    </section>
  );
}
