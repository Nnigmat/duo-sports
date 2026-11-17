import { useMemo, useState } from 'react';
import { Button, Card, Text } from '../../../ui';
import type { LibraryExercise } from '../../exercises/types';
import type { ParseContext } from '../../import/parse';
import { WorkoutEditView } from '../../trainer/WorkoutEditPage/WorkoutEditView';
import { AdviceList } from '../AdviceList/AdviceList';
import {
  applyAdvice, createExercise, dismissAdvice, moveRoutineItem, patchNewExercise, patchRoutineItem, pruneNew, removeNew, removeRoutineItem, renameRoutine, replaceExercise, setRoutine,
} from '../draftOps';
import { NewExerciseSheet } from '../NewExerciseSheet/NewExerciseSheet';
import { NewRoutineCard } from '../NewRoutineCard/NewRoutineCard';
import type { BuilderDraft, RoutinePick } from '../types';
import styles from './BuilderReviewView.module.css';

type Props = {
  draft: BuilderDraft;
  library: LibraryExercise[];
  routines: ParseContext['routines'];
  saving: boolean;
  /** Что мешает сохранить (draftToCommit) */
  problems: string[];
  failure: string | null;
  onDraft: (d: BuilderDraft) => void;
  onSave: () => void;
  onRebuild: () => void;
};

/** Проверка собранной тренировки: форма редактора с новыми упражнениями, новой разминкой и заметками агента. */
export function BuilderReviewView({ draft, library, routines, saving, problems, failure, onDraft, onSave, onRebuild }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const newNames = useMemo(() => new Set(draft.newExercises.map((e) => e.name)), [draft.newExercises]);
  const opened = open ? (draft.newExercises.find((e) => e.name === open) ?? null) : null;

  const slot = (which: 'warmup' | 'cooldown', pick: RoutinePick) => {
    const label = which === 'warmup' ? 'Разминка' : 'Заминка';
    if (pick.kind === 'new')
      return (
        <NewRoutineCard
          label={label}
          pick={pick}
          onRename={(t) => onDraft(renameRoutine(draft, which, t))}
          onSec={(i, sec) => onDraft(patchRoutineItem(draft, which, i, sec))}
          onMove={(i, d) => onDraft(moveRoutineItem(draft, which, i, d))}
          onRemove={(i) => onDraft(removeRoutineItem(draft, which, i))}
          onDrop={() => onDraft(pruneNew(setRoutine(draft, which, { kind: 'none' })))}
        />
      );
    if (pick.kind === 'library') {
      const title = routines.find((r) => r.id === pick.slug)?.title ?? pick.slug;
      return (
        <div className={styles.routine}>
          <span>{`${label}: ${title}`}</span>
          <Text variant="caption">Из библиотеки</Text>
        </div>
      );
    }
    return undefined;
  };

  const top = (
    <>
      {confirm && (
        <Card tone="surface" role="region" aria-label="Пересобрать тренировку" className={styles.confirm}>
          <Text variant="body">Правки формы пропадут</Text>
          <Text variant="body-sm" color="slate">
            Агент соберёт тренировку заново по тому же вводу.
          </Text>
          <div className={styles.confirmActions}>
            <Button compact onClick={onRebuild}>
              Пересобрать
            </Button>
            <Button variant="secondary" compact onClick={() => setConfirm(false)}>
              Остаться
            </Button>
          </div>
        </Card>
      )}
      <AdviceList advice={draft.advice} onApply={(id) => onDraft(applyAdvice(draft, id, library))} onDismiss={(id) => onDraft(dismissAdvice(draft, id))} />
    </>
  );

  return (
    <>
      <WorkoutEditView
        mode="create"
        title={draft.title}
        blocks={draft.blocks}
        library={library}
        saving={saving}
        issues={problems}
        failure={failure}
        onTitle={(title) => onDraft({ ...draft, title })}
        onBlocks={(blocks) => onDraft(pruneNew({ ...draft, blocks }))}
        onSave={onSave}
        onCancel={() => setConfirm(true)}
        cancelLabel="Пересобрать"
        newNames={newNames}
        onOpenNew={setOpen}
        onCreateExercise={(blockId, name) => {
          onDraft(createExercise(draft, blockId, name));
          setOpen(name.trim());
        }}
        topSlot={top}
        warmupSlot={slot('warmup', draft.warmup)}
        cooldownSlot={slot('cooldown', draft.cooldown)}
      />
      <NewExerciseSheet
        exercise={opened}
        onChange={(patch) => {
          if (!opened) return;
          onDraft(patchNewExercise(draft, opened.name, patch));
          if (patch.name) setOpen(patch.name);
        }}
        onUseSimilar={() => {
          const to = library.find((l) => l.name === opened?.similar);
          if (opened && to) onDraft(replaceExercise(draft, opened.name, to));
          setOpen(null);
        }}
        onRemove={() => {
          if (opened) onDraft(removeNew(draft, opened.name));
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
