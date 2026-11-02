import { Badge, Button, Chip, ChipGroup, EmptyState, IconButton, ListRow, SearchField, Text } from '../../../ui';
import { exerciseIcon, groupExercises, groupTabs, planShort, recordText, searchExercises, totalText, type GroupFilter } from '../library';
import type { LibraryExercise } from '../types';
import styles from './ExerciseListView.module.css';

type Props = {
  exercises: LibraryExercise[];
  query: string;
  onQueryChange: (query: string) => void;
  group: GroupFilter;
  onGroupChange: (group: GroupFilter) => void;
  onOpen: (id: string) => void;
  /** Нет — кнопок создания нет (только чтение) */
  onCreate?: () => void;
  /** desktop: заголовок с кнопкой «Новое упражнение» и колонка рекорда справа */
  layout?: 'mobile' | 'desktop';
};

/** Список упражнений: поиск, фильтр по группе мышц и разделы. */
export function ExerciseListView({ exercises, query, onQueryChange, group, onGroupChange, onOpen, onCreate, layout = 'mobile' }: Props) {
  const searched = searchExercises(exercises, query);
  const tabs = groupTabs(searched);
  const sections = groupExercises(searched, group);
  const desktop = layout === 'desktop';
  const inPlan = exercises.filter((e) => e.plan).length;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.titles}>
          {desktop && <Text variant="eyebrow">Библиотека</Text>}
          <Text variant="h2" tag="h1">Упражнения</Text>
          <Text variant="body-sm" color="steel">{totalText(exercises.length, inPlan)}</Text>
        </div>
        {onCreate &&
          (desktop ? (
            <Button icon="plus" onClick={onCreate}>Новое упражнение</Button>
          ) : (
            <IconButton icon="plus" aria-label="Своё упражнение" onClick={onCreate} />
          ))}
      </header>

      <SearchField label="Поиск по названию или мышце" placeholder="Поиск: присед, ягодицы…" value={query} onValueChange={onQueryChange} />

      <ChipGroup label="Группы мышц" scroll>
        {tabs.map((t) => (
          <Chip key={t.id} pressed={group === t.id} count={t.count} onClick={() => onGroupChange(t.id)}>
            {t.name}
          </Chip>
        ))}
      </ChipGroup>

      {sections.map((s) => (
        <section key={s.id} aria-labelledby={`group-${s.id}`} className={styles.section}>
          <div className={styles.sectionHead}>
            <Text variant="h5" tag="h2" id={`group-${s.id}`}>{s.name}</Text>
            <Text variant="caption">{s.items.length}</Text>
          </div>
          <ul className={styles.list}>
            {s.items.map((ex) => (
              <li key={ex.id}>
                <ListRow
                  icon={exerciseIcon(ex.kind, ex.equipment)}
                  title={ex.name}
                  subtitle={`${ex.muscles.join(', ')} · ${ex.equipment}`}
                  aside={
                    desktop ? (
                      <>
                        <Text variant="eyebrow">Рекорд</Text>
                        <span>{ex.record ? recordText(ex) : '—'}</span>
                      </>
                    ) : undefined
                  }
                  meta={
                    <>
                      {ex.record ? (
                        !desktop && <span>Рекорд · {recordText(ex)}</span>
                      ) : (
                        <>
                          <Badge tone="highlight">Новое</Badge>
                          <span>Ещё не выполнялось</span>
                        </>
                      )}
                      {ex.plan && <Badge tone="neutral">{planShort(ex.plan)}</Badge>}
                    </>
                  }
                  onClick={() => onOpen(ex.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {sections.length === 0 && (
        <EmptyState
          title="Ничего не нашлось"
          description="Попробуйте другое название или сбросьте фильтр."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                onQueryChange('');
                onGroupChange('all');
              }}
            >
              Сбросить фильтры
            </Button>
          }
        />
      )}
    </div>
  );
}
