import type { PlanTemplate } from '../../../data/types';
import { ExerciseNameLink } from '../../../ui';
import styles from './ExerciseList.module.css';

type Props = {
  exercises: PlanTemplate['exercises'];
  /** Для скринридера: «Упражнения: Ноги и ягодицы» */
  label: string;
  /** Адрес карточки упражнения; без него (или если упражнения нет в библиотеке) название остаётся текстом */
  hrefFor?: (name: string) => string | undefined;
  /** Переход по ссылке без перезагрузки страницы; обычный клик с модификатором работает как у ссылки */
  onOpen?: (href: string) => void;
};

/** Состав тренировки: название упражнения и план справа. */
export function ExerciseList({ exercises, label, hrefFor, onOpen }: Props) {
  return (
    <ol className={styles.root} aria-label={label}>
      {exercises.map((e) => {
        return (
          <li key={e.name} className={styles.item}>
            <ExerciseNameLink className={styles.name} name={e.name} href={hrefFor?.(e.name)} onOpen={onOpen} />
            <span className={styles.detail}>{e.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}
