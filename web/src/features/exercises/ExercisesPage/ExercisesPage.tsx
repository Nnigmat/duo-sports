import { useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useExercises } from '../../../data/hooks';
import { Skeleton, useMediaQuery } from '../../../shared';
import { ExerciseDetailView } from '../ExerciseDetailView/ExerciseDetailView';
import { ExerciseFormScreen } from '../ExerciseForm/ExerciseFormScreen';
import { ExerciseHistoryView } from '../ExerciseHistoryView/ExerciseHistoryView';
import { ExerciseListView } from '../ExerciseListView/ExerciseListView';
import { applyDraft, createExercise, type GroupFilter, type HistorySort } from '../library';
import type { ExerciseDraft, LibraryExercise } from '../types';

const BASE = '/exercises';

/** Вкладка «Упражнения»: загрузка и маршруты. Правки пока живут в памяти и пропадают при перезагрузке (сервера нет). */
export function ExercisesPage() {
  const { data, error } = useExercises();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return <ExercisesRoutes initial={data} />;
}

/** Находит упражнение из адреса; неизвестный id возвращает на список */
function Exercise({ items, render }: { items: LibraryExercise[]; render: (ex: LibraryExercise) => ReactElement }) {
  const { id } = useParams();
  const ex = items.find((e) => e.id === id);
  return ex ? render(ex) : <Navigate to={BASE} replace />;
}

function ExercisesRoutes({ initial }: { initial: LibraryExercise[] }) {
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [items, setItems] = useState(initial);
  // Поиск и фильтр живут здесь, чтобы после возврата из карточки список остался как был
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [sort, setSort] = useState<HistorySort>('new');

  function create(draft: ExerciseDraft) {
    const ex = createExercise(draft, `custom-${Date.now()}`);
    setItems((list) => [...list, ex]);
    navigate(`${BASE}/${ex.id}`);
  }
  function save(id: string, draft: ExerciseDraft) {
    setItems((list) => list.map((e) => (e.id === id ? applyDraft(e, draft) : e)));
    navigate(`${BASE}/${id}`);
  }

  return (
    <Routes>
      <Route
        index
        element={
          <ExerciseListView
            exercises={items}
            query={query}
            onQueryChange={setQuery}
            group={group}
            onGroupChange={setGroup}
            onOpen={(id) => navigate(`${BASE}/${id}`)}
            onCreate={() => navigate(`${BASE}/new`)}
            layout={desktop ? 'desktop' : 'mobile'}
          />
        }
      />
      <Route path="new" element={<ExerciseFormScreen mode="create" onCancel={() => navigate(BASE)} onSubmit={create} />} />
      <Route
        path=":id"
        element={
          <Exercise
            items={items}
            render={(ex) => (
              <ExerciseDetailView
                exercise={ex}
                backLabel={desktop ? 'Все упражнения' : 'Упражнения'}
                onBack={() => navigate(BASE)}
                onEdit={() => navigate(`${BASE}/${ex.id}/edit`)}
                onOpenHistory={() => {
                  setSort('new');
                  navigate(`${BASE}/${ex.id}/history`);
                }}
              />
            )}
          />
        }
      />
      <Route
        path=":id/edit"
        element={
          <Exercise
            items={items}
            render={(ex) => (
              <ExerciseFormScreen mode="edit" exercise={ex} onCancel={() => navigate(`${BASE}/${ex.id}`)} onSubmit={(d) => save(ex.id, d)} />
            )}
          />
        }
      />
      <Route
        path=":id/history"
        element={
          <Exercise
            items={items}
            render={(ex) => (
              <ExerciseHistoryView exercise={ex} sort={sort} onSortChange={setSort} onBack={() => navigate(`${BASE}/${ex.id}`)} />
            )}
          />
        }
      />
      <Route path="*" element={<Navigate to={BASE} replace />} />
    </Routes>
  );
}
