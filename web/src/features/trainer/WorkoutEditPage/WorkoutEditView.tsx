import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Block, Exercise, SetsExercise, Workout } from '../../../../../shared/types';
import { Button, Card, Chip, IconButton, Notice, ParamStepper, SearchField, SegmentedControl, Sheet, Text, TextArea, TextInput } from '../../../ui';
import type { ParseIssue } from '../../import/parse';
import type { LibraryExercise } from '../../exercises/types';
import {
  MODE_LABELS, addBlock, addExercise, changeMode, moveBlock, moveExercise, patchExercise, removeBlock, removeExercise, renameBlock, roundsOf, setRest, setRounds, setTarget,
  toggleVideoRound, type BlockMode,
} from './draft';
import styles from './WorkoutEditView.module.css';

export type EditView = 'form' | 'yaml';

const VIEWS: Array<{ value: EditView; label: string }> = [
  { value: 'form', label: 'Форма' },
  { value: 'yaml', label: 'YAML' },
];

/** Текст режима YAML и то, что в нём не разобралось */
export type YamlState = { text: string; issues: ParseIssue[]; onText: (text: string) => void };

type Props = {
  view: EditView;
  yaml: YamlState;
  onView: (view: EditView) => void;
  title: string;
  blocks: Block[];
  /** Подключённые разминка и заминка: показываются строками и здесь не меняются */
  routines?: Workout['routines'];
  library: LibraryExercise[];
  saving: boolean;
  /** Что мешает сохранить; показывается после первой попытки */
  issues: string[];
  failure: string | null;
  onTitle: (title: string) => void;
  onBlocks: (blocks: Block[]) => void;
  onSave: () => void;
  onCancel: () => void;
};

const MODES = (Object.keys(MODE_LABELS) as BlockMode[]).map((value) => ({ value, label: MODE_LABELS[value] }));

/** Редактор тренировки ученика: название, блоки и упражнения в них. Сохраняет страница. */
export function WorkoutEditView({ view, yaml, onView, title, blocks, routines, library, saving, issues, failure, onTitle, onBlocks, onSave, onCancel }: Props) {
  const [pickFor, setPickFor] = useState<string | null>(null);
  const change = (fn: (b: Block[]) => Block[]) => onBlocks(fn(blocks));

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <Button variant="ghost" compact icon="back" onClick={onCancel}>
          Отмена
        </Button>
        <Button compact loading={saving} onClick={onSave}>
          Сохранить
        </Button>
      </div>
      <Text variant="h2" tag="h1">
        Состав тренировки
      </Text>
      <Notice tone="info">Изменения увидят все дни плана с этой тренировкой. Выполненные занятия остаются как были.</Notice>
      <SegmentedControl label="Как править" options={VIEWS} value={view} onChange={onView} />
      {failure && <Notice tone="error">{failure}</Notice>}
      {issues.length > 0 && (
        <Notice tone="warn">
          <ul className={styles.issues}>
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Notice>
      )}

      {view === 'yaml' ? (
        <>
          {yaml.issues.length > 0 && (
            <Notice tone="error">
              <ul className={styles.issues}>
                {yaml.issues.map((i) => (
                  <li key={`${i.line ?? 0}${i.message}`}>
                    {i.line ? `Строка ${i.line}: ` : ''}
                    {i.message}
                    {i.hint ? `. ${i.hint}` : ''}
                  </li>
                ))}
              </ul>
            </Notice>
          )}
          <TextArea
            label="Тренировка в YAML"
            hint="Формат тот же, что в импорте. В блок можно дописать title и video_rounds."
            value={yaml.text}
            rows={24}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={styles.yaml}
            onChange={(e) => yaml.onText(e.target.value)}
          />
        </>
      ) : (
        <>
      <TextInput label="Название тренировки" value={title} maxLength={200} onChange={(e) => onTitle(e.target.value)} />

      {routines?.warmup && <RoutineLink label="Разминка" routine={routines.warmup} />}

      {blocks.map((b, i) => (
        <Card key={b.id} tone="surface" className={styles.block} aria-label={`Блок ${i + 1}`}>
          <div className={styles.blockHead}>
            <TextInput label={`Название блока ${i + 1}`} value={b.title} maxLength={200} onChange={(e) => change((x) => renameBlock(x, b.id, e.target.value))} />
            <div className={styles.tools}>
              <IconButton bare icon="back" aria-label="Блок выше" disabled={i === 0} onClick={() => change((x) => moveBlock(x, b.id, -1))} className={styles.up} />
              <IconButton bare icon="back" aria-label="Блок ниже" disabled={i === blocks.length - 1} onClick={() => change((x) => moveBlock(x, b.id, 1))} className={styles.down} />
              <IconButton bare icon="close" aria-label={`Удалить блок «${b.title}»`} onClick={() => change((x) => removeBlock(x, b.id))} />
            </div>
          </div>

          <SegmentedControl label="Режим блока" options={MODES} value={b.mode} onChange={(m) => change((x) => changeMode(x, b.id, m))} />

          {b.mode !== 'timed' && (
            <ParamStepper label="Отдых" unit="с" mode="duration" step={15} min={0} max={3600} value={b.restSec} onChange={(v) => change((x) => setRest(x, b.id, v))} />
          )}
          {b.mode === 'circuit' && <ParamStepper label="Круги" unit="" min={1} max={100} value={b.rounds} onChange={(v) => change((x) => setRounds(x, b.id, v))} />}

          <ul className={styles.list}>
            {b.exercises.map((e, j) => (
              <ExerciseRow
                key={e.id}
                mode={b.mode}
                exercise={e as SetsExercise}
                first={j === 0}
                last={j === b.exercises.length - 1}
                onPatch={(patch) => change((x) => patchExercise(x, b.id, e.id, patch))}
                onTarget={(edge, v) => change((x) => setTarget(x, b.id, e.id, edge, v))}
                onMove={(d) => change((x) => moveExercise(x, b.id, e.id, d))}
                onRemove={() => change((x) => removeExercise(x, b.id, e.id))}
              />
            ))}
          </ul>
          <Button variant="secondary" compact icon="plus" onClick={() => setPickFor(b.id)}>
            Добавить упражнение
          </Button>

          {b.mode !== 'timed' && roundsOf(b) > 0 && (
            <fieldset className={styles.video}>
              <legend>{b.mode === 'circuit' ? 'Круги для видеозаписи' : 'Подходы для видеозаписи'}</legend>
              <div className={styles.chips}>
                {Array.from({ length: roundsOf(b) }, (_, k) => k + 1).map((n) => (
                  <Chip key={n} pressed={b.videoRounds.includes(n)} onClick={() => change((x) => toggleVideoRound(x, b.id, n))}>
                    {n}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}
        </Card>
      ))}

      {routines?.cooldown && <RoutineLink label="Заминка" routine={routines.cooldown} />}

      <section className={styles.addBlock} aria-label="Добавить блок">
        <Text variant="eyebrow">Добавить блок</Text>
        <div className={styles.chips}>
          {MODES.map((m) => (
            <Button key={m.value} variant="secondary" compact icon="plus" onClick={() => change((x) => addBlock(x, m.value))}>
              {m.label}
            </Button>
          ))}
        </div>
      </section>
        </>
      )}

      <PickerSheet
        open={pickFor !== null}
        library={library}
        onClose={() => setPickFor(null)}
        onPick={(ex) => {
          if (pickFor) change((x) => addExercise(x, pickFor, ex));
          setPickFor(null);
        }}
      />
    </div>
  );
}

/** Подключённая ссылкой разминка или заминка: открывает её карточку */
function RoutineLink({ label, routine }: { label: string; routine: { id: string; title: string } }) {
  return (
    <Link to={`/routines/${encodeURIComponent(routine.id)}`} className={styles.routineLink}>
      <span>
        <span className={styles.routineLabel}>{label}:</span> <strong>{routine.title}</strong>
      </span>
      <span className={styles.routineHint}>Подключена ссылкой</span>
    </Link>
  );
}

type RowProps = {
  mode: BlockMode;
  exercise: SetsExercise;
  first: boolean;
  last: boolean;
  onPatch: (patch: Partial<SetsExercise>) => void;
  onTarget: (edge: 'min' | 'max', value: number) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
};

function ExerciseRow({ mode, exercise: e, first, last, onPatch, onTarget, onMove, onRemove }: RowProps) {
  const time = e.kind === 'time';
  const unit = time ? 'с' : 'повт';
  return (
    <li className={styles.exercise}>
      <div className={styles.exerciseHead}>
        <Text variant="body" className={styles.name}>
          {e.name}
        </Text>
        <IconButton bare icon="back" aria-label={`${e.name}: выше`} disabled={first} onClick={() => onMove(-1)} className={styles.up} />
        <IconButton bare icon="back" aria-label={`${e.name}: ниже`} disabled={last} onClick={() => onMove(1)} className={styles.down} />
        <IconButton bare icon="close" aria-label={`Убрать «${e.name}»`} onClick={onRemove} />
      </div>
      {mode === 'sets' && <ParamStepper label="Подходы" unit="" min={1} max={100} value={e.sets} onChange={(v) => onPatch({ sets: v })} />}
      <ParamStepper label={time ? 'Время от' : 'Повторы от'} unit={unit} mode={time ? 'duration' : 'number'} min={0} max={86_400} value={e.target.min} onChange={(v) => onTarget('min', v)} />
      <ParamStepper label={time ? 'Время до' : 'Повторы до'} unit={unit} mode={time ? 'duration' : 'number'} min={0} max={86_400} value={e.target.max} onChange={(v) => onTarget('max', v)} />
      {e.kind === 'weight' && <ParamStepper label="Вес" unit="кг" step={2.5} min={0} max={1000} value={e.weight ?? 0} onChange={(v) => onPatch({ weight: v } as Partial<Exercise>)} />}
    </li>
  );
}

function PickerSheet({ open, library, onClose, onPick }: { open: boolean; library: LibraryExercise[]; onClose: () => void; onPick: (ex: LibraryExercise) => void }) {
  const [q, setQ] = useState('');
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return library;
    return library.filter((x) => x.name.toLowerCase().includes(needle) || (x.aliases ?? []).some((a) => a.toLowerCase().includes(needle)));
  }, [library, q]);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Упражнение" tall>
      <SearchField label="Поиск упражнения" placeholder="Название" value={q} onValueChange={setQ} />
      {found.length === 0 ? (
        <p className={styles.empty}>Ничего не нашлось. Новые упражнения добавляются в разделе «Упражнения».</p>
      ) : (
        <ul className={styles.picker}>
          {found.map((x) => (
            <li key={x.id}>
              <button type="button" className={styles.pick} onClick={() => onPick(x)}>
                {x.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
