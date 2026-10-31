import type { PlanTemplate } from '../../../data/types';
import styles from './ExerciseList.module.css';

type Props = {
  exercises: PlanTemplate['exercises'];
  /** Для скринридера: «Упражнения: Ноги и ягодицы» */
  label: string;
};

/** Состав тренировки: название упражнения и план справа. */
export function ExerciseList({ exercises, label }: Props) {
  return (
    <ol className={styles.root} aria-label={label}>
      {exercises.map((e) => (
        <li key={e.name} className={styles.item}>
          <span className={styles.name}>{e.name}</span>
          <span className={styles.detail}>{e.detail}</span>
        </li>
      ))}
    </ol>
  );
}
