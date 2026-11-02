import type { PlanTemplate } from '../../../data/types';
import { Icon, ToneDot } from '../../../ui';
import { cx } from '../../../ui/cx';
import { cellAriaLabel, cellStatusWord, type CalendarView, type DisplayStatus } from '../plan';
import styles from './CalendarCell.module.css';

type Props = {
  /** «2026-10-31» */
  date: string;
  /** Клетка вне показанного месяца или границ календаря: пустая, не нажимается */
  outside?: boolean;
  view: CalendarView;
  layout?: 'mobile' | 'desktop';
  selected?: boolean;
  /** Выбрана как дата копии: пустой день или день, который копия заменит */
  copyTarget?: 'new' | 'replace' | null;
  isToday?: boolean;
  past?: boolean;
  template?: PlanTemplate;
  status?: DisplayStatus;
  /** Для перенесённой тренировки: «6 ноября» — клетка пишет «→ на 6 ноября» */
  movedTo?: string;
  /** Тренировка пришла с другого дня: «ср» — клетка пишет «со ср» */
  movedFrom?: string;
  onPick?: (date: string) => void;
};

/** День календаря. Состояние всегда словом или формой рамки, цвет только метит тип тренировки. */
export function CalendarCell({
  date,
  outside,
  view,
  layout = 'desktop',
  selected,
  copyTarget = null,
  isToday,
  past,
  template,
  status,
  movedTo,
  movedFrom,
  onPick,
}: Props) {
  const num = Number(date.slice(8, 10));
  const muted = status === 'moved' || status === 'skipped';
  const numClass = cx(styles.num, isToday && styles.today, past && !isToday && styles.past);

  if (outside) {
    return <div aria-hidden="true" className={cx(styles.cell, styles.outside)} data-view={view} data-layout={layout} />;
  }

  const desktop = layout === 'desktop';
  const baseStatus = status ? cellStatusWord(status) : '';
  const statusText =
    copyTarget === 'replace'
      ? 'заменить копией'
      : copyTarget === 'new'
        ? 'копия сюда'
        : status === 'moved' && movedTo
          ? `→ на ${movedTo}`
          : movedFrom && status !== 'moved'
            ? [baseStatus, `со ${movedFrom}`].filter(Boolean).join(' · ')
            : baseStatus;

  return (
    <button
      type="button"
      aria-pressed={!!selected}
      className={cx(
        styles.cell,
        template && styles.filled,
        selected && styles.selected,
        copyTarget && styles.target,
        status === 'moved' && !selected && !copyTarget && styles.moved,
      )}
      data-view={view}
      data-layout={layout}
      onClick={() => onPick?.(date)}
    >
      <span className={styles.sr}>{cellAriaLabel(date, template?.title ?? null, status ?? null, copyTarget !== null, isToday, movedTo, movedFrom)}</span>
      <span className={numClass} aria-hidden="true">{num}</span>
      {template &&
        (desktop ? (
          <span className={styles.titleRow} aria-hidden="true">
            <ToneDot tone={template.tone} className={styles.dot} />
            <span className={cx(styles.title, muted && styles.mutedTitle, status === 'moved' && styles.struck)}>{template.title}</span>
          </span>
        ) : (
          <span className={styles.marks} aria-hidden="true">
            <ToneDot tone={template.tone} />
            {status === 'done' && <Icon name="check" size={20} className={styles.check} />}
          </span>
        ))}
      {desktop && template && view === 'week' && <span className={styles.meta} aria-hidden="true">≈ {template.minutes} мин</span>}
      {desktop && statusText && (
        <span aria-hidden="true" className={cx(styles.status, (copyTarget || status === 'done') && styles.accent)}>{statusText}</span>
      )}
    </button>
  );
}
