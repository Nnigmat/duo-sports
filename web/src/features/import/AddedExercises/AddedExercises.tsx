import { Badge, Text } from '../../../ui';
import { ADDED_LIMIT, type AddedExercise } from '../done';
import styles from './AddedExercises.module.css';

type Props = {
  items: AddedExercise[];
  /** Сколько упражнений создано всего; в заголовке и ссылке */
  created: number;
  /** Ссылка на вкладку «Упражнения» */
  href: string;
};

/** Что добавлено в библиотеку: первые строки и ссылка на все. */
export function AddedExercises({ items, created, href }: Props) {
  if (items.length === 0) return null;
  return (
    <section className={styles.root} aria-labelledby="added-title">
      <div className={styles.head}>
        <Text variant="h3" tag="h2" id="added-title">
          Новые упражнения · {created}
        </Text>
        <Text variant="body-sm" color="slate">
          Созданы во вкладке «Упражнения» с видео и подсказками по технике из текста. Теперь их можно выбирать и в других тренировках.
        </Text>
      </div>
      <ul className={styles.list}>
        {items.slice(0, ADDED_LIMIT).map((a) => (
          <li key={a.title} className={styles.row}>
            <div className={styles.info}>
              <a href={href} className={styles.title}>
                {a.title}
              </a>
              <span className={styles.meta}>{a.meta}</span>
            </div>
            <Badge tone={a.chip === 'Создано' ? 'accent' : 'neutral'}>{a.chip}</Badge>
          </li>
        ))}
      </ul>
      <a href={href} className={styles.all}>
        Все {created} во вкладке «Упражнения»
      </a>
    </section>
  );
}
