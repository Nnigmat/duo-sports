import { useState } from 'react';
import { applyDraft, createExercise, type GroupFilter, type HistorySort } from '../library';
import type { ExerciseDraft, LibraryExercise } from '../types';
import { ExerciseDetailView } from '../ExerciseDetailView/ExerciseDetailView';
import { ExerciseFormScreen } from '../ExerciseForm/ExerciseFormScreen';
import { ExerciseHistoryView } from '../ExerciseHistoryView/ExerciseHistoryView';
import { ExerciseListView } from '../ExerciseListView/ExerciseListView';

export type ExercisesScreen = 'list' | 'detail' | 'edit' | 'create' | 'history';

type Props = {
  initial: LibraryExercise[];
  initialScreen?: ExercisesScreen;
  initialSelected?: string;
  /** Без этих обработчиков данные меняются только в памяти (истории Storybook) */
  onCreate?: (draft: ExerciseDraft) => Promise<LibraryExercise>;
  onUpdate?: (exercise: LibraryExercise, draft: ExerciseDraft) => Promise<LibraryExercise>;
  onDelete?: (id: string) => Promise<void>;
  /** false — только чтение: нет «Создать», «Редактировать», «Удалить» */
  canManage?: boolean;
};

/** Мобильный сценарий вкладки: список → карточка → редактирование / история, создание. Данные в памяти, если не переданы обработчики записи. */
export function ExercisesFlow({
  initial,
  initialScreen = 'list',
  initialSelected = initial[0]?.id,
  onCreate,
  onUpdate,
  onDelete,
  canManage = true,
}: Props) {
  const [items, setItems] = useState(initial);
  const [screen, setScreen] = useState<ExercisesScreen>(initialScreen);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelected);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [sort, setSort] = useState<HistorySort>('new');

  const selected = items.find((e) => e.id === selectedId) ?? items[0];

  async function create(draft: ExerciseDraft) {
    const ex = onCreate ? await onCreate(draft) : createExercise(draft, `custom-${items.length + 1}`);
    setItems((list) => [...list, ex]);
    setSelectedId(ex.id);
    setScreen('detail');
  }
  async function save(draft: ExerciseDraft) {
    const target = selected;
    const next = onUpdate ? await onUpdate(target, draft) : applyDraft(target, draft);
    setItems((list) => list.map((e) => (e.id === target.id ? next : e)));
    setScreen('detail');
  }
  async function remove() {
    const id = selected.id;
    await onDelete?.(id);
    setItems((list) => list.filter((e) => e.id !== id));
    setSelectedId(undefined);
    setScreen('list');
  }

  switch (screen) {
    case 'create':
      return <ExerciseFormScreen mode="create" onCancel={() => setScreen('list')} onSubmit={create} />;
    case 'edit':
      return <ExerciseFormScreen mode="edit" exercise={selected} onCancel={() => setScreen('detail')} onSubmit={save} onDelete={remove} />;
    case 'history':
      return (
        <ExerciseHistoryView exercise={selected} sort={sort} onSortChange={setSort} onBack={() => setScreen('detail')} />
      );
    case 'detail':
      return (
        <ExerciseDetailView
          exercise={selected}
          onBack={() => setScreen('list')}
          onEdit={canManage ? () => setScreen('edit') : undefined}
          onOpenHistory={() => {
            setSort('new');
            setScreen('history');
          }}
          onAddVideo={() => {}}
        />
      );
    default:
      return (
        <ExerciseListView
          exercises={items}
          query={query}
          onQueryChange={setQuery}
          group={group}
          onGroupChange={setGroup}
          onOpen={(id) => {
            setSelectedId(id);
            setScreen('detail');
          }}
          onCreate={canManage ? () => setScreen('create') : undefined}
        />
      );
  }
}
