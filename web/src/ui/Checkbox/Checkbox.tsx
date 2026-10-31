import type { ComponentProps } from 'react';
import { cx } from '../cx';
import styles from './Checkbox.module.css';

type Props = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  label: string;
  /** Вторая строка, например «Подходы 4 и 7 этого упражнения» */
  hint?: string;
};

/** Настоящий input + label: вся строка (не меньше 44 px) — область нажатия. */
export function Checkbox({ label, hint, className, ...input }: Props) {
  return (
    <label className={cx(styles.root, input.disabled && styles.disabled, className)}>
      <input {...input} type="checkbox" className={styles.input} />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
    </label>
  );
}
