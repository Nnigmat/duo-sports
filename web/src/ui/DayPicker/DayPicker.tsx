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
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  function onKeyDown(e: KeyboardEvent, index: number) {
    const next = arrowTarget(e.key, index, days.length);
    if (next === null) return;
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
