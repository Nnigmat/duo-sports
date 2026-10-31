import { cx } from '../cx';
import { Field } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import styles from './Stepper.module.css';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** number — кнопки − / +; duration — значение в секундах, показ мм:сс, кнопки «−5 с» / «+5 с» */
  mode?: 'number' | 'duration';
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  error?: string;
  /** Имена кнопок −/+; в duration имя — видимый текст «−5 с» / «+5 с» (иначе axe: label-content-name-mismatch) */
  decreaseLabel?: string;
  increaseLabel?: string;
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Stepper({
  label,
  value,
  onChange,
  mode = 'number',
  step,
  min = 0,
  max = Infinity,
  hint,
  error,
  decreaseLabel,
  increaseLabel,
}: Props) {
  const duration = mode === 'duration';
  const delta = step ?? (duration ? 5 : 1);
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)));
  const shown = duration ? formatDuration(value) : String(value).replace('.', ',');

  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, labelId, 'aria-describedby': describedBy }) => (
        <div
          role="group"
          aria-labelledby={labelId}
          className={cx(styles.root, duration && styles.duration, error && styles.invalid)}
        >
          <button
            type="button"
            className={styles.button}
            aria-label={decreaseLabel ?? (duration ? undefined : 'Меньше')}
            disabled={value <= min}
            onClick={() => onChange(clamp(value - delta))}
          >
            {duration ? `−${delta} с` : <Icon name="minus" />}
          </button>
          <output id={id} aria-describedby={describedBy} className={styles.value}>
            {shown}
          </output>
          <button
            type="button"
            className={styles.button}
            aria-label={increaseLabel ?? (duration ? undefined : 'Больше')}
            disabled={value >= max}
            onClick={() => onChange(clamp(value + delta))}
          >
            {duration ? `+${delta} с` : <Icon name="plus" />}
          </button>
        </div>
      )}
    </Field>
  );
}
