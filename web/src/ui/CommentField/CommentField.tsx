import { useId, useLayoutEffect, useRef } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import { formatTime } from '../VideoPlayer/player';
import styles from './CommentField.module.css';

const MAX_LINES = 4;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Подпись поля для скринридера */
  label?: string;
  placeholder?: string;
  /** Текущее время видео; без него переключателя нет */
  timecodeSec?: number | null;
  attached?: boolean;
  onAttachedChange?: (attached: boolean) => void;
  sending?: boolean;
  /** Текст ошибки отправки */
  error?: string;
  disabled?: boolean;
  className?: string;
};

/** Поле комментария: авто-высота 1–4 строки, круглая кнопка отправки, привязка к моменту видео. */
export function CommentField({
  value,
  onChange,
  onSubmit,
  label = 'Комментарий',
  placeholder = 'Комментарий',
  timecodeSec,
  attached = false,
  onAttachedChange,
  sending = false,
  error,
  disabled = false,
  className,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const empty = value.trim() === '';

  // biome-ignore lint/correctness/useExhaustiveDependencies: высота пересчитывается при смене value
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 21;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const max = line * MAX_LINES + pad;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [value]);

  return (
    <form
      className={cx(styles.root, className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !sending && !disabled) onSubmit();
      }}
    >
      {typeof timecodeSec === 'number' && (
        <button
          type="button"
          className={styles.attach}
          aria-pressed={attached}
          disabled={disabled}
          onClick={() => onAttachedChange?.(!attached)}
        >
          <Icon name={attached ? 'check' : 'clock'} size={20} className={styles.attachIcon} />
          К моменту {formatTime(timecodeSec)}
        </button>
      )}
      <div className={styles.row}>
        <textarea
          ref={ref}
          rows={1}
          className={styles.input}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="submit"
          className={styles.send}
          aria-label={sending ? 'Отправляем' : 'Отправить'}
          aria-busy={sending || undefined}
          disabled={disabled || sending || empty}
        >
          <Icon name={sending ? 'loop' : 'arrowRight'} size={20} className={sending ? styles.spin : undefined} />
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          <Icon name="alert" size={20} className={styles.errorIcon} />
          {error}
        </p>
      )}
    </form>
  );
}
