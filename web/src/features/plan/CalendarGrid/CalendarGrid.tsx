import type { PlanData } from '../../../data/types';
import { CalendarCell } from '../CalendarCell/CalendarCell';
import { WEEKDAY_HEADERS, calendarDays, displayStatus, inRange, type CalendarView } from '../plan';
import styles from './CalendarGrid.module.css';

type Props = {
  data: PlanData;
  view: CalendarView;
  anchor: string;
  sel: string;
  /** Дата копии, пока открыта панель копирования */
  copyDate?: string | null;
  layout?: 'mobile' | 'desktop';
  onPick: (date: string) => void;
};

/** Сетка из семи колонок: месяц целыми неделями или одна неделя. */
export function CalendarGrid({ data, view, anchor, sel, copyDate = null, layout = 'desktop', onPick }: Props) {
  const { today, min, max, templates, entries } = data;
  const days = calendarDays(view, anchor);

  return (
    <div className={styles.scroll}>
      <div className={styles.root} data-layout={layout}>
        <div className={styles.head} aria-hidden="true">
          {WEEKDAY_HEADERS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className={styles.grid}>
          {days.map((date) => {
            const visible = inRange(date, view, anchor, min, max);
            const entry = visible ? entries[date] : undefined;
            const template = entry && templates.find((t) => t.id === entry.templateId);
            const copyTarget = visible && copyDate === date && date !== sel ? (entry ? 'replace' : 'new') : null;
            return (
              <CalendarCell
                key={date}
                date={date}
                outside={!visible}
                view={view}
                layout={layout}
                selected={visible && date === sel}
                copyTarget={copyTarget}
                isToday={date === today}
                past={date < today}
                template={template}
                status={entry ? displayStatus(date, entry, today) : undefined}
                onPick={onPick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
