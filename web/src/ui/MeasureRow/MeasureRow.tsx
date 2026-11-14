import { formatDelta, formatValue, parseInput, sanitizeInput } from '../measureNumbers';
import styles from './MeasureRow.module.css';

type Props = {
  id: string;
  label: string;
  unit: string;
  /** Прошлое значение показателя; null — замера ещё не было */
  previous: number | null;
  /** Строка, как её вводит человек: «80,5» */
  value: string;
  active: boolean;
  onChange: (raw: string) => void;
  onFocus: () => void;
};

function caption(previous: number | null, value: string, invalid: boolean): string {
  if (invalid) return 'не похоже на число, пример: 72,5';
  if (previous === null) return 'первый замер';
  const base = `было ${formatValue(previous)}`;
  const next = parseInput(value);
  if (next === null) return base;
  const delta = next - previous;
  return `${base} → ${formatDelta(delta) === '0' ? 'без изменений' : formatDelta(delta)}`;
}

/** Строка замера. Вся строка — label поля, поле 44 px; активное выделено рамкой 2 px. */
export function MeasureRow({ id, label, unit, previous, value, active, onChange, onFocus }: Props) {
  const inputId = `m-${id}`;
  const invalid = value !== '' && parseInput(value) === null;
  return (
    <label htmlFor={inputId} className={styles.row}>
      <span className={styles.text}>
        <span id={`${inputId}-label`} className={styles.label}>
          {label}
        </span>
        <span id={`${inputId}-note`} className={styles.caption}>
          {caption(previous, value, invalid)}
        </span>
      </span>
      <span className={styles.field} data-active={active} data-invalid={invalid}>
        <input
          id={inputId}
          aria-labelledby={`${inputId}-label`}
          aria-describedby={`${inputId}-note`}
          aria-invalid={invalid}
          className={styles.input}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={previous === null ? '' : formatValue(previous)}
          onChange={(e) => onChange(sanitizeInput(e.target.value))}
          onFocus={onFocus}
        />
        <span className={styles.unit}>{unit}</span>
      </span>
    </label>
  );
}
