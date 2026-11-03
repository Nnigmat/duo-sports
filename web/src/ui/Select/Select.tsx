import type { ComponentProps } from 'react';
import { cx } from '../cx';
import { Field } from '../Field/Field';
import styles from './Select.module.css';

type Props = Omit<ComponentProps<'select'>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Обычный <select> со своим видом: одна строка, стрелка справа, 44 px по высоте. */
export function Select({ label, hint, error, className, children, ...select }: Props) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, labelId: _labelId, ...a11y }) => (
        <select {...select} {...a11y} id={id} className={cx(styles.select, error && styles.invalid, className)}>
          {children}
        </select>
      )}
    </Field>
  );
}
