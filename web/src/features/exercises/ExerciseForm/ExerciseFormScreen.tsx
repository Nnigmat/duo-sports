import { useState } from 'react';
import { Button, Icon, Text, TopBar } from '../../../ui';
import { canSubmit, draftFromExercise, emptyDraft } from '../library';
import type { ExerciseDraft, LibraryExercise } from '../types';
import { ExerciseForm } from './ExerciseForm';
import styles from './ExerciseFormScreen.module.css';

type Props =
  | { mode: 'create'; onCancel: () => void; onSubmit: (draft: ExerciseDraft) => void; exercise?: undefined }
  | { mode: 'edit'; exercise: LibraryExercise; onCancel: () => void; onSubmit: (draft: ExerciseDraft) => void };

/** Экран формы: «Новое упражнение» или «Редактирование упражнения». Хранит черновик у себя. */
export function ExerciseFormScreen(props: Props) {
  const { mode, onCancel, onSubmit } = props;
  const create = mode === 'create';
  const [draft, setDraft] = useState<ExerciseDraft>(() => (props.exercise ? draftFromExercise(props.exercise) : emptyDraft()));
  const ok = canSubmit(draft);

  return (
    <div className={styles.root}>
      <TopBar
        start={<Button variant="ghost" compact onClick={onCancel}>Отмена</Button>}
        end={
          <Button variant="ghost" compact disabled={!ok} onClick={() => onSubmit(draft)}>
            {create ? 'Создать' : 'Сохранить'}
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
      </div>
    </div>
  );
}
