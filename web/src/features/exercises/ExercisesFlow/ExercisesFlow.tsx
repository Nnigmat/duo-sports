import { useState } from 'react';
import { applyDraft, createExercise, type GroupFilter, type HistorySort } from '../library';
import { exerciseLibrary } from '../mock';
import type { ExerciseDraft, LibraryExercise } from '../types';
import { ExerciseDetailView } from '../ExerciseDetailView/ExerciseDetailView';
import { ExerciseFormScreen } from '../ExerciseForm/ExerciseFormScreen';
import { ExerciseHistoryView } from '../ExerciseHistoryView/ExerciseHistoryView';
import { ExerciseListView } from '../ExerciseListView/ExerciseListView';

export type ExercisesScreen = 'list' | 'detail' | 'edit' | 'create' | 'history';

type Props = {
  initial?: LibraryExercise[];
  initialScreen?: ExercisesScreen;
  initialSelected?: string;
};

/** Мобильный сценарий вкладки: список → карточка → редактирование / история, создание. Данные пока в памяти. */
export function ExercisesFlow({ initial = exerciseLibrary, initialScreen = 'list', initialSelected = initial[0]?.id }: Props) {
  const [items, setItems] = useState(initial);
  const [screen, setScreen] = useState<ExercisesScreen>(initialScreen);
  const [selectedId, setSelectedId] = useState(initialSelected);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [sort, setSort] = useState<HistorySort>('new');

  const selected = items.find((e) => e.id === selectedId) ?? items[0];

  function create(draft: ExerciseDraft) {
    const ex = createExercise(draft, `custom-${items.length + 1}`);
    setItems([...items, ex]);
    setSelectedId(ex.id);
    setScreen('detail');
  }
  function save(draft: ExerciseDraft) {
    setItems(items.map((e) => (e.id === selected.id ? applyDraft(e, draft) : e)));
    setScreen('detail');
  }

  switch (screen) {
    case 'create':
      return <ExerciseFormScreen mode="create" onCancel={() => setScreen('list')} onSubmit={create} />;
    case 'edit':
      return <ExerciseFormScreen mode="edit" exercise={selected} onCancel={() => setScreen('detail')} onSubmit={save} />;
    case 'history':
      return (
        <ExerciseHistoryView exercise={selected} sort={sort} onSortChange={setSort} onBack={() => setScreen('detail')} />
      );
    case 'detail':
      return (
        <ExerciseDetailView
          exercise={selected}
          onBack={() => setScreen('list')}
          onEdit={() => setScreen('edit')}
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
          onCreate={() => setScreen('create')}
        />
      );
  }
}
