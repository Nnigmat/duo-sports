import { useId } from 'react';
import type { TodayInsights } from '../../../data/types';
import { plural } from '../../workout/flow/ru';
import { ActivityHeatmap } from '../../../ui';
import styles from './ActivityCard.module.css';

type Props = {
  activity: TodayInsights['activity'];
};

const LEGEND = ['var(--hairline-soft)', 'var(--accent-300)', 'var(--accent-500)', 'var(--primary)'];

export function ActivityCard({ activity }: Props) {
  const titleId = useId();
  const weeks = activity.levels.length / 7;
  const summary = `Последние ${weeks} недель · ${activity.workouts} ${plural(activity.workouts, ['тренировка', 'тренировки', 'тренировок'])}`;
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <div>
        <h2 id={titleId} className={styles.title}>
          Активность
        </h2>
        <p className={styles.summary}>{summary}</p>
      </div>
      <ActivityHeatmap levels={activity.levels} label={`Тепловая карта тренировок: ${summary}`} fluid />
      <div className={styles.legend} aria-hidden="true">
        <span>Меньше</span>
        {LEGEND.map((c) => (
          <span key={c} className={styles.swatch} style={{ background: c }} />
        ))}
        <span>Больше</span>
      </div>
    </section>
  );
}
