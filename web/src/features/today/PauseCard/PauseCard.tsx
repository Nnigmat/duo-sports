import { useId } from 'react';
import type { TodayPause } from '../../../../../shared/types';
import { Button } from '../../../ui';
import styles from './PauseCard.module.css';

type Props = {
  pause: TodayPause;
  onResume: () => void;
};

/** План на паузе: до какого числа и кнопка «Возобновить». */
export function PauseCard({ pause, onResume }: Props) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <div className={styles.text}>
        <h2 id={titleId} className={styles.title}>
          План на паузе
        </h2>
        <p className={styles.meta}>{pause.label[0]!.toUpperCase() + pause.label.slice(1)}. Серия недель не прервётся.</p>
      </div>
      <Button variant="secondary" compact onClick={onResume}>
        Возобновить
      </Button>
    </section>
  );
}
