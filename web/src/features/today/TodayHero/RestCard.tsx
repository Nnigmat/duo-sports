import type { TodayState } from '../../../data/types';
import { formatApproxMinutes } from '../../../shared/format';
import { Button } from '../../../ui';
import styles from './TodayHero.module.css';

type Props = {
  titleId: string;
  next: Extract<TodayState, { kind: 'rest' }>['next'];
  onStretch: () => void;
  onTrainAnyway: () => void;
};

export function RestCard({ titleId, next, onStretch, onTrainAnyway }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>Сегодня</p>
      <h2 id={titleId} className={styles.title}>
        День отдыха
      </h2>
      {next && (
        <p className={styles.meta}>
          Следующая тренировка — {next.whenLabel}, «{next.title}», {formatApproxMinutes(next.minutes)}.
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onStretch}>
          Растяжка · 10 мин
        </Button>
        <Button onClick={onTrainAnyway}>Тренироваться сегодня</Button>
      </div>
    </div>
  );
}
