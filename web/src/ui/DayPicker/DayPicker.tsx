import { useRef, type KeyboardEvent } from 'react';
import { cx } from '../cx';
import { arrowTarget, dayLabel } from '../labels';
import styles from './DayPicker.module.css';

export type PickerDay = {
  /** «2026-11-04» */
  date: string;
  /** «ср» */
  weekday: string;
  /** «4» */
  day: string;
  /** Название тренировки, которая уже стоит в этот день */
  busy?: string;
  /** День нельзя выбрать (например, он в прошлом) */
  disabled?: boolean;
};

type Props = {
  /** Что выбираем — для скринридера: «Новый день тренировки» */
  label: string;
  days: PickerDay[];
  value?: string;
  onChange: (date: string) => void;
  className?: string;
};

/** Семь дней в ряд. Стрелки переключают день, занятый день отмечен точкой и словами в aria-label. */
export function DayPicker({ label, days, value, onChange, className }: Props) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = days.findIndex((d) => d.date === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : Math.max(0, days.findIndex((d) => !d.disabled));

  function onKeyDown(e: KeyboardEvent, index: number) {
    let next = arrowTarget(e.key, index, days.length);
    if (next === null) return;
    const step = next > index || (next === 0 && index === days.length - 1) ? 1 : -1;
    for (let i = 0; i < days.length && days[next]?.disabled; i++) next = (next + step + days.length) % days.length;
    if (days[next]?.disabled) return;
    e.preventDefault();
    onChange(days[next].date);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={cx(styles.root, className)}>
      {days.map((d, i) => {
        const checked = d.date === value;
        return (
          <button
            key={d.date}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={d.disabled}
            aria-label={dayLabel(d)}
            tabIndex={i === tabStop ? 0 : -1}
            className={cx(styles.day, checked && styles.checked)}
            onClick={() => onChange(d.date)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className={styles.weekday} aria-hidden="true">{d.weekday}</span>
            <span className={styles.num} aria-hidden="true">{d.day}</span>
            <span className={cx(styles.dot, d.busy && styles.busy)} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
