import { useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../app/auth/AuthProvider';
import { useExercises } from '../../../data/hooks';
import { Skeleton, useMediaQuery } from '../../../shared';
import { ExerciseDetailView } from '../ExerciseDetailView/ExerciseDetailView';
import { ExerciseFormScreen } from '../ExerciseForm/ExerciseFormScreen';
import { ExerciseHistoryView } from '../ExerciseHistoryView/ExerciseHistoryView';
import { ExerciseListView } from '../ExerciseListView/ExerciseListView';
import { createExercise, deleteDemo, deleteExercise, updateExercise, uploadDemo } from '../api';
import { canManageExercises, type GroupFilter, type HistorySort } from '../library';
import type { ExerciseDemo, Gender } from '../../../../../shared/types';
import type { ExerciseDraft, LibraryExercise } from '../types';

const BASE = '/exercises';

/** Вкладка «Упражнения»: загрузка и маршруты. Библиотека общая и приходит с сервера; создают, правят и удаляют тренер и админ, спортсмен только читает. */
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
  const auth = useAuth();
  const canManage = auth.status === 'in' && canManageExercises(auth.user.role);
  const [items, setItems] = useState(initial);
  // Поиск и фильтр живут здесь, чтобы после возврата из карточки список остался как был
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [sort, setSort] = useState<HistorySort>('new');

  // Ошибка запроса летит в форму: она остаётся открытой и показывает сообщение
  async function create(draft: ExerciseDraft) {
    const ex = await createExercise(draft);
    setItems((list) => [...list, ex]);
    navigate(`${BASE}/${ex.id}`);
  }
  async function save(current: LibraryExercise, draft: ExerciseDraft) {
    const next = await updateExercise(current, draft);
    setItems((list) => list.map((e) => (e.id === current.id ? next : e)));
    navigate(`${BASE}/${current.id}`);
  }
  /** Ролики в списке обновляются сразу: после «Отмена» карточка показывает уже загруженное */
  async function changeDemo(id: string, action: () => Promise<ExerciseDemo>): Promise<ExerciseDemo> {
    const demo = await action();
    setItems((list) => list.map((e) => (e.id === id ? { ...e, demo: Object.keys(demo).length ? demo : undefined } : e)));
    return demo;
  }
  async function remove(id: string) {
    await deleteExercise(id);
    setItems((list) => list.filter((e) => e.id !== id));
    navigate(BASE, { replace: true });
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
            onCreate={canManage ? () => navigate(`${BASE}/new`) : undefined}
            layout={desktop ? 'desktop' : 'mobile'}
          />
        }
      />
      <Route
        path="new"
        element={canManage ? <ExerciseFormScreen mode="create" onCancel={() => navigate(BASE)} onSubmit={create} /> : <Navigate to={BASE} replace />}
      />
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
                onEdit={canManage ? () => navigate(`${BASE}/${ex.id}/edit`) : undefined}
                onAddVideo={canManage ? () => navigate(`${BASE}/${ex.id}/edit`) : undefined}
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
            render={(ex) =>
              canManage ? (
                <ExerciseFormScreen
                  mode="edit"
                  exercise={ex}
                  onCancel={() => navigate(`${BASE}/${ex.id}`)}
                  onSubmit={(d) => save(ex, d)}
                  onDelete={() => remove(ex.id)}
                  demo={{
                    onUpload: (g: Gender, file: File) => changeDemo(ex.id, () => uploadDemo(ex.id, g, file)),
                    onRemove: (g: Gender) => changeDemo(ex.id, () => deleteDemo(ex.id, g)),
                  }}
                />
              ) : (
                <Navigate to={`${BASE}/${ex.id}`} replace />
              )
            }
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
