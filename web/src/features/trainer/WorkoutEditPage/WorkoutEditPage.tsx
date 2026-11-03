import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Block, Workout } from '../../../../../shared/types';
import { useExercises } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { Notice } from '../../../ui';
import type { LibraryExercise } from '../../exercises/types';
import { fetchOwnWorkout, putOwnWorkout } from '../../plan/api';
import { fetchPlannedWorkout, putWorkout } from '../api';
import { problems } from './draft';
import { WorkoutEditView } from './WorkoutEditView';

/** Откуда брать тренировку и куда её сохранять: у тренера — ученика, у спортсмена — свою */
type Source = {
  load: () => Promise<Workout>;
  save: (title: string, blocks: Block[]) => Promise<unknown>;
  back: string;
};

/** /trainer/athletes/:id/workouts/:wid/edit — состав тренировки ученика: блоки, упражнения, цели, отдых, круги для видео */
export function WorkoutEditPage() {
  const { id, wid } = useParams();
  if (!id || !wid || !/^\d+$/.test(id) || !/^\d+$/.test(wid)) return <Navigate to="/trainer" replace />;
  const athleteId = Number(id);
  const workoutId = Number(wid);
  return <Loader athleteId={athleteId} workoutId={workoutId} />;
}

/** /plan/workouts/:wid/edit — то же для собственной тренировки спортсмена */
export function OwnWorkoutEditPage() {
  const { wid } = useParams();
  if (!wid || !/^\d+$/.test(wid)) return <Navigate to="/plan" replace />;
  return <Loader workoutId={Number(wid)} />;
}

function useWorkoutSource(athleteId: number | undefined, workoutId: number): Source {
  return {
    load: useCallback(() => (athleteId === undefined ? fetchOwnWorkout(workoutId) : fetchPlannedWorkout(athleteId, workoutId)), [athleteId, workoutId]),
    save: (title, blocks) => (athleteId === undefined ? putOwnWorkout(workoutId, title, blocks) : putWorkout(athleteId, workoutId, title, blocks)),
    back: athleteId === undefined ? '/plan' : `/trainer/athletes/${athleteId}/plan`,
  };
}

function Loader({ athleteId, workoutId }: { athleteId?: number; workoutId: number }) {
  const source = useWorkoutSource(athleteId, workoutId);
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const library = useExercises();
  const { load } = source;
  useEffect(() => {
    let alive = true;
    load().then(
      (w) => alive && setWorkout(w),
      (e: unknown) => {
        if (!alive) return;
        if (e instanceof Error && e.message === 'Не найдено') setWorkout(null);
        else setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      },
    );
    return () => {
      alive = false;
    };
  }, [load]);
  const failed = error ?? library.error;
  if (failed) return <p role="alert">{failed}</p>;
  if (workout === undefined || !library.data) return <Skeleton height={480} />;
  if (!workout) return <Notice tone="warn">У этой тренировки нет состава, изменить её нельзя. Импортируйте её заново.</Notice>;
  return <Editor source={source} workout={workout} library={library.data} />;
}

function Editor({ source, workout, library }: { source: Source; workout: Workout; library: LibraryExercise[] }) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [title, setTitle] = useState(workout.title);
  const [blocks, setBlocks] = useState<Block[]>(workout.blocks);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const back = () => navigate(search.get('back') ?? source.back);
  const issues = problems(title, blocks);

  const save = () => {
    setTried(true);
    if (issues.length > 0) return;
    setSaving(true);
    setFailure(null);
    source.save(title.trim(), blocks).then(back, (e: unknown) => {
      setSaving(false);
      setFailure(e instanceof Error ? e.message : 'Не получилось сохранить');
    });
  };

  return (
    <WorkoutEditView
      title={title}
      blocks={blocks}
      library={library}
      saving={saving}
      issues={tried ? issues : []}
      failure={failure}
      onTitle={setTitle}
      onBlocks={setBlocks}
      onSave={save}
      onCancel={back}
    />
  );
}
