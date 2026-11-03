import type { PlanTemplate } from '../../../data/types';
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
        const href = hrefFor?.(e.name);
        return (
          <li key={e.name} className={styles.item}>
            {href ? (
              <a
                className={styles.link}
                href={href}
                onClick={(ev) => {
                  if (!onOpen || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
                  ev.preventDefault();
                  onOpen(href);
                }}
              >
                {e.name}
              </a>
            ) : (
              <span className={styles.name}>{e.name}</span>
            )}
            <span className={styles.detail}>{e.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}
