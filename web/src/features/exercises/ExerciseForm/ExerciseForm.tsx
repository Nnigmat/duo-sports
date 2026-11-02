import { Chip, ChipGroup, ChoiceCard, ParamStepper, Text, TextArea, TextInput } from '../../../ui';
import { EQUIPMENT_OPTIONS, groupHint, KIND_INFO, KINDS, MUSCLE_OPTIONS, paramFields, toggleItem, videoError } from '../library';
import type { ExerciseDraft } from '../types';
import styles from './ExerciseForm.module.css';

type Props = {
  draft: ExerciseDraft;
  onChange: (draft: ExerciseDraft) => void;
  /** Показывать, в какой раздел попадёт упражнение (при создании) */
  showGroupHint?: boolean;
  /** Тип поменяли у существующего упражнения: предупреждаем про историю */
  kindChanged?: boolean;
  /** Префикс имён radio, чтобы формы на одной странице не пересекались */
  name?: string;
};

/** Поля упражнения: название, тип, параметры по умолчанию, мышцы, снаряд. Общая для создания и редактирования. */
export function ExerciseForm({ draft, onChange, showGroupHint, kindChanged, name = 'kind' }: Props) {
  const set = (patch: Partial<ExerciseDraft>) => onChange({ ...draft, ...patch });
  // Мышцы и снаряд, которых нет в справочнике (старые записи), остаются выбранными и видимыми
  const muscles = [...MUSCLE_OPTIONS, ...draft.muscles.filter((m) => !MUSCLE_OPTIONS.includes(m))];
  const equipment = draft.equipment && !EQUIPMENT_OPTIONS.includes(draft.equipment) ? [...EQUIPMENT_OPTIONS, draft.equipment] : EQUIPMENT_OPTIONS;

  return (
    <div className={styles.form}>
      <TextInput
        label="Название"
        placeholder="Например, болгарские выпады"
        value={draft.name}
        onChange={(e) => set({ name: e.target.value })}
      />

      <TextArea
        label="Как выполнять"
        hint="Один шаг на строку"
        placeholder="Встаньте прямо, стопы на ширине плеч"
        value={draft.notes}
        onChange={(e) => set({ notes: e.target.value })}
      />

      <TextInput
        label="Ссылка на видео"
        type="url"
        inputMode="url"
        placeholder="https://"
        value={draft.video}
        error={videoError(draft)}
        onChange={(e) => set({ video: e.target.value })}
      />

      <div role="radiogroup" aria-labelledby={`${name}-label`} className={styles.block}>
        <Text variant="body-sm" color="slate" id={`${name}-label`}>Тип упражнения</Text>
        {KINDS.map((k) => (
          <ChoiceCard
            key={k}
            name={name}
            value={k}
            checked={draft.kind === k}
            onChange={() => set({ kind: k })}
            icon={KIND_INFO[k].icon}
            title={KIND_INFO[k].name}
            description={KIND_INFO[k].hint}
          />
        ))}
        {kindChanged && (
          <Text variant="caption" color="slate">
            Прошлые подходы сохранятся как есть, новые будут записываться по новому типу.
          </Text>
        )}
      </div>

      <div role="group" aria-labelledby={`${name}-params`} className={styles.block}>
        <div>
          <Text variant="body-sm" color="slate" id={`${name}-params`}>Параметры по умолчанию</Text>
          <Text variant="caption">Подставятся, когда упражнение добавят в тренировку. В самой тренировке их можно поменять.</Text>
        </div>
        {paramFields(draft.kind).map((f) => (
          <ParamStepper
            key={f.key}
            label={f.label}
            unit={f.unit}
            mode={f.mode}
            step={f.step}
            min={f.min}
            max={f.max}
            value={draft.params[f.key]}
            onChange={(v) => set({ params: { ...draft.params, [f.key]: v } })}
          />
        ))}
      </div>

      <div className={styles.block}>
        <Text variant="body-sm" color="slate" aria-hidden="true">Мышцы · можно выбрать несколько</Text>
        <ChipGroup label="Мышцы, можно выбрать несколько">
          {muscles.map((m) => (
            <Chip key={m} pressed={draft.muscles.includes(m)} onClick={() => set({ muscles: toggleItem(draft.muscles, m) })}>
              {m}
            </Chip>
          ))}
        </ChipGroup>
        {showGroupHint && <Text variant="caption">{groupHint(draft.muscles)}</Text>}
      </div>

      <div className={styles.block}>
        <Text variant="body-sm" color="slate" aria-hidden="true">Снаряд</Text>
        <ChipGroup label="Снаряд">
          {equipment.map((e) => (
            <Chip key={e} pressed={draft.equipment === e} onClick={() => set({ equipment: draft.equipment === e ? '' : e })}>
              {e}
            </Chip>
          ))}
        </ChipGroup>
      </div>
    </div>
  );
}
