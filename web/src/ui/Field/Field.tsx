import { useId, type ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Field.module.css';

export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
};

type Props = {
  label: string;
  /** Подсказка под контролом, например «План: 18–20» */
  hint?: string;
  /** Текст ошибки; заменяет подсказку */
  error?: string;
  children: (control: FieldControlProps & { labelId: string }) => ReactNode;
};

/** Лейбл сверху, контрол, подсказка или ошибка снизу. Связи label/aria-describedby выставляет сама. */
export function Field({ label, hint, error, children }: Props) {
  const uid = useId();
  const id = `${uid}-control`;
  const labelId = `${uid}-label`;
  const noteId = `${uid}-note`;
  const note = error ?? hint;

  return (
    <div className={styles.root}>
      <label id={labelId} htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        labelId,
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {note &&
        (error ? (
          <p id={noteId} className={styles.error}>
            <Icon name="alert" size={20} className={styles.errorIcon} />
            {error}
          </p>
        ) : (
          <p id={noteId} className={styles.hint}>
            {hint}
          </p>
        ))}
    </div>
  );
}
