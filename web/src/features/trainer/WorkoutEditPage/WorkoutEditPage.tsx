import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Block, Workout } from '../../../../../shared/types';
import { useExercises } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { Notice } from '../../../ui';
import type { LibraryExercise } from '../../exercises/types';
import { fetchOwnWorkout, putOwnWorkout } from '../../plan/api';
import { fetchPlannedWorkout, putWorkout } from '../api';
import { toIso } from '../../plan/plan';
import type { ParseIssue } from '../../import/parse';
import { problems } from './draft';
import { WorkoutEditView, type EditView } from './WorkoutEditView';
import { workoutFromYaml, workoutToYaml } from './workoutYaml';

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
  const [view, setView] = useState<EditView>('form');
  const [text, setText] = useState('');
  const [yamlIssues, setYamlIssues] = useState<ParseIssue[]>([]);
  const back = () => navigate(search.get('back') ?? source.back);
  const issues = problems(title, blocks);

  /** Читает YAML; при ошибках показывает их и ничего не меняет */
  const readYaml = () => {
    const r = workoutFromYaml(text, library, blocks, toIso(new Date()));
    if (!r.ok) {
      setYamlIssues(r.issues);
      return null;
    }
    setYamlIssues([]);
    return r;
  };

  const switchView = (next: EditView) => {
    if (next === view) return;
    if (next === 'yaml') {
      setText(workoutToYaml(title, blocks));
      setYamlIssues([]);
      setView('yaml');
      return;
    }
    const r = readYaml();
    if (!r) return;
    setTitle(r.title);
    setBlocks(r.blocks);
    setView('form');
  };

  const save = () => {
    setTried(true);
    let name = title;
    let list = blocks;
    if (view === 'yaml') {
      const r = readYaml();
      if (!r) return;
      name = r.title;
      list = r.blocks;
      setTitle(name);
      setBlocks(list);
    }
    if (problems(name, list).length > 0) {
      if (view === 'yaml') setYamlIssues(problems(name, list).map((message) => ({ message })));
      return;
    }
    setSaving(true);
    setFailure(null);
    source.save(name.trim(), list).then(back, (e: unknown) => {
      setSaving(false);
      setFailure(e instanceof Error ? e.message : 'Не получилось сохранить');
    });
  };

  return (
    <WorkoutEditView
      view={view}
      yaml={{ text, issues: yamlIssues, onText: setText }}
      onView={switchView}
      title={title}
      blocks={blocks}
      library={library}
      saving={saving}
      issues={tried && view === 'form' ? issues : []}
      failure={failure}
      onTitle={setTitle}
      onBlocks={setBlocks}
      onSave={save}
      onCancel={back}
    />
  );
}
