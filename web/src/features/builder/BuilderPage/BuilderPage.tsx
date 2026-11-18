import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../app/auth/AuthProvider';
import { useExercises, useImport } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { Notice } from '../../../ui';
import type { LibraryExercise } from '../../exercises/types';
import { importActionsFor } from '../../import/api';
import { dayLabel } from '../../import/importPlan';
import type { ParseContext, ParseIssue } from '../../import/parse';
import { parseIso, toIso, weekdayShort } from '../../plan/plan';
import { athleteBase } from '../../trainer/api';
import { DraftError, requestDraft } from '../api';
import { buildWorkout } from '../build';
import { BuilderInputView } from '../BuilderInputView/BuilderInputView';
import { BuilderReviewView } from '../BuilderReviewView/BuilderReviewView';
import { BUILDER_VERSION, builderKey, clearBuilder, loadBuilder, saveBuilder } from '../storage';
import { canSave } from '../draftOps';
import { draftToCommit } from '../toCommit';
import { EMPTY_INPUT, toRequest, type BuilderDraft, type BuilderInput } from '../types';

/** Черновик пишется не на каждую букву, а через полсекунды после последней правки */
const SAVE_DELAY_MS = 500;
/** Дольше — предупреждаем, что сборка затянулась: API, не принявший запрос, отвечает только через минуты */
const SLOW_AFTER_MS = 40_000;

const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(parseIso(s)) === s;

/** «Создать тренировку» в своём плане тренера или админа: /plan/new?date=… */
export function OwnBuilderPage() {
  return <BuilderRoute athleteId={null} />;
}

/** «Создать тренировку» в плане ученика: /trainer/athletes/:id/new?date=… */
export function AthleteBuilderPage() {
  const { id } = useParams();
  if (!id || !/^\d+$/.test(id)) return <Navigate to="/trainer" replace />;
  return <BuilderRoute athleteId={Number(id)} />;
}

function BuilderRoute({ athleteId }: { athleteId: number | null }) {
  const [params] = useSearchParams();
  const date = params.get('date');
  const planHref = athleteId === null ? '/plan' : `/trainer/athletes/${athleteId}/plan`;
  if (!isDay(date)) return <Navigate to={planHref} replace />;
  return <BuilderData athleteId={athleteId} date={date} planHref={planHref} />;
}

function BuilderData({ athleteId, date, planHref }: { athleteId: number | null; date: string; planHref: string }) {
  const auth = useAuth();
  const apiBase = athleteId === null ? '/api' : athleteBase(athleteId);
  const ctx = useImport(apiBase);
  const exercises = useExercises();
  const error = ctx.error ?? exercises.error;
  if (error) return <Notice tone="error">{error}</Notice>;
  if (auth.status !== 'in' || !ctx.data || !exercises.data) return <Skeleton height={320} />;
  const key = builderKey(auth.user.id, athleteId, date);
  const importHref = athleteId === null ? `/import?date=${date}` : `/trainer/athletes/${athleteId}/import?date=${date}`;
  return <Builder key={key} storageKey={key} athleteId={athleteId} date={date} ctx={ctx.data} library={exercises.data} apiBase={apiBase} planHref={planHref} importHref={importHref} />;
}

type BuilderProps = {
  storageKey: string;
  athleteId: number | null;
  date: string;
  ctx: ParseContext;
  library: LibraryExercise[];
  apiBase: string;
  planHref: string;
  importHref: string;
};

/** Ввод → сборка агентом → проверка в форме → «Сохранить» через импорт. Всё до сохранения живёт в черновике браузера. */
function Builder({ storageKey, athleteId, date, ctx, library, apiBase, planHref, importHref }: BuilderProps) {
  const navigate = useNavigate();
  const [restored] = useState(() => loadBuilder(storageKey));
  const [restoredAt, setRestoredAt] = useState<number | null>(restored?.savedAt ?? null);
  const [step, setStep] = useState<'input' | 'review'>(restored?.step ?? 'input');
  const [input, setInput] = useState<BuilderInput>(restored?.input ?? EMPTY_INPUT);
  const [draft, setDraft] = useState<BuilderDraft | null>(restored?.draft ?? null);
  const [building, setBuilding] = useState(false);
  const [slow, setSlow] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  /** Номер текущей сборки: ответ старой (после «Начать заново» или ухода со страницы) отбрасывается */
  const run = useRef(0);
  useEffect(() => () => void run.current++, []);

  // Пустой ввод без черновика не пишем: просто открытая страница не должна оставлять «восстановленный черновик»
  const pristine = step === 'input' && draft === null && JSON.stringify(input) === JSON.stringify(EMPTY_INPUT);
  useEffect(() => {
    if (pristine) return;
    const t = window.setTimeout(() => saveBuilder(storageKey, { v: BUILDER_VERSION, savedAt: Date.now(), step, input, draft }), SAVE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [storageKey, step, input, draft, pristine]);

  useEffect(() => {
    setSlow(false);
    if (!building) return;
    const t = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [building]);

  async function build() {
    const id = ++run.current;
    setBuilding(true);
    setBuildError(null);
    setUnavailable(false);
    setIssues([]);
    try {
      const result = await buildWorkout(toRequest(input, date, athleteId), ctx, input.main.picked, requestDraft);
      if (id !== run.current) return;
      if (result.ok) {
        setDraft(result.draft);
        setRestoredAt(null);
        setProblems([]);
        setFailure(null);
        setStep('review');
      } else setIssues(result.errors);
    } catch (e) {
      if (id !== run.current) return;
      if (e instanceof DraftError && e.status === 503) setUnavailable(true);
      else setBuildError(e instanceof Error ? e.message : 'Не удалось собрать тренировку');
    } finally {
      if (id === run.current) setBuilding(false);
    }
  }

  function reset() {
    run.current++;
    clearBuilder(storageKey);
    setInput(EMPTY_INPUT);
    setDraft(null);
    setStep('input');
    setRestoredAt(null);
    setBuilding(false);
    setBuildError(null);
    setUnavailable(false);
    setIssues([]);
  }

  async function save() {
    if (!draft || !canSave(draft)) return;
    const check = draftToCommit(draft, ctx);
    if (!check.ok) return setProblems(check.problems);
    setProblems([]);
    setFailure(null);
    setSaving(true);
    try {
      await importActionsFor(apiBase).commit(check.commit);
      run.current++;
      clearBuilder(storageKey);
      navigate(planHref);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Не удалось сохранить');
      setSaving(false);
    }
  }

  if (step === 'review' && draft)
    return (
      <BuilderReviewView
        draft={draft}
        library={library}
        routines={ctx.routines}
        saving={saving}
        problems={problems}
        failure={failure}
        onDraft={(d) => {
          setDraft(d);
          setProblems([]);
        }}
        onSave={() => void save()}
        onRebuild={() => {
          setDraft(null);
          setStep('input');
          setProblems([]);
          setFailure(null);
        }}
        restoredAt={restoredAt}
        onReset={reset}
      />
    );

  return (
    <BuilderInputView
      dateLabel={`${weekdayShort(date)} ${dayLabel(date)}`}
      input={input}
      library={ctx.library}
      routines={ctx.routines}
      building={building}
      slow={slow}
      error={buildError}
      unavailableHref={unavailable ? importHref : null}
      issues={issues}
      restoredAt={restoredAt}
      onInput={setInput}
      onBuild={() => void build()}
      onReset={reset}
    />
  );
}
