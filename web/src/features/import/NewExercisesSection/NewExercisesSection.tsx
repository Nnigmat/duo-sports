import { useId, useState } from 'react';
import { Button, Chip, Icon, Text } from '../../../ui';
import {
  actionOf, createAll, EXERCISES_LIMIT, filterCounts, needsGroup, replacementOf, setAction, setGroup, tally, tallyText, usedText, pickAllSimilar, pickExisting, visibleExercises,
  type ExerciseFilter,
} from '../preview';
import type { ExerciseChoices, NewExercise } from '../types';
import styles from './NewExercisesSection.module.css';

type Props = {
  exercises: NewExercise[];
  choices: ExerciseChoices;
  onChoicesChange: (choices: ExerciseChoices) => void;
  /** Группы мышц для упражнений без группы */
  groups?: string[];
};

const FILTERS: Array<{ id: ExerciseFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'similar', label: 'Есть похожее' },
  { id: 'nogroup', label: 'Без группы мышц' },
];

const DEFAULT_GROUPS = ['Пресс', 'Кор', 'Спина', 'Предплечья', 'Ноги'];

/** Новые упражнения из файла: все создаём. Если в названии может быть опечатка, предлагаем выбрать существующее упражнение. */
export function NewExercisesSection({ exercises, choices, onChoicesChange, groups = DEFAULT_GROUPS }: Props) {
  const uid = useId();
  const [filter, setFilter] = useState<ExerciseFilter>('all');
  const [expanded, setExpanded] = useState(false);
  const counts = filterCounts(exercises);
  const rows = visibleExercises(exercises, filter, expanded);
  const hasMore = filter === 'all' && exercises.length > EXERCISES_LIMIT;

  return (
    <section id="new-ex" className={styles.root} aria-labelledby={`${uid}-title`}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <Text variant="h3" tag="h2" id={`${uid}-title`}>
            Новые упражнения
          </Text>
          <Text variant="body-sm" color="slate">
            Этих упражнений нет во вкладке «Упражнения», при импорте мы их создадим. Если в названии опечатка, выберите существующее упражнение.
          </Text>
        </div>
        <div className={styles.bulk}>
          <Button variant="secondary" compact onClick={() => onChoicesChange(createAll(choices))}>
            Создать все
          </Button>
          <Button variant="secondary" compact disabled={counts.similar === 0} onClick={() => onChoicesChange(pickAllSimilar(choices, exercises))}>
            Похожие — из библиотеки
          </Button>
        </div>
      </div>

      <div className={styles.chips} role="group" aria-label="Фильтр упражнений">
        {FILTERS.map((f) => (
          <Chip key={f.id} pressed={filter === f.id} count={counts[f.id]} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>
      <Text variant="caption" color="steel" role="status">
        {tallyText(tally(exercises, choices))}
      </Text>

      <ul className={styles.list}>
        {rows.map((ex) => {
          const action = actionOf(choices, ex.key);
          const candidates = ex.candidates ?? (ex.similar ? [ex.similar] : []);
          return (
            <li key={ex.key} className={styles.row} data-action={action}>
              <div className={styles.info}>
                <span className={styles.name}>{ex.name}</span>
                <span className={styles.meta}>
                  {usedText(ex.usedIn)}
                  {ex.hasVideo && ' · видео'}
                  {' · '}
                  {ex.muscles || 'группа мышц не указана'}
                </span>
              </div>
              {candidates.length > 0 && (
                <div className={styles.warning}>
                  <Icon name="warning" size={20} className={styles.warningIcon} />
                  <div className={styles.warningBody}>
                    <span>Упражнения «{ex.name}» нет в библиотеке. Возможно, опечатка: создайте его или выберите существующее.</span>
                    <div className={styles.options} role="group" aria-label={`Что сделать с «${ex.name}»`}>
                      <Chip pressed={action === 'create'} onClick={() => onChoicesChange(setAction(choices, ex.key, 'create'))}>
                        Создать
                      </Chip>
                      {candidates.map((name) => (
                        <Chip
                          key={name}
                          pressed={action === 'use' && replacementOf(ex, choices) === name}
                          onClick={() => onChoicesChange(pickExisting(choices, ex.key, name))}
                        >
                          {name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {needsGroup(ex, choices) && (
                <div className={styles.group}>
                  <select
                    aria-label={`Группа мышц: ${ex.name}`}
                    className={styles.select}
                    value={choices.group[ex.key] ?? ''}
                    onChange={(e) => onChoicesChange(setGroup(choices, ex.key, e.target.value))}
                  >
                    <option value="">Группа мышц не выбрана</option>
                    {groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <Button variant="ghost" compact onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? 'Свернуть' : `Показать все ${exercises.length}`}
        </Button>
      )}
    </section>
  );
}
