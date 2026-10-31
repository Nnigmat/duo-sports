import type { TodayWorkout } from '../../../data/types';
import { exerciseCount, formatApproxMinutes } from '../../../shared/format';
import { Badge, Button } from '../../../ui';
import styles from './TodayHero.module.css';

type Props = {
  titleId: string;
  workout: TodayWorkout;
  onStart: () => void;
  onReschedule: () => void;
  onOpenExercises: () => void;
};

export function WorkoutCard({ titleId, workout, onStart, onReschedule, onOpenExercises }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>
        Сегодня{workout.movedFrom && ` · перенесена с ${workout.movedFrom}`}
      </p>
      <h2 id={titleId} className={styles.title}>
        {workout.title}
      </h2>
      <p className={styles.meta}>
        {[exerciseCount(workout.exerciseCount), formatApproxMinutes(workout.minutes), workout.modeLabel].join(' · ')}
      </p>
      <ul className={styles.muscles}>
        {workout.muscles.map((m) => (
          <li key={m}>
            <Badge tone="neutral">{m}</Badge>
          </li>
        ))}
      </ul>
      <ol className={styles.exercises} aria-label="Упражнения">
        {workout.exercises.map((e) => (
          <li key={e.name}>
            <span>{e.name}</span>
            <span className={styles.plan}>{e.plan}</span>
          </li>
        ))}
      </ol>
      <div className={styles.actions}>
        <Button icon="play" fullWidth onClick={onStart}>
          Старт
        </Button>
        <Button variant="secondary" className={styles.phoneOnly} onClick={onOpenExercises}>
          Упражнения
        </Button>
        <Button variant="secondary" onClick={onReschedule}>
          Перенести
        </Button>
      </div>
    </div>
  );
}
