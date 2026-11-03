import { useMemo, useState } from 'react';
import type { ScheduleData } from '../../../data/types';
import { ActionList, Button, DayPicker, Icon, IconButton, Sheet, type PickerDay } from '../../../ui';
import { dayLabel } from '../../../ui/labels';
import type { RescheduleTarget } from '../../../data/types';
import { addDays, rangeTitle, toIso, weekStart } from '../../plan/plan';
import { rescheduleNote, weekTargets } from '../reschedule';
import styles from './RescheduleSheet.module.css';

/** «вс, 1 ноября» без пометки про занятый день */
const plainLabel = ({ date, weekday, day }: RescheduleTarget) => dayLabel({ date, weekday, day });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ScheduleData;
  onConfirm: (date: string) => void;
  onSkip: () => void;
  onPause: () => void;
  /** Сегодняшний день «2026-11-03»; раньше него переносить нельзя */
  today?: string;
};

/** Панель переноса тренировки: неделя с переключателем вперёд и назад, любой день от сегодняшнего и последствия для серии. */
export function RescheduleSheet({ open, onOpenChange, data, onConfirm, onSkip, onPause, today = toIso(new Date()) }: Props) {
  const { workout, sameWeek, nextWeek } = data;
  const busy = useMemo(() => {
    if (data.busy) return data.busy;
    const map: Record<string, string> = {};
    for (const d of [...(sameWeek ? [sameWeek] : []), ...nextWeek.days]) if (d.busy) map[d.date] = d.busy;
    return map;
  }, [data.busy, sameWeek, nextWeek.days]);
  const [date, setDate] = useState<string>(sameWeek?.date ?? nextWeek.days[0]?.date ?? today);
  const [start, setStart] = useState(() => weekStart(date));

  const days = weekTargets(start, busy, today);
  const target = days.find((d) => d.date === date);
  // Серия сохраняется, пока тренировка остаётся в своей неделе (пропущенную считаем от сегодняшней)
  const originWeek = weekStart(data.from && data.from >= today ? data.from : today);
  const note = target ? rescheduleNote(target, start === originWeek) : null;
  const pickerDays: PickerDay[] = days;
  const canPrev = addDays(start, -1) >= today;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Перенести тренировку" eyebrow={`${workout.title} · ${workout.whenLabel}`}>
      <div className={styles.body}>
        <section className={styles.group} aria-labelledby="reschedule-week">
          <div className={styles.weekNav}>
            <IconButton icon="back" aria-label="Предыдущая неделя" disabled={!canPrev} onClick={() => setStart(addDays(start, -7))} />
            <h3 id="reschedule-week" aria-live="polite" className={styles.weekTitle}>
              {rangeTitle('week', start)}
            </h3>
            <IconButton icon="forward" aria-label="Следующая неделя" onClick={() => setStart(addDays(start, 7))} />
          </div>
          <DayPicker label="Новый день тренировки" days={pickerDays} value={date} onChange={setDate} />
          <p className={styles.legend}>
            <span className={styles.dot} aria-hidden="true" />в этот день уже есть тренировка
          </p>
        </section>
        {note && (
          <p role="status" className={styles.note}>
            <Icon name={note.tone === 'warn' ? 'warning' : 'info'} size={20} />
            {note.text}
          </p>
        )}
        <Button fullWidth disabled={!target} onClick={() => target && onConfirm(target.date)}>
          {target ? `Перенести на ${plainLabel(target)}` : 'Выберите день'}
        </Button>
        <ActionList
          items={[
            { id: 'skip', icon: 'skip', title: 'Пропустить тренировку', onSelect: onSkip },
            {
              id: 'pause',
              icon: 'pause',
              title: 'Поставить план на паузу',
              description: 'Серия недель не прервётся',
              onSelect: onPause,
            },
          ]}
        />
      </div>
    </Sheet>
  );
}
