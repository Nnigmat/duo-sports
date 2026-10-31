import { cx } from '../cx';
import styles from './CommentBubble.module.css';

type Props = {
  author: string;
  /** «12 окт» */
  date?: string;
  text: string;
  className?: string;
};

/** Комментарий тренера: инициал, автор, дата, текст. */
export function CommentBubble({ author, date, text, className }: Props) {
  return (
    <div className={cx(styles.root, className)}>
      <span className={styles.avatar} aria-hidden="true">
        {author.trim().charAt(0).toUpperCase()}
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.author}>{author}</span>
          {date && <span className={styles.date}>{date}</span>}
        </div>
        <p className={styles.text}>{text}</p>
      </div>
    </div>
  );
}
