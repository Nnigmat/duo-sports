import { useId, useRef } from 'react';
import { Button, Notice, Text } from '../../../../ui';
import { useMediaQuery } from '../../../../shared';
import styles from './DemoSlot.module.css';

type Props = {
  /** «Девочка» или «Мальчик» */
  label: string;
  /** Адрес загруженного ролика; без него слот пустой */
  src?: string;
  /** Файл уходит на сервер: выбор и удаление недоступны */
  busy?: boolean;
  /** Слот недоступен (упражнение ещё не создано) */
  disabled?: boolean;
  error?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
};

/** Один слот ролика чибика: превью, «Выбрать»/«Заменить» и «Удалить». Файл выбирается настоящим input type=file. */
export function DemoSlot({ label, src, busy, disabled, error, onPick, onRemove }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const inactive = busy || disabled;

  return (
    <div className={styles.root} aria-busy={busy || undefined}>
      <Text variant="body-sm" tag="p" id={`${id}-label`} className={styles.label}>{label}</Text>
      <div className={styles.preview}>
        {src ? (
          // Превью зациклено и без звука; при reduced motion стоит на первом кадре
          <video key={src} src={src} muted loop playsInline autoPlay={!still} controls={still} preload="metadata" aria-labelledby={`${id}-label`} />
        ) : (
          <Text variant="caption" color="slate">Ролика нет</Text>
        )}
      </div>
      <input
        ref={input}
        className={styles.file}
        type="file"
        accept="video/mp4,video/webm"
        disabled={inactive}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // тот же файл можно выбрать повторно
          if (file) onPick(file);
        }}
      />
      <div className={styles.actions}>
        <Button variant="secondary" compact icon="upload" loading={busy} disabled={disabled} onClick={() => input.current?.click()}>
          {busy ? 'Загружаем' : src ? 'Заменить' : 'Выбрать файл'}
        </Button>
        {src && (
          <Button variant="ghost" compact disabled={inactive} onClick={onRemove}>
            Удалить
          </Button>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
