import { useState, type ComponentProps, type ReactNode } from 'react';
import { cx } from '../cx';
import { Field } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import inputStyles from '../TextInput/TextInput.module.css';
import styles from './PasswordInput.module.css';

type Props = Omit<ComponentProps<'input'>, 'id' | 'type'> & {
  label: string;
  hint?: string;
  error?: string;
  /** Справа от лейбла, например ссылка «Забыли пароль?» */
  labelAside?: ReactNode;
};

/** Поле пароля с кнопкой «Показать пароль» внутри (44 px). */
export function PasswordInput({ label, hint, error, labelAside, className, ...input }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} labelAside={labelAside}>
      {({ id, labelId: _labelId, ...a11y }) => (
        <div className={styles.wrap}>
          <input
            {...input}
            {...a11y}
            id={id}
            type={shown ? 'text' : 'password'}
            className={cx(inputStyles.input, styles.input, error && inputStyles.invalid, className)}
          />
          <button
            type="button"
            className={styles.toggle}
            aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
          >
            <Icon name={shown ? 'eyeOff' : 'eye'} size={20} />
          </button>
        </div>
      )}
    </Field>
  );
}
