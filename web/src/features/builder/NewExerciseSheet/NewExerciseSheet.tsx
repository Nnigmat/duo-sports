import { useEffect, useState } from 'react';
import type { ExerciseKind } from '../../../../../shared/types';
import { Button, ChoiceCard, Sheet, TextArea, TextInput } from '../../../ui';
import type { NewExerciseDraft } from '../types';
import styles from './NewExerciseSheet.module.css';

type Props = {
  exercise: NewExerciseDraft | null;
  onChange: (patch: Partial<NewExerciseDraft>) => void;
  onUseSimilar: () => void;
  onRemove: () => void;
  onClose: () => void;
};

const KINDS: Array<{ value: ExerciseKind; title: string }> = [
  { value: 'reps', title: 'Повторы' },
  { value: 'weight', title: 'Вес' },
  { value: 'time', title: 'Время' },
];

const list = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * Поля нового упражнения, заполненные агентом. Название, мышцы и инвентарь правятся текстом и уходят
 * наверх по «Готово» или при закрытии: название — ключ упражнения в черновике, его не меняем на каждую букву.
 */
export function NewExerciseSheet({ exercise, onChange, onUseSimilar, onRemove, onClose }: Props) {
  const [name, setName] = useState('');
  const [muscles, setMuscles] = useState('');
  const [equipment, setEquipment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slug = exercise?.slug;
  const open = exercise !== null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: поля заполняются заново только при открытии панели или другого упражнения, не на каждую правку
  useEffect(() => {
    if (!exercise) return;
    setName(exercise.name);
    setMuscles(exercise.muscles.join(', '));
    setEquipment(exercise.equipment.join(', '));
    setError(null);
  }, [slug, open]);

  function finish() {
    if (!exercise) return;
    const clean = name.trim();
    if (!clean) return setError('Введите название');
    onChange({ ...(clean !== exercise.name ? { name: clean } : {}), muscles: list(muscles), equipment: list(equipment) });
    onClose();
  }

  return (
    <Sheet open={exercise !== null} onOpenChange={(open) => !open && finish()} title="Новое упражнение" tall>
      {exercise && (
        <div className={styles.form}>
          <TextInput
            label="Название"
            value={name}
            maxLength={200}
            error={error ?? undefined}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
          <TextInput label="Мышцы" hint="Через запятую: грудь, трицепс" value={muscles} onChange={(e) => setMuscles(e.target.value)} />
          <fieldset className={styles.kinds}>
            <legend className={styles.legend}>Как считать</legend>
            {KINDS.map((k) => (
              <ChoiceCard key={k.value} name={`kind-${exercise.slug}`} value={k.value} title={k.title} checked={exercise.kind === k.value} onChange={() => onChange({ kind: k.value })} />
            ))}
          </fieldset>
          <TextInput label="Инвентарь" hint="Через запятую; пусто — без снаряда" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          <TextArea label="Техника" rows={3} value={exercise.notes} onChange={(e) => onChange({ notes: e.target.value })} />
          <div className={styles.actions}>
            <Button fullWidth onClick={finish}>
              Готово
            </Button>
            {exercise.similar && (
              <Button variant="secondary" fullWidth onClick={onUseSimilar}>
                {`Использовать похожее: ${exercise.similar}`}
              </Button>
            )}
            <Button variant="danger-text" fullWidth onClick={onRemove}>
              Убрать из тренировки
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
