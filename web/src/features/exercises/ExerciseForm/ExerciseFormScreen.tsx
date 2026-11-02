import { useState } from 'react';
import { Button, Dialog, Icon, Notice, Text, TopBar } from '../../../ui';
import { canSubmit, videoError, draftFromExercise, emptyDraft } from '../library';
import type { ExerciseDraft, LibraryExercise } from '../types';
import { ExerciseForm } from './ExerciseForm';
import styles from './ExerciseFormScreen.module.css';

/** Обработчик может быть асинхронным: пока он выполняется, кнопка занята, а отказ показывается на экране */
type Submit = (draft: ExerciseDraft) => void | Promise<void>;

type Props =
  | { mode: 'create'; onCancel: () => void; onSubmit: Submit; exercise?: undefined; onDelete?: undefined }
  | { mode: 'edit'; exercise: LibraryExercise; onCancel: () => void; onSubmit: Submit; onDelete?: () => void | Promise<void> };

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Не удалось сохранить. Попробуйте ещё раз';
}

/** Экран формы: «Новое упражнение» или «Редактирование упражнения». Хранит черновик у себя; при ошибке остаётся открытым. */
export function ExerciseFormScreen(props: Props) {
  const { mode, onCancel, onSubmit } = props;
  const create = mode === 'create';
  const [draft, setDraft] = useState<ExerciseDraft>(() => (props.exercise ? draftFromExercise(props.exercise) : emptyDraft()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ok = canSubmit(draft) && !videoError(draft);

  async function run(action: () => void | Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(messageOf(e));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.root}>
      <TopBar
        start={<Button variant="ghost" compact disabled={busy} onClick={onCancel}>Отмена</Button>}
        end={
          <Button variant="ghost" compact disabled={!ok} loading={busy} onClick={() => run(() => onSubmit(draft))}>
            {busy ? 'Сохраняем' : create ? 'Создать' : 'Сохранить'}
          </Button>
        }
      />
      <div className={styles.body}>
        {create ? (
          <div className={styles.intro}>
            <Text variant="h3" tag="h1">Новое упражнение</Text>
            <Text variant="body-sm" color="slate">Оно появится в списке и в выборе упражнений для тренировки.</Text>
          </div>
        ) : (
          <Text variant="h3" tag="h1">Редактирование упражнения</Text>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className={styles.video}>
          <Icon name="video" />
          <Text variant="body-sm" tag="p">Видео техники</Text>
          <Text variant="caption">Необязательно, можно добавить позже</Text>
          <Button variant="secondary" compact icon="upload">Добавить видео</Button>
        </div>

        <ExerciseForm
          draft={draft}
          onChange={setDraft}
          showGroupHint={create}
          kindChanged={!create && !!props.exercise && draft.kind !== props.exercise.kind}
          name={create ? 'new-kind' : 'edit-kind'}
        />

        {props.onDelete && (
          <>
            <Button variant="danger" fullWidth disabled={busy} onClick={() => setConfirmDelete(true)}>
              Удалить упражнение
            </Button>
            <Dialog
              open={confirmDelete}
              onOpenChange={(o) => !busy && setConfirmDelete(o)}
              title="Удалить упражнение?"
              description="Оно пропадёт из библиотеки для всех. Это нельзя отменить."
              confirmLabel="Удалить"
              danger
              loading={busy}
              onConfirm={() => run(props.onDelete!)}
            />
          </>
        )}
      </div>
    </div>
  );
}
