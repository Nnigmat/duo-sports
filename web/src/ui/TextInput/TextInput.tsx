import type { ComponentProps } from 'react';
import { cx } from '../cx';
import { Field } from '../Field/Field';
import styles from './TextInput.module.css';

type Props = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextInput({ label, hint, error, className, ...input }: Props) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, labelId: _labelId, ...a11y }) => (
        <input {...input} {...a11y} id={id} className={cx(styles.input, error && styles.invalid, className)} />
      )}
    </Field>
  );
}
