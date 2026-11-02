import { useMemo, useState, type MouseEvent } from 'react';
import type { ImportRecord } from '../../../../../shared/types';
import type { ImportData } from '../../../data/types';
import type { ImportActions } from '../api';
import { buildCommit } from '../commit';
import { clockTime } from '../done';
import { ImportDoneView } from '../ImportDoneView/ImportDoneView';
import { ImportFormatView } from '../ImportFormatView/ImportFormatView';
import { ImportPlanView } from '../ImportPlanView/ImportPlanView';
import { ImportPreviewView } from '../ImportPreviewView/ImportPreviewView';
import { ImportSourceView } from '../ImportSourceView/ImportSourceView';
import { sampleYaml } from '../import';
import { buildPlan, DEFAULT_OPTIONS, type PlanOptions } from '../importPlan';
import { parseImport, type ParsedImport, type ParseIssue } from '../parse';
import { EMPTY_CHOICES } from '../preview';
import type { ExerciseChoices } from '../types';

export type ImportLinks = {
  /** Страница импорта; ссылка на неё с шага «Готово» начинает заново */
  import: string;
  format: string;
  workouts: string;
  plan: string;
  exercises: string;
};

type Props = {
  data: ImportData;
  /** Что показываем: шаги импорта или страница «Формат». Состояние шагов при этом не теряется. */
  view: 'flow' | 'format';
  links: ImportLinks;
  /** Запросы к серверу: сохранить, отменить, вернуть */
  actions: ImportActions;
  /** Переход по ссылке внутри приложения */
  onNavigate: (href: string) => void;
  onCopy: (text: string) => void;
  /** «Отмена» на первом шаге */
  onCancel: () => void;
};

type Step = 1 | 2 | 3 | 4;

/**
 * Весь импорт по шагам. «Проверить» разбирает вставленный YAML; пока в тексте есть ошибки, дальше не пускаем.
 * «Импортировать» отправляет результат на сервер, «Отменить импорт» откатывает его. Router не нужен:
 * ссылки перехватываются и уходят в onNavigate.
 */
export function ImportFlow({ data, view, links, actions, onNavigate, onCopy, onCancel }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [choices, setChoices] = useState<ExerciseChoices>(EMPTY_CHOICES);
  const [options, setOptions] = useState<PlanOptions>(DEFAULT_OPTIONS);
  const [record, setRecord] = useState<ImportRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setText('');
    setParsed(null);
    setIssues([]);
    setChoices(EMPTY_CHOICES);
    setOptions(DEFAULT_OPTIONS);
    setRecord(null);
    setFailure(null);
  };

  /** Внутренние ссылки не перезагружают страницу; «Импортировать ещё» начинает заново */
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    const href = a?.getAttribute('href');
    if (!a || !href?.startsWith('/') || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (href === links.import && step === 4) reset();
    onNavigate(href);
  };

  const sample = useMemo(() => sampleYaml(data.today), [data.today]);

  /** Разбираем текст; при успехе выбор по упражнениям начинается заново: ключи упражнений новые */
  const check = () => {
    const r = parseImport(text, data);
    if (!r.ok) return setIssues(r.errors);
    setIssues([]);
    setParsed(r);
    setChoices(EMPTY_CHOICES);
    setOptions(DEFAULT_OPTIONS);
    setStep(2);
  };

  /** Выполняет запрос к серверу: пока идёт, кнопки заняты; ошибку показываем на экране */
  const run = async (job: () => Promise<ImportRecord>, then?: () => void) => {
    setBusy(true);
    setFailure(null);
    try {
      setRecord(await job());
      then?.();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Не получилось');
    } finally {
      setBusy(false);
    }
  };

  const total = parsed?.plan.workouts.length ?? 0;
  const plan = parsed ? buildPlan(parsed.plan, options) : null;

  return (
    <div onClick={onClick}>
      {view === 'format' ? (
        <ImportFormatView onCopyExample={onCopy} importHref={links.import} />
      ) : step === 1 || !parsed || !plan ? (
        <ImportSourceView
          text={text}
          onTextChange={(t) => {
            setText(t);
            setIssues([]);
          }}
          exercises={data.library}
          issues={issues}
          sample={sample}
          onCopyReference={onCopy}
          formatHref={links.format}
          onCancel={onCancel}
          onCheck={check}
        />
      ) : step === 2 ? (
        <ImportPreviewView data={parsed.preview} choices={choices} onChoicesChange={setChoices} onBack={() => setStep(1)} onNext={() => setStep(3)} />
      ) : step === 3 || !record ? (
        <ImportPlanView
          source={parsed.plan}
          options={options}
          onOptionsChange={setOptions}
          total={total}
          busy={busy}
          error={failure}
          onBack={() => setStep(2)}
          onImport={() => run(() => actions.commit(buildCommit(parsed, choices, options)), () => setStep(4))}
        />
      ) : (
        <ImportDoneView
          time={clockTime(record.createdAt)}
          plan={plan}
          newExercises={parsed.preview.newExercises}
          choices={choices}
          total={total}
          restored={plan.conflicts.filter((c) => c.choice === 'replace').map((c) => c.mine)}
          undone={record.undoneAt !== null}
          busy={busy}
          error={failure}
          onUndo={() => run(() => actions.undo(record.id))}
          onRedo={() => run(() => actions.redo(record.id))}
          workoutsHref={links.workouts}
          planHref={links.plan}
          exercisesHref={links.exercises}
          againHref={links.import}
        />
      )}
    </div>
  );
}
