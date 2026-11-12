import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Block, RoutineSlugs, Workout } from '../../../../../shared/types';
import { useExercises } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { Notice } from '../../../ui';
import type { LibraryExercise } from '../../exercises/types';
import { fetchRoutines } from '../../routines/api';
import { fetchOwnWorkout, putOwnWorkout } from '../../plan/api';
import { fetchPlannedWorkout, putWorkout } from '../api';
import { toIso } from '../../plan/plan';
import type { ParseIssue } from '../../import/parse';
import { editableBlocks, problems } from './draft';
import { WorkoutEditView, type EditView } from './WorkoutEditView';
import { type KnownRoutine, workoutFromYaml, workoutToYaml } from './workoutYaml';

/** Откуда брать тренировку и куда её сохранять: у тренера — ученика, у спортсмена — свою */
type Source = {
  load: () => Promise<Workout>;
  save: (title: string, blocks: Block[], links: RoutineSlugs) => Promise<unknown>;
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
    save: (title, blocks, links) => (athleteId === undefined ? putOwnWorkout(workoutId, title, blocks, links) : putWorkout(athleteId, workoutId, title, blocks, links)),
    back: athleteId === undefined ? '/plan' : `/trainer/athletes/${athleteId}/plan`,
  };
}

function Loader({ athleteId, workoutId }: { athleteId?: number; workoutId: number }) {
  const source = useWorkoutSource(athleteId, workoutId);
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const library = useExercises();
  const [routines, setRoutines] = useState<KnownRoutine[]>([]);
  const { load } = source;
  // Готовые разминки и заминки нужны только для YAML: без них редактор работает, но ссылки routine не проверит
  useEffect(() => {
    let alive = true;
    fetchRoutines().then(
      (list) => alive && setRoutines(list.map(({ id, kind, title }) => ({ id, kind, title }))),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
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
  return <Editor source={source} workout={workout} library={library.data} routines={routines} />;
}

/** Наборы библиотеки плюс уже подключённые к тренировке: так ссылки не пропадут, даже если список не загрузился */
function knownRoutines(list: KnownRoutine[], current: Workout['routines']): KnownRoutine[] {
  const out = [...list];
  for (const [kind, r] of [['warmup', current?.warmup], ['cooldown', current?.cooldown]] as const) {
    if (r && !out.some((x) => x.id === r.id)) out.push({ id: r.id, kind, title: r.title });
  }
  return out;
}

function Editor({ source, workout, library, routines }: { source: Source; workout: Workout; library: LibraryExercise[]; routines: KnownRoutine[] }) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [title, setTitle] = useState(workout.title);
  const [blocks, setBlocks] = useState<Block[]>(() => editableBlocks(workout.blocks, workout.routines));
  const [links, setLinks] = useState<RoutineSlugs>(() => ({
    ...(workout.routines?.warmup ? { warmup: workout.routines.warmup.id } : {}),
    ...(workout.routines?.cooldown ? { cooldown: workout.routines.cooldown.id } : {}),
  }));
  const known = knownRoutines(routines, workout.routines);
  const linked = {
    ...(links.warmup ? { warmup: { id: links.warmup, title: known.find((r) => r.id === links.warmup)?.title ?? links.warmup } } : {}),
    ...(links.cooldown ? { cooldown: { id: links.cooldown, title: known.find((r) => r.id === links.cooldown)?.title ?? links.cooldown } } : {}),
  };
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
    const r = workoutFromYaml(text, library, blocks, toIso(new Date()), known);
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
      setText(workoutToYaml(title, blocks, links));
      setYamlIssues([]);
      setView('yaml');
      return;
    }
    const r = readYaml();
    if (!r) return;
    setTitle(r.title);
    setBlocks(r.blocks);
    setLinks(r.links);
    setView('form');
  };

  const save = () => {
    setTried(true);
    let name = title;
    let list = blocks;
    let chosen = links;
    if (view === 'yaml') {
      const r = readYaml();
      if (!r) return;
      name = r.title;
      list = r.blocks;
      chosen = r.links;
      setTitle(name);
      setBlocks(list);
      setLinks(chosen);
    }
    if (problems(name, list).length > 0) {
      if (view === 'yaml') setYamlIssues(problems(name, list).map((message) => ({ message })));
      return;
    }
    setSaving(true);
    setFailure(null);
    source.save(name.trim(), list, chosen).then(back, (e: unknown) => {
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
      routines={linked}
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
