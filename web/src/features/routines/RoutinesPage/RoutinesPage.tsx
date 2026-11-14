import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { RoutineDetail, RoutineKind, RoutineSummary } from '../../../../../shared/types';
import { useAuth } from '../../../app/auth/AuthProvider';
import { useExercises } from '../../../data/hooks';
import { Notice, Button } from '../../../ui';
import { Skeleton, useMediaQuery } from '../../../shared';
import { createRoutine, deleteRoutine, fetchRoutine, fetchRoutines, updateRoutine } from '../api';
import { RoutineDetailView } from '../RoutineDetailView/RoutineDetailView';
import { RoutineForm } from '../RoutineForm/RoutineForm';
import { RoutineListView } from '../RoutineListView/RoutineListView';
import { canManageRoutines } from '../routines';

const BASE = '/routines';
const message = (e: unknown) => (e instanceof Error ? e.message : 'Ошибка загрузки');

/** Вкладка «Разминки»: загрузка и маршруты. Читает любой вошедший, меняют тренер и админ. */
export function RoutinesPage() {
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const auth = useAuth();
  const canManage = auth.status === 'in' && canManageRoutines(auth.user.role);
  const [list, setList] = useState<RoutineSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Вид и поиск живут здесь, чтобы после возврата из карточки список остался как был
  const [kind, setKind] = useState<RoutineKind>('warmup');
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setError(null);
    return fetchRoutines().then(setList, (e: unknown) => setError(message(e)));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save(id: string | null, input: Parameters<typeof createRoutine>[0]) {
    const r = id ? await updateRoutine(id, input) : await createRoutine(input);
    setKind(r.kind);
    await load();
    navigate(`${BASE}/${r.id}`, { replace: !!id });
  }
  async function remove(id: string) {
    await deleteRoutine(id);
    await load();
    navigate(BASE, { replace: true });
  }

  return (
    <Routes>
      <Route
        index
        element={
          <RoutineListView
            routines={list}
            error={error}
            onRetry={() => {
              setList(null);
              void load();
            }}
            kind={kind}
            onKindChange={setKind}
            query={query}
            onQueryChange={setQuery}
            onOpen={(id) => navigate(`${BASE}/${id}`)}
            onCreate={canManage ? () => navigate(`${BASE}/new`) : undefined}
          />
        }
      />
      <Route
        path="new"
        element={
          canManage ? (
            <WithExercises render={(exercises) => <RoutineForm mode="create" kind={kind} exercises={exercises} onCancel={() => navigate(BASE)} onSubmit={(input) => save(null, input)} />} />
          ) : (
            <Navigate to={BASE} replace />
          )
        }
      />
      <Route
        path=":id"
        element={
          <Loaded
            render={(r) => (
              <RoutineDetailView
                routine={r}
                backLabel={desktop ? 'Все разминки' : 'Разминки'}
                onBack={() => navigate(BASE)}
                onEdit={canManage ? () => navigate(`${BASE}/${r.id}/edit`) : undefined}
                onOpenExercise={navigate}
              />
            )}
          />
        }
      />
      <Route
        path=":id/edit"
        element={
          canManage ? (
            <Loaded
              render={(r) => (
                <WithExercises
                  render={(exercises) => (
                    <RoutineForm
                      mode="edit"
                      routine={r}
                      exercises={exercises}
                      onCancel={() => navigate(`${BASE}/${r.id}`)}
                      onSubmit={(input) => save(r.id, input)}
                      onDelete={() => remove(r.id)}
                    />
                  )}
                />
              )}
            />
          ) : (
            <Navigate to={BASE} replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={BASE} replace />} />
    </Routes>
  );
}

/** Карточка из адреса; 404 возвращает на список, остальное показывает ошибку */
function Loaded({ render }: { render: (r: RoutineDetail) => ReactElement }) {
  const { id = '' } = useParams();
  const [state, setState] = useState<{ id: string; data?: RoutineDetail; error?: { text: string; notFound: boolean } } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt — триггер повторной загрузки
  useEffect(() => {
    let alive = true;
    fetchRoutine(id).then(
      (data) => alive && setState({ id, data }),
      (e: unknown) => alive && setState({ id, error: { text: message(e), notFound: (e as { status?: number }).status === 404 } }),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  if (!state || state.id !== id) return <Skeleton height={320} />;
  if (state.error?.notFound) return <Navigate to={BASE} replace />;
  if (state.error)
    return (
      <Notice tone="error" action={<Button variant="secondary" compact onClick={() => { setState(null); setAttempt((n) => n + 1); }}>Повторить</Button>}>
        {state.error.text}
      </Notice>
    );
  return state.data ? render(state.data) : null;
}

/** Библиотека упражнений для выбора состава; грузится только на экранах формы */
function WithExercises({ render }: { render: (exercises: Array<{ id: string; name: string; kind: 'reps' | 'weight' | 'time' }>) => ReactElement }) {
  const { data, error } = useExercises();
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <Skeleton height={320} />;
  return render(data.map((e) => ({ id: e.id, name: e.name, kind: e.kind })));
}
