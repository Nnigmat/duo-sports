import { useId } from 'react';
import { SectionHeader } from '../../../shared';
import { Button } from '../../../ui';
import { plural } from '../../workout/flow/ru';
import styles from './MeasureReminderCard.module.css';

type Props = {
  /** Дней с последнего замера; null — замеров ещё не было */
  daysSince: number | null;
  onMeasure: () => void;
};

/** Напоминание о замерах: исчезает только после нового замера */
export function MeasureReminderCard({ daysSince, onMeasure }: Props) {
  const titleId = useId();
  const text = daysSince === null ? 'Замеров ещё не было' : `Прошло ${daysSince} ${plural(daysSince, ['день', 'дня', 'дней'])}`;
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <div className={styles.text}>
        <SectionHeader id={titleId} title="Замеры" />
        <p className={styles.when}>{text}</p>
      </div>
      <Button variant="primary" compact onClick={onMeasure}>
        Записать
      </Button>
    </section>
  );
}
