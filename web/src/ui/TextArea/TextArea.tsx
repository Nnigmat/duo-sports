import type { ComponentProps } from 'react';
import { cx } from '../cx';
import { Field } from '../Field/Field';
import styles from './TextArea.module.css';

type Props = Omit<ComponentProps<'textarea'>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Многострочное поле: лейбл сверху, подсказка или ошибка снизу, как у TextInput. */
export function TextArea({ label, hint, error, className, ...input }: Props) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, labelId: _labelId, ...a11y }) => (
        <textarea rows={4} {...input} {...a11y} id={id} className={cx(styles.input, error && styles.invalid, className)} />
      )}
    </Field>
  );
}
