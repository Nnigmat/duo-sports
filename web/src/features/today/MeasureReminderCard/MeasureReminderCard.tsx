import { Button } from '../../../ui';
import { plural } from '../../workout/flow/ru';
import styles from './MeasureReminderCard.module.css';

type Props = {
  /** Дней с последнего замера; null — замеров ещё не было */
  daysSince: number | null;
  onMeasure: () => void;
};

/** Напоминание о замерах под чибиком: исчезает только после нового замера */
export function MeasureReminderCard({ daysSince, onMeasure }: Props) {
  const text = daysSince === null ? 'Замеров ещё не было' : `Прошло ${daysSince} ${plural(daysSince, ['день', 'дня', 'дней'])}`;
  return (
    <div className={styles.reminder}>
      <Button variant="secondary" compact onClick={onMeasure}>
        Замеры
      </Button>
      <p className={styles.when}>{text}</p>
    </div>
  );
}
