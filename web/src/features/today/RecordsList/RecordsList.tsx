import { useId } from 'react';
import type { TodayInsights } from '../../../data/types';
import { SectionHeader } from '../../../shared';
import { Button } from '../../../ui';
import styles from './RecordsList.module.css';

type Props = {
  records: TodayInsights['records'];
  onOpenProgress: () => void;
};

export function RecordsList({ records, onOpenProgress }: Props) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <SectionHeader
        id={titleId}
        title="Рекорды"
        action={
          <Button variant="ghost" compact onClick={onOpenProgress}>
            Весь прогресс
          </Button>
        }
      />
      <ul className={styles.list}>
        {records.map((r) => (
          <li key={r.exercise} className={styles.item}>
            <span className={styles.exercise}>{r.exercise}</span>
            <span className={styles.line}>
              <span className={styles.value}>{r.value}</span>
              <span className={styles.date}>{r.dateLabel}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
