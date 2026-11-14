import type { RoutineDetail } from '../../../../../shared/types';
import { Badge, Button, ExerciseNameLink, Notice, Text, TopBar } from '../../../ui';
import { countWord, itemTime, KIND_LABEL, mmss, usedText } from '../routines';
import styles from './RoutineDetailView.module.css';

type Props = {
  routine: RoutineDetail;
  backLabel: string;
  onBack: () => void;
  /** Нет — кнопки правки нет (только чтение) */
  onEdit?: () => void;
  /** Переход к карточке упражнения без перезагрузки страницы; без него работает обычная ссылка */
  onOpenExercise?: (href: string) => void;
};

/** Карточка разминки или заминки: состав по порядку и где она используется. */
export function RoutineDetailView({ routine, backLabel, onBack, onEdit, onOpenExercise }: Props) {
  const { items, usedBy, usedIn } = routine;
  return (
    <div className={styles.root}>
      <TopBar
        start={<Button variant="ghost" compact icon="back" onClick={onBack}>{backLabel}</Button>}
        end={onEdit && <Button variant="secondary" compact icon="pencil" onClick={onEdit}>Править</Button>}
      />
      <div className={styles.body}>
        <div className={styles.head}>
          <Badge tone="neutral">{KIND_LABEL[routine.kind].one}</Badge>
          <Text variant="h3" tag="h1">{routine.title}</Text>
          {routine.note && <Text variant="body" color="slate">{routine.note}</Text>}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.num}>{items.length}</span>
            <Text variant="caption">{countWord(items.length)}</Text>
          </div>
          <div className={styles.stat}>
            <span className={styles.num}>{mmss(routine.totalSec)}</span>
            <Text variant="caption">длительность</Text>
          </div>
        </div>

        <section aria-labelledby="rt-items" className={styles.section}>
          <Text variant="h5" tag="h2" id="rt-items">Упражнения по порядку</Text>
          <ol className={styles.items}>
            {items.map((it, i) => (
              <li key={i} className={styles.item}>
                <span className={styles.n}>{i + 1}</span>
                <span className={styles.name}>
                  <ExerciseNameLink name={it.name} href={`/exercises/${encodeURIComponent(it.exercise)}`} onOpen={onOpenExercise} />
                  {it.sides && <Text variant="caption">{it.sides[0]}, затем {it.sides[1].toLowerCase()}</Text>}
                </span>
                <span className={styles.time}>{itemTime(it)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="rt-used" className={styles.section}>
          <div className={styles.usedHead}>
            <Text variant="h5" tag="h2" id="rt-used">Где используется</Text>
            <Text variant="caption">{usedText(usedIn)}</Text>
          </div>
          {usedBy.length > 0 ? (
            <ul className={styles.used}>
              {usedBy.map((u) => (
                <li key={u.workoutId}>{u.title}</li>
              ))}
            </ul>
          ) : usedIn === 0 ? (
            <Notice tone="info">
              Пока не подключена ни к одной тренировке. В YAML тренировки: <code>routine: {routine.id}</code>
            </Notice>
          ) : (
            <Text variant="body-sm" color="slate">Стоит в тренировках других спортсменов.</Text>
          )}
        </section>

        {!onEdit && <Text variant="caption">Менять разминки и заминки могут тренер и администратор.</Text>}
      </div>
    </div>
  );
}
