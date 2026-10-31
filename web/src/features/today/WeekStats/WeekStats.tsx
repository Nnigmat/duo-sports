import { useId } from 'react';
import type { TodayInsights } from '../../../data/types';
import { formatDuration, formatVolume, groupDigits } from '../../../shared/format';
import styles from './WeekStats.module.css';

type Props = {
  stats: TodayInsights['weekStats'];
};

export function WeekStats({ stats }: Props) {
  const titleId = useId();
  const items = [
    { value: formatDuration(stats.minutes), label: 'в зале' },
    { value: formatVolume(stats.volumeKg), label: 'поднятый объём' },
    { value: groupDigits(stats.sets), label: 'подходов' },
  ];
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <h2 id={titleId} className={styles.title}>
        Неделя в цифрах
      </h2>
      <dl className={styles.list}>
        {items.map((i) => (
          <div key={i.label} className={styles.item}>
            <dd className={styles.value}>{i.value}</dd>
            <dt className={styles.label}>{i.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
