import { useState } from 'react';
import type { ScheduleData } from '../../../data/types';
import { ActionList, Button, ChoiceCard, DayPicker, Icon, Sheet, type PickerDay } from '../../../ui';
import { dayLabel } from '../../../ui/labels';
import type { RescheduleTarget } from '../../../data/types';
import { rescheduleNote } from '../reschedule';
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
};

/** Панель переноса тренировки: эта неделя, следующая неделя и последствия для серии. */
export function RescheduleSheet({ open, onOpenChange, data, onConfirm, onSkip, onPause }: Props) {
  const { workout, sameWeek, nextWeek } = data;
  const [date, setDate] = useState<string | undefined>(sameWeek?.date ?? nextWeek.days[0]?.date);

  const sameWeekPicked = sameWeek !== undefined && sameWeek !== null && date === sameWeek.date;
  const target = sameWeekPicked ? sameWeek : nextWeek.days.find((d) => d.date === date);
  const note = target ? rescheduleNote(target, sameWeekPicked) : null;
  const pickerDays: PickerDay[] = nextWeek.days;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Перенести тренировку" eyebrow={`${workout.title} · ${workout.whenLabel}`}>
      <div className={styles.body}>
        {sameWeek && (
          <section className={styles.group} aria-labelledby="reschedule-this-week">
            <h3 id="reschedule-this-week" className={styles.eyebrow}>
              Эта неделя
            </h3>
            <ChoiceCard
              name="reschedule-day"
              value={sameWeek.date}
              checked={sameWeekPicked}
              onChange={setDate}
              title={`${sameWeek.relative ? `${sameWeek.relative}, ` : ''}${plainLabel(sameWeek)}`}
              description={sameWeek.busy ? `Уже стоит: ${sameWeek.busy}` : undefined}
            />
          </section>
        )}
        <section className={styles.group} aria-labelledby="reschedule-next-week">
          <h3 id="reschedule-next-week" className={styles.eyebrow}>
            Следующая неделя · {nextWeek.rangeLabel}
          </h3>
          <DayPicker
            label="Новый день тренировки"
            days={pickerDays}
            value={sameWeekPicked ? undefined : date}
            onChange={setDate}
          />
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
