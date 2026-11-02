import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import { formatTime } from '../VideoPlayer/player';
import styles from './Comment.module.css';

type Props = {
  /** Подпись автора: «Тренер» или «Ты» — решает экран по роли зрителя */
  author: string;
  text: string;
  /** Секунда видео; без неё кнопки таймкода нет */
  timecodeSec?: number | null;
  /** Нажатие на таймкод: перейти к моменту */
  onSeek?: (sec: number) => void;
  /** Ссылка вместо кнопки (экран разбора ведёт на страницу видео) */
  timecodeHref?: string;
  isNew?: boolean;
  /** Ответ ученика: сдвиг вправо на 24 px */
  reply?: boolean;
  /** Сейчас показан поверх видео */
  active?: boolean;
  className?: string;
};

/** Комментарий в разборе. Элемент списка: оборачивать в <ul>. */
export function Comment({ author, text, timecodeSec, onSeek, timecodeHref, isNew, reply, active, className }: Props) {
  const hasTime = typeof timecodeSec === 'number';
  const time = hasTime ? formatTime(timecodeSec) : '';
  const timeAria = `Перейти к ${time}`;
  const timeInner = (
    <span className={styles.pill}>
      <Icon name="play" size={20} className={styles.playIcon} />
      {time}
    </span>
  );
  return (
    <li className={cx(styles.root, reply && styles.reply, active && styles.active, className)} aria-current={active ? 'true' : undefined}>
      <span className={styles.head}>
        <span className={cx(styles.author, reply && styles.athlete)}>{author}</span>
        {hasTime &&
          (timecodeHref ? (
            <a className={styles.time} href={timecodeHref} aria-label={timeAria} onClick={() => onSeek?.(timecodeSec)}>
              {timeInner}
            </a>
          ) : (
            <button type="button" className={styles.time} aria-label={timeAria} onClick={() => onSeek?.(timecodeSec)}>
              {timeInner}
            </button>
          ))}
        {isNew && (
          <span className={styles.new}>
            <span className={styles.dot} aria-hidden="true" />
            <span>новое</span>
          </span>
        )}
      </span>
      <span className={styles.text}>{text}</span>
    </li>
  );
}
