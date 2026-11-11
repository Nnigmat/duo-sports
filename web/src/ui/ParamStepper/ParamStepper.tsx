import { useId, useState } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import { formatDuration } from '../Stepper/Stepper';
import { parseNumberInput } from './parseNumberInput';
import styles from './ParamStepper.module.css';

type Props = {
  /** «Повторы», «Вес», «Время» */
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Единица: «кг», «повт», «с». Для time показывается мм:сс */
  unit?: string;
  mode?: 'number' | 'duration';
  step?: number;
  min?: number;
  max?: number;
  /** Только целые: набранное и шаговое значение округляется */
  integer?: boolean;
  /** Имена кнопок вместо «Подпись: меньше/больше» */
  decreaseLabel?: string;
  increaseLabel?: string;
  /** id строки с подсказкой под полем */
  describedBy?: string;
  /** Валидное число из поля уходит в onChange на каждый символ. true: только в ResultSheet, где «Записать» может сработать без blur. По умолчанию число применяется по blur или Enter: правки зависимых полей (границы диапазона, круги) не должны срабатывать на полпути */
  live?: boolean;
  className?: string;
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Строка параметра: подпись слева, справа − значение +. Число можно ввести руками. */
export function ParamStepper({ label, value, onChange, unit, mode = 'number', step, min = 0, max = Infinity, integer = false, decreaseLabel, increaseLabel, describedBy, live = false, className }: Props) {
  const id = useId();
  const duration = mode === 'duration';
  const delta = step ?? (duration ? 5 : 1);
  const clamp = (n: number) => Math.min(max, Math.max(min, integer ? Math.round(n) : round(n)));
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const n = parseNumberInput(draft, clamp);
    if (n !== null && n !== value) onChange(n);
    setDraft(null);
  }

  function type(text: string) {
    setDraft(text);
    if (!live) return;
    const n = parseNumberInput(text, clamp);
    if (n !== null) onChange(n);
  }

  function press(next: number) {
    setDraft(null);
    onChange(clamp(next));
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
          aria-label={decreaseLabel ?? `${label}: меньше`}
          disabled={value <= min}
          onClick={() => press(value - delta)}
        >
          <Icon name="minus" />
        </button>
        {duration ? (
          <output id={id} aria-describedby={describedBy} className={styles.value}>
            {formatDuration(value)}
          </output>
        ) : (
          <span className={styles.field}>
            <input
              id={id}
              type="text"
              inputMode="decimal"
              aria-describedby={describedBy}
              className={styles.input}
              value={draft ?? String(value).replace('.', ',')}
              onChange={(e) => type(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
            />
            <span className={styles.unit}>{unit}</span>
          </span>
        )}
        <button
          type="button"
          className={styles.button}
          aria-label={increaseLabel ?? `${label}: больше`}
          disabled={value >= max}
          onClick={() => press(value + delta)}
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}
