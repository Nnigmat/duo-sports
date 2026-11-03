import { useState } from 'react';
import type { ExerciseDemo, Gender } from '../../../../../shared/types';
import { Button, Dialog, Notice, Text, TopBar } from '../../../ui';
import { canSubmit, draftFromExercise, emptyDraft } from '../library';
import type { ExerciseDraft, LibraryExercise } from '../types';
import { DemoSlot } from './DemoSlot/DemoSlot';
import { ExerciseForm } from './ExerciseForm';
import styles from './ExerciseFormScreen.module.css';

/** Обработчик может быть асинхронным: пока он выполняется, кнопка занята, а отказ показывается на экране */
type Submit = (draft: ExerciseDraft) => void | Promise<void>;

/** Ролики чибика грузятся сразу по выбору файла, отдельно от «Сохранить»; обработчик возвращает актуальные ролики */
export type DemoActions = {
  onUpload: (gender: Gender, file: File) => Promise<ExerciseDemo>;
  onRemove: (gender: Gender) => Promise<ExerciseDemo>;
};

type Props =
  | { mode: 'create'; onCancel: () => void; onSubmit: Submit; exercise?: undefined; onDelete?: undefined; demo?: undefined }
  | { mode: 'edit'; exercise: LibraryExercise; onCancel: () => void; onSubmit: Submit; onDelete?: () => void | Promise<void>; demo?: DemoActions };

const SLOTS: Array<{ gender: Gender; label: string }> = [
  { gender: 'female', label: 'Девочка' },
  { gender: 'male', label: 'Мальчик' },
];

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
  const [demo, setDemo] = useState<ExerciseDemo>(props.exercise?.demo ?? {});
  const [demoBusy, setDemoBusy] = useState<Gender | null>(null);
  const [demoError, setDemoError] = useState<{ gender: Gender; text: string } | null>(null);
  const ok = canSubmit(draft);

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

  async function changeDemo(gender: Gender, action: () => Promise<ExerciseDemo>) {
    setDemoBusy(gender);
    setDemoError(null);
    try {
      setDemo(await action());
    } catch (e) {
      setDemoError({ gender, text: messageOf(e) });
    } finally {
      setDemoBusy(null);
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

        <section aria-labelledby="demo-title" className={styles.video}>
          <Text variant="h5" tag="h2" id="demo-title">Видео техники</Text>
          <Text variant="caption" tag="p">
            {props.demo
              ? 'Ролик с чибиком: спортсмен увидит тот, что подходит его полу. Необязательно.'
              : 'Видео можно добавить после создания упражнения.'}
          </Text>
          <div className={styles.slots}>
            {SLOTS.map(({ gender, label }) => (
              <DemoSlot
                key={gender}
                label={label}
                src={demo[gender] ? `/api/demo/${demo[gender]}` : undefined}
                busy={demoBusy === gender}
                disabled={!props.demo || (demoBusy !== null && demoBusy !== gender)}
                error={demoError?.gender === gender ? demoError.text : undefined}
                onPick={(file) => props.demo && changeDemo(gender, () => props.demo!.onUpload(gender, file))}
                onRemove={() => props.demo && changeDemo(gender, () => props.demo!.onRemove(gender))}
              />
            ))}
          </div>
        </section>

        <ExerciseForm
          draft={draft}
          onChange={setDraft}
          showGroupHint={create}
          kindChanged={!create && !!props.exercise && draft.kind !== props.exercise.kind}
          name={create ? 'new-kind' : 'edit-kind'}
        />

        <Button fullWidth disabled={!ok} loading={busy} onClick={() => run(() => onSubmit(draft))}>
          {busy ? 'Сохраняем' : create ? 'Создать' : 'Сохранить'}
        </Button>

        {props.onDelete && (
          <>
            <Button variant="danger-text" fullWidth disabled={busy} onClick={() => setConfirmDelete(true)}>
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
