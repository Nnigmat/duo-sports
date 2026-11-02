import { useId, useState } from 'react';
import { Badge, Button, Chip, Text } from '../../../ui';
import {
  actionOf, createAll, EXERCISES_LIMIT, filterCounts, needsGroup, setAction, setGroup, skipNote, tally, tallyText, usedText, useAllSimilar, visibleExercises,
  type ExerciseFilter,
} from '../preview';
import type { ExerciseAction, ExerciseChoices, NewExercise } from '../types';
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

/** Новые упражнения из файла: для каждого — создать, взять похожее или не создавать. Ничего не создаём без согласия. */
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
            Этих упражнений нет во вкладке «Упражнения». Без вашего согласия ничего не создадим: выберите для каждого, что сделать.
          </Text>
        </div>
        <div className={styles.bulk}>
          <Button variant="secondary" compact onClick={() => onChoicesChange(createAll(choices))}>
            Создать все
          </Button>
          <Button variant="secondary" compact disabled={counts.similar === 0} onClick={() => onChoicesChange(useAllSimilar(choices, exercises))}>
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
          const options: Array<{ id: ExerciseAction; label: string }> = [{ id: 'create', label: 'Создать' }];
          if (ex.similar) options.push({ id: 'use', label: `Использовать «${ex.similar}»` });
          options.push({ id: 'skip', label: 'Не создавать' });
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
                {action === 'skip' && <Badge tone="neutral">{skipNote(ex.usedIn)}</Badge>}
              </div>
              {needsGroup(ex, choices) && (
                <div className={styles.group}>
                  <label htmlFor={`${uid}-g-${ex.key}`} className={styles.groupLabel}>
                    Группа мышц
                  </label>
                  <select
                    id={`${uid}-g-${ex.key}`}
                    className={styles.select}
                    value={choices.group[ex.key] ?? ''}
                    onChange={(e) => onChoicesChange(setGroup(choices, ex.key, e.target.value))}
                  >
                    <option value="">Выбрать…</option>
                    {groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.options} role="group" aria-label={`Что сделать с «${ex.name}»`}>
                {options.map((o) => (
                  <Chip key={o.id} pressed={action === o.id} onClick={() => onChoicesChange(setAction(choices, ex.key, o.id))}>
                    {o.label}
                  </Chip>
                ))}
              </div>
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
