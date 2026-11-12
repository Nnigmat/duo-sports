import type { RoutineKind, RoutineSummary } from '../../../../../shared/types';
import { Button, EmptyState, IconButton, ListRow, Notice, SearchField, SegmentedControl, Text } from '../../../ui';
import { Skeleton } from '../../../shared';
import { KIND_LABEL, metaText, searchRoutines, usedText } from '../routines';
import styles from './RoutineListView.module.css';

type Props = {
  /** Все разминки и заминки: счётчики на переключателе считаются отсюда */
  routines: RoutineSummary[] | null;
  /** Текст ошибки загрузки */
  error?: string | null;
  onRetry?: () => void;
  kind: RoutineKind;
  onKindChange: (kind: RoutineKind) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onOpen: (id: string) => void;
  /** Нет — кнопок создания нет (только чтение) */
  onCreate?: () => void;
};

/** Вкладка «Разминки»: переключатель вида, поиск и список. */
export function RoutineListView({ routines, error, onRetry, kind, onKindChange, query, onQueryChange, onOpen, onCreate }: Props) {
  const count = (k: RoutineKind) => routines?.filter((r) => r.kind === k).length ?? 0;
  const ofKind = routines?.filter((r) => r.kind === kind) ?? [];
  const shown = searchRoutines(ofKind, query);
  const label = KIND_LABEL[kind];

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Text variant="h2" tag="h1">Разминки</Text>
        {onCreate && <IconButton icon="plus" aria-label={label.newLabel} onClick={onCreate} />}
      </header>

      <SegmentedControl
        label="Вид"
        value={kind}
        onChange={onKindChange}
        options={[
          { value: 'warmup', label: routines ? `Разминки (${count('warmup')})` : 'Разминки' },
          { value: 'cooldown', label: routines ? `Заминки (${count('cooldown')})` : 'Заминки' },
        ]}
      />
      <SearchField label="Поиск по названию" placeholder="Название" value={query} onValueChange={onQueryChange} />

      {error ? (
        <Notice tone="error" action={onRetry && <Button variant="secondary" compact onClick={onRetry}>Повторить</Button>}>
          Не удалось загрузить: {error}
        </Notice>
      ) : !routines ? (
        <div role="status" className={styles.skeletons}>
          <span className={styles.sr}>Загружаем разминки</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={88} />
          ))}
        </div>
      ) : ofKind.length === 0 ? (
        <EmptyState
          title={kind === 'warmup' ? 'Разминок пока нет' : 'Заминок пока нет'}
          description={onCreate ? 'Соберите первую из упражнений на время.' : 'Их добавят тренер или администратор.'}
          action={onCreate && <Button onClick={onCreate}>{label.newLabel}</Button>}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title="Ничего не нашлось"
          description="Попробуйте другое название."
          action={<Button variant="secondary" onClick={() => onQueryChange('')}>Сбросить поиск</Button>}
        />
      ) : (
        <ul className={styles.list}>
          {shown.map((r) => (
            <li key={r.id}>
              <ListRow
                icon={kind === 'warmup' ? 'flame' : 'timer'}
                title={r.title}
                subtitle={metaText(r)}
                meta={<span>{usedText(r.usedIn)}</span>}
                onClick={() => onOpen(r.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
