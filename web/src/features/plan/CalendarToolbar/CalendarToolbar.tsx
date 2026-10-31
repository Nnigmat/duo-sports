import { Button, IconButton, SegmentedControl } from '../../../ui';
import type { CalendarView } from '../plan';
import styles from './CalendarToolbar.module.css';

type Props = {
  titleId: string;
  /** «Октябрь 2026» */
  title: string;
  view: CalendarView;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
};

const VIEWS = [
  { value: 'month' as const, label: 'Месяц' },
  { value: 'week' as const, label: 'Неделя' },
];

/** Шаги по периодам, заголовок периода, «Сегодня» и переключатель месяц/неделя. */
export function CalendarToolbar({ titleId, title, view, canPrev, canNext, onPrev, onNext, onToday, onViewChange }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.nav}>
        <IconButton icon="back" aria-label="Назад" disabled={!canPrev} onClick={onPrev} />
        <IconButton icon="forward" aria-label="Вперёд" disabled={!canNext} onClick={onNext} />
        <h2 id={titleId} aria-live="polite" className={styles.title}>
          {title}
        </h2>
      </div>
      <div className={styles.tools}>
        <Button variant="secondary" compact onClick={onToday}>
          Сегодня
        </Button>
        <SegmentedControl label="Вид" options={VIEWS} value={view} onChange={onViewChange} />
      </div>
    </div>
  );
}
