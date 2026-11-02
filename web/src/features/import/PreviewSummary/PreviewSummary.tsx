import type { PreviewData } from '../types';
import { plural } from '../../workout/flow/ru';
import { StatTile } from '../../../ui';
import styles from './PreviewSummary.module.css';

type Props = Pick<PreviewData, 'days' | 'period' | 'found'> & {
  workouts: number;
  weeks: number;
  /** Новые упражнения, по которым ещё нужно решение */
  newCount: number;
};

/** Три плитки итога: сколько тренировок, что нашлось в библиотеке, что новое. */
export function PreviewSummary({ workouts, weeks, days, period, found, newCount }: Props) {
  return (
    <ul className={styles.root} aria-label="Что найдено в тексте">
      <li className={styles.item}>
        <StatTile value={String(workouts)} label={`${plural(workouts, ['тренировка', 'тренировки', 'тренировок'])} · ${weeks} ${plural(weeks, ['неделя', 'недели', 'недель'])}`} />
        <p className={styles.note}>
          {days}
          <br />
          {period}
        </p>
      </li>
      <li className={styles.item}>
        <StatTile value={String(found)} label={`${plural(found, ['упражнение нашлось', 'упражнения нашлись', 'упражнений нашлось'])} в библиотеке`} />
      </li>
      <li className={styles.item}>
        <a href="#new-ex" className={styles.link}>
          <StatTile value={String(newCount)} label={`${plural(newCount, ['новое упражнение', 'новых упражнения', 'новых упражнений'])} — решите ниже`} />
        </a>
      </li>
    </ul>
  );
}
