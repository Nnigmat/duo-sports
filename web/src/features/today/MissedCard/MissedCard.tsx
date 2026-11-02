import { useId } from 'react';
import type { TodayMissed } from '../../../../../shared/types';
import { SectionHeader } from '../../../shared';
import { Button } from '../../../ui';
import styles from './MissedCard.module.css';

type Props = {
  items: TodayMissed[];
  /** iso — день, на который стояла пропущенная тренировка */
  onMove: (iso: string) => void;
};

/** Пропущенные тренировки прошлых недель: каждую можно перенести вперёд. */
export function MissedCard({ items, onMove }: Props) {
  const titleId = useId();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <SectionHeader id={titleId} title="Пропущено" action={<span className={styles.count}>{items.length}</span>} />
      <ul className={styles.list}>
        {items.map((m) => (
          <li key={`${m.iso}:${m.title}`} className={styles.item}>
            <div className={styles.text}>
              <span className={styles.when}>{m.label}</span>
              <span className={styles.title}>{m.title}</span>
            </div>
            <Button variant="secondary" compact onClick={() => onMove(m.iso)} aria-label={`Перенести: ${m.title}, ${m.label}`}>
              Перенести
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
