import { useState } from 'react';
import type { ExerciseKind, RoutineDetail, RoutineInput, RoutineKind } from '../../../../../shared/types';
import { Button, Checkbox, Dialog, IconButton, Notice, SearchField, SegmentedControl, Sheet, Text, TextArea, TextInput, TopBar } from '../../../ui';
import { RoutineError } from '../api';
import { draftFromYaml, draftToYaml, type YamlIssue } from '../routineYaml';
import {
  type DraftItem,
  draftFromRoutine,
  draftTotal,
  emptyDraft,
  itemError,
  KIND_LABEL,
  LIMITS,
  mmss,
  moveItem,
  newItem,
  problems,
  type RoutineDraft,
  toInput,
  usedText,
} from '../routines';
import styles from './RoutineForm.module.css';

/** Упражнение библиотеки для выбора; в состав идут только упражнения на время */
export type PickerExercise = { id: string; name: string; kind: ExerciseKind };

type Common = {
  exercises: PickerExercise[];
  onCancel: () => void;
  /** Может быть асинхронным: пока выполняется, кнопка занята, отказ показывается на экране */
  onSubmit: (input: RoutineInput) => void | Promise<void>;
};
type Props =
  | (Common & { mode: 'create'; kind: RoutineKind; routine?: undefined; onDelete?: undefined })
  | (Common & { mode: 'edit'; routine: RoutineDetail; onDelete: () => void | Promise<void>; kind?: undefined });

/** Форма разминки или заминки: название, пояснение, состав по порядку, удаление. */
export function RoutineForm(props: Props) {
  const { mode, exercises, onCancel, onSubmit } = props;
  const create = mode === 'create';
  const [draft, setDraft] = useState<RoutineDraft>(() => (props.routine ? draftFromRoutine(props.routine) : emptyDraft(props.kind ?? 'warmup')));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [picker, setPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mode_, setMode] = useState<'form' | 'yaml'>('form');
  const [yaml, setYaml] = useState('');
  const [yamlIssues, setYamlIssues] = useState<YamlIssue[]>([]);
  const [slugs, setSlugs] = useState(false);
  const [copied, setCopied] = useState(false);
  const yamlMode = mode_ === 'yaml';

  const issues = problems(draft);
  const ok = yamlMode ? yamlIssues.length === 0 : issues.length === 0;
  const label = KIND_LABEL[draft.kind];
  const usedIn = props.routine?.usedIn ?? 0;
  const usedBy = props.routine?.usedBy ?? [];

  const patch = (p: Partial<RoutineDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchItem = (key: number, p: Partial<DraftItem>) =>
    setDraft((d) => ({ ...d, items: d.items.map((it) => (it.key === key ? { ...it, ...p } : it)) }));

  async function run(action: () => void | Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Не удалось сохранить. Попробуйте ещё раз'));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }
  const timeLib = exercises.filter((e) => e.kind === 'time');

  /** Читает YAML; при ошибках показывает их и ничего не меняет */
  function readYaml(): RoutineDraft | null {
    const r = draftFromYaml(yaml, timeLib, draft);
    if (!r.ok) {
      setYamlIssues(r.issues);
      return null;
    }
    setYamlIssues([]);
    return r.draft;
  }
  function switchMode(next: 'form' | 'yaml') {
    if (next === mode_) return;
    if (next === 'yaml') {
      setYaml(draftToYaml(draft));
      setYamlIssues([]);
      setMode('yaml');
      return;
    }
    const d = readYaml();
    if (!d) return;
    setDraft(d);
    setMode('form');
  }
  const save = () => {
    if (!yamlMode) return run(() => onSubmit(toInput(draft)));
    const d = readYaml();
    if (!d) return;
    const left = problems(d);
    if (left.length > 0) return setYamlIssues(left.map((message) => ({ message })));
    setDraft(d);
    return run(() => onSubmit(toInput(d)));
  };
  async function copyYaml() {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const timeOnly = timeLib;
  const q = pickerQuery.trim().toLowerCase();
  const pickable = q ? timeOnly.filter((e) => e.name.toLowerCase().includes(q)) : timeOnly;
  const workoutsInError = error instanceof RoutineError ? error.workouts : [];

  return (
    <div className={styles.root}>
      <TopBar
        start={<Button variant="ghost" compact disabled={busy} onClick={onCancel}>Отмена</Button>}
        end={
          <Button variant="ghost" compact disabled={!ok} loading={busy} onClick={save}>
            {busy ? 'Сохраняем' : create ? 'Создать' : 'Сохранить'}
          </Button>
        }
      />
      <div className={styles.body}>
        <Text variant="h3" tag="h1">{create ? label.newLabel : `${label.one}: правка`}</Text>

        {error && (
          <Notice tone="error">
            {error.message}
            {workoutsInError.length > 0 && (
              <ul className={styles.errList}>
                {workoutsInError.map((w) => (
                  <li key={w.workoutId}>{w.title}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}

        <SegmentedControl
          label="Способ правки"
          value={mode_}
          onChange={switchMode}
          options={[
            { value: 'form', label: 'Поля' },
            { value: 'yaml', label: 'YAML' },
          ]}
        />
        {yamlMode && (
          <section aria-labelledby="rf-yaml" className={styles.section}>
            <div className={styles.sectionHead}>
              <Text variant="h5" tag="h2" id="rf-yaml">Описание в YAML</Text>
              <Button variant="secondary" compact icon="copy" onClick={copyYaml}>{copied ? 'Скопировано' : 'Копировать'}</Button>
            </div>
            {yamlIssues.length > 0 && (
              <Notice tone="error">
                <ul className={styles.errList}>
                  {yamlIssues.map((i) => (
                    <li key={`${i.line ?? 0}${i.message}`}>
                      {i.line ? `Строка ${i.line}: ` : ''}
                      {i.message}
                    </li>
                  ))}
                </ul>
              </Notice>
            )}
            <TextArea
              label="Разминка в YAML"
              rows={18}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className={styles.yaml}
              value={yaml}
              onChange={(e) => {
                setYaml(e.target.value);
                setCopied(false);
                setYamlIssues([]);
              }}
            />
            <Button variant="ghost" compact aria-expanded={slugs} onClick={() => setSlugs((v) => !v)}>Упражнения для поля exercise</Button>
            {slugs && (
              <ul className={styles.slugs}>
                {timeLib.map((e) => (
                  <li key={e.id}>
                    <code>{e.id}</code> <span>{e.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <Notice tone="info">
              <code>sec</code> — секунды: одно число или диапазон <code>30-45</code>. <code>sides: [Левая, Правая]</code> — упражнение идёт два раза. Slug задаёт сервер по названию.
            </Notice>
          </section>
        )}
        {!yamlMode && (
          <>
        <TextInput label="Название" placeholder="Например, ноги, лёгкая" maxLength={LIMITS.title} value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
        <TextArea label="Пояснение · необязательно" rows={3} maxLength={LIMITS.note} placeholder="Например, повторяйте за персонажем" value={draft.note} onChange={(e) => patch({ note: e.target.value })} />

        <section aria-labelledby="rf-items" className={styles.section}>
          <div className={styles.sectionHead}>
            <Text variant="h5" tag="h2" id="rf-items">Упражнения</Text>
            <Text variant="caption" className={styles.num}>{draft.items.length > 0 ? mmss(draftTotal(draft)) : ''}</Text>
          </div>
          {draft.items.length === 0 && <Text variant="body-sm" color="slate">Пока пусто. Добавьте упражнения на время из библиотеки.</Text>}
          <ol className={styles.rows}>
            {draft.items.map((it, i) => {
              const err = itemError(it);
              return (
                <li key={it.key} className={styles.row}>
                  <div className={styles.rowHead}>
                    <span className={styles.n}>{i + 1}</span>
                    <span className={styles.rowName}>{it.name}</span>
                    <IconButton bare icon="arrowRight" className={styles.up} aria-label={`${it.name}: выше`} disabled={i === 0} onClick={() => patch({ items: moveItem(draft.items, i, i - 1) })} />
                    <IconButton bare icon="arrowRight" className={styles.down} aria-label={`${it.name}: ниже`} disabled={i === draft.items.length - 1} onClick={() => patch({ items: moveItem(draft.items, i, i + 1) })} />
                    <IconButton bare icon="close" aria-label={`Убрать «${it.name}»`} onClick={() => patch({ items: draft.items.filter((x) => x.key !== it.key) })} />
                  </div>
                  <div className={styles.secs}>
                    <span className={styles.secLabel}>Секунды</span>
                    <label className={styles.sec}>
                      от
                      <input inputMode="numeric" value={it.min} onChange={(e) => patchItem(it.key, { min: e.target.value })} />
                    </label>
                    <label className={styles.sec}>
                      до
                      <input inputMode="numeric" value={it.max} onChange={(e) => patchItem(it.key, { max: e.target.value })} />
                    </label>
                    <span>с</span>
                  </div>
                  {err && <Notice tone="error">{err}</Notice>}
                  <Checkbox label="Две стороны" hint="Упражнение идёт два раза" checked={it.sides} onChange={(e) => patchItem(it.key, { sides: e.target.checked })} />
                  {it.sides && (
                    <div className={styles.sides}>
                      <TextInput label="Первая сторона" value={it.sideA} onChange={(e) => patchItem(it.key, { sideA: e.target.value })} />
                      <TextInput label="Вторая сторона" value={it.sideB} onChange={(e) => patchItem(it.key, { sideB: e.target.value })} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <Button variant="secondary" icon="plus" fullWidth disabled={draft.items.length >= LIMITS.items} onClick={() => setPicker(true)}>
            Добавить из библиотеки
          </Button>
        </section>

          </>
        )}

        {!yamlMode && issues.length > 0 && (
          <div role="status" className={styles.problems}>
            <Text variant="caption">Чтобы сохранить:</Text>
            {issues.map((t) => (
              <span key={t}>· {t}</span>
            ))}
          </div>
        )}

        <Button fullWidth disabled={!ok} loading={busy} onClick={save}>
          {busy ? 'Сохраняем' : create ? 'Создать' : 'Сохранить'}
        </Button>

        {props.mode === 'edit' && (
          <section aria-labelledby="rf-del" className={styles.delete}>
            <Text variant="h5" tag="h2" id="rf-del">Удаление</Text>
            {usedIn === 0 ? (
              <>
                <Text variant="body-sm" color="slate">Ни одна тренировка её не использует, удаление ничего не сломает.</Text>
                <Button variant="danger-text" fullWidth disabled={busy} onClick={() => setConfirmDelete(true)}>Удалить</Button>
                <Dialog
                  open={confirmDelete}
                  onOpenChange={(o) => !busy && setConfirmDelete(o)}
                  title={`Удалить «${props.routine.title}»?`}
                  description="Это нельзя отменить."
                  confirmLabel="Удалить"
                  danger
                  loading={busy}
                  onConfirm={() => run(props.onDelete)}
                />
              </>
            ) : (
              <>
                <Button variant="danger-text" fullWidth disabled aria-describedby="rf-del-why">Удалить</Button>
                <p id="rf-del-why" className={styles.why}>
                  Удалить нельзя: {usedText(usedIn).toLowerCase()}. Сначала уберите её из тренировок.
                </p>
                {usedBy.length > 0 && (
                  <ul className={styles.errList}>
                    {usedBy.map((u) => (
                      <li key={u.workoutId}>{u.title}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        )}
      </div>

      <Sheet open={picker} onOpenChange={setPicker} title="Добавить из библиотеки" eyebrow="Только упражнения на время" tall>
        <SearchField label="Поиск по названию" placeholder="Название" value={pickerQuery} onValueChange={setPickerQuery} />
        {pickable.length === 0 ? (
          <Text variant="body-sm" color="slate">{timeOnly.length === 0 ? 'В библиотеке нет упражнений на время.' : 'Ничего не нашлось.'}</Text>
        ) : (
          <ul className={styles.pick}>
            {pickable.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    patch({ items: [...draft.items, newItem(e.id, e.name)] });
                    setPicker(false);
                    setPickerQuery('');
                  }}
                >
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
