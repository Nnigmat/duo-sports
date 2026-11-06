import { useState } from 'react';
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
  /** Удалить: кнопка только у автора. Нажатие просит подтверждения; промис отклонён — показываем ошибку */
  onDelete?: () => Promise<void>;
  className?: string;
};

/** Комментарий в разборе. Элемент списка: оборачивать в <ul>. */
export function Comment({ author, text, timecodeSec, onSeek, timecodeHref, isNew, reply, active, onDelete, className }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
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
        {onDelete && (
          <button
            type="button"
            className={cx(styles.delete, confirm && styles.confirm)}
            disabled={busy}
            aria-busy={busy || undefined}
            onBlur={() => setConfirm(false)}
            onClick={async () => {
              if (!confirm) return setConfirm(true);
              setBusy(true);
              setError(undefined);
              try {
                await onDelete();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Не удалось удалить');
                setConfirm(false);
                setBusy(false);
              }
            }}
          >
            {confirm ? 'Точно удалить' : 'Удалить'}
          </button>
        )}
      </span>
      <span className={styles.text}>{text}</span>
      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </li>
  );
}
