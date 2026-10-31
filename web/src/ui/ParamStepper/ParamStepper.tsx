import { useId, useState } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import { formatDuration } from '../Stepper/Stepper';
import styles from './ParamStepper.module.css';

type Props = {
  /** «Повторы», «Вес», «Время» */
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Единица: «кг», «повт», «с». Для time показывается мм:сс */
  unit: string;
  mode?: 'number' | 'duration';
  step?: number;
  min?: number;
  max?: number;
  className?: string;
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Строка параметра: подпись слева, справа − значение +. Число можно ввести руками. */
export function ParamStepper({ label, value, onChange, unit, mode = 'number', step, min = 0, max = Infinity, className }: Props) {
  const id = useId();
  const duration = mode === 'duration';
  const delta = step ?? (duration ? 5 : 1);
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)));
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const n = Number(draft.replace(',', '.'));
    if (draft.trim() !== '' && Number.isFinite(n)) onChange(clamp(n));
    setDraft(null);
  }

  return (
    <div className={cx(styles.row, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <button
          type="button"
          className={styles.button}
          aria-label={`${label}: меньше`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - delta))}
        >
          <Icon name="minus" />
        </button>
        {duration ? (
          <output id={id} className={styles.value}>
            {formatDuration(value)}
          </output>
        ) : (
          <span className={styles.field}>
            <input
              id={id}
              type="text"
              inputMode="decimal"
              className={styles.input}
              value={draft ?? String(value).replace('.', ',')}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
            />
            <span className={styles.unit}>{unit}</span>
          </span>
        )}
        <button
          type="button"
          className={styles.button}
          aria-label={`${label}: больше`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + delta))}
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}
