import { useRef, useState } from 'react';
import type { ExerciseKind } from '../../../../../shared/types';
import { Button, Notice, SegmentedControl, Text, TextInput } from '../../../ui';
import { KIND_INFO, KINDS } from '../library';
import styles from './QuickExerciseForm.module.css';

type Props = {
  /** Подставляется из поиска */
  initialName: string;
  /** Получает обрезанное название; отказ — Error с текстом для показа */
  onCreate: (name: string, kind: ExerciseKind) => Promise<void>;
};

const KIND_OPTIONS = KINDS.map((value) => ({ value, label: KIND_INFO[value].name }));

/** Быстрое создание упражнения в окне выбора: название и тип. Мышцы и остальное правятся потом в «Упражнениях». */
export function QuickExerciseForm({ initialName, onCreate }: Props) {
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<ExerciseKind>('reps');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Состояние обновится только после рендера: второй клик в том же кадре держим по ref
  const pending = useRef(false);
  const trimmed = name.trim();

  const submit = async () => {
    if (!trimmed || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await onCreate(trimmed, kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не получилось создать упражнение');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <form
      className={styles.root}
      aria-label="Добавить упражнение"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Text variant="eyebrow">Добавить упражнение</Text>
      <Text variant="body-sm" color="slate">
        В библиотеке такого нет. Мышцы, инвентарь и видео можно добавить потом в «Упражнениях».
      </Text>
      <TextInput label="Название" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
      <SegmentedControl label="Тип" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" icon="plus" loading={busy} disabled={!trimmed}>
        Добавить
      </Button>
    </form>
  );
}
