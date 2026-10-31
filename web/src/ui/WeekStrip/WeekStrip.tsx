import { Icon } from '../Icon/Icon';
import { cx } from '../cx';
import { statusWord, weekDayLabel, type DayStatus } from '../labels';
import styles from './WeekStrip.module.css';

export type WeekDay = {
  /** «пн» */
  weekday: string;
  /** Число месяца: «31»; показывается под днём недели */
  date?: string;
  status: DayStatus;
  /** Сегодняшний день; planned + today рисуется залитым кругом с «▶» */
  today?: boolean;
  /** Название тренировки; показывается в wide */
  caption?: string;
};

type Props = {
  days: WeekDay[];
  /** compact — только маркеры (статус в aria-label), wide — слово статуса и название под маркером */
  variant?: 'compact' | 'wide';
  /** Выбранный день; вместе с onSelect дни становятся кнопками с aria-pressed */
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  className?: string;
};

function Marker({ day }: { day: WeekDay }) {
  if (day.status === 'rest') return <span className={styles.rest} aria-hidden="true" />;
  if (day.status === 'planned' && day.today) {
    return (
      <span className={cx(styles.marker, styles.todayMark)} aria-hidden="true">
        <Icon name="play" size={20} />
      </span>
    );
  }
  const icon = day.status === 'done' ? 'check' : day.status === 'missed' ? 'close' : day.status === 'moved' ? 'loop' : null;
  return (
    <span className={cx(styles.marker, styles[day.status])} aria-hidden="true">
      {icon && <Icon name={icon} size={20} />}
    </span>
  );
}

export function WeekStrip({ days, variant = 'compact', selectedIndex, onSelect, className }: Props) {
  const wide = variant === 'wide';
  return (
    <ul className={cx(styles.strip, wide && styles.wide, className)}>
      {days.map((d, i) => {
        const content = (
          <>
            <span className={styles.weekday} aria-hidden={wide ? undefined : true}>{d.weekday}</span>
            {d.date && ' '}
            {d.date && <span className={styles.date} aria-hidden={wide ? undefined : true}>{d.date}</span>}
            <Marker day={d} />
            {wide && (
              <>
                <span className={styles.status}>{statusWord(d.status)}</span>
                {d.caption && <span className={styles.caption}>{d.caption}</span>}
              </>
            )}
          </>
        );
        const label = wide ? undefined : weekDayLabel(d);
        return onSelect ? (
          <li key={i} className={cx(styles.day, d.today && styles.today)}>
            <button
              type="button"
              aria-pressed={i === selectedIndex}
              aria-label={label}
              className={cx(styles.cell, i === selectedIndex && styles.selected)}
              onClick={() => onSelect(i)}
            >
              {content}
            </button>
          </li>
        ) : (
          <li key={i} className={cx(styles.day, d.today && styles.today)} aria-label={label}>
            {content}
          </li>
        );
      })}
    </ul>
  );
}
