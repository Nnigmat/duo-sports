import { useState } from 'react';
import type { ExerciseKind, SetPlan } from '../../../../../../shared/types';
import { Button } from '../../../../ui/Button/Button';
import { Checkbox } from '../../../../ui/Checkbox/Checkbox';
import { Sheet } from '../../../../ui/Sheet/Sheet';
import { Stepper } from '../../../../ui/Stepper/Stepper';
import { draftFromPlan, formatTarget, planFromDraft, type EditDraft } from '../../flow';
import styles from './EditSheet.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Надстрочник: «Подход 1 из 9 · круг 1» */
  eyebrow: string;
  /** Название упражнения */
  title: string;
  kind: ExerciseKind;
  plan: SetPlan;
  /** Подпись галочки: «Применить к следующим кругам» */
  applyLabel: string;
  /** Что заденет галочка: «Подходы 4 и 7». Без него применять не к чему, и галочки нет. */
  applyHint?: string;
  /** Сохранить план; apply — распространить на следующие подходы. Шторка закрывается сама. */
  onSave: (plan: SetPlan, apply: boolean) => void;
};

const WEIGHT_STEP_REPS = 2.5;
const WEIGHT_STEP_WEIGHT = 1;

export function EditSheet({ open, onOpenChange, eyebrow, title, kind, plan, applyLabel, applyHint, onSave }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} eyebrow={eyebrow} title={title}>
      {/* Форма монтируется заново при каждом открытии: черновик всегда начинается с плана */}
      <EditForm
        kind={kind}
        plan={plan}
        applyLabel={applyLabel}
        applyHint={applyHint}
        onSave={(next, apply) => {
          onSave(next, apply);
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}

type FormProps = Pick<Props, 'kind' | 'plan' | 'applyLabel' | 'applyHint'> & {
  onSave: (plan: SetPlan, apply: boolean) => void;
};

function EditForm({ kind, plan, applyLabel, applyHint, onSave }: FormProps) {
  const [draft, setDraft] = useState<EditDraft>(() => {
    const d = draftFromPlan(plan);
    // У упражнения «вес × повторы» вес есть всегда
    return kind === 'weight' ? { ...d, weight: d.weight ?? 0 } : d;
  });
  const [apply, setApply] = useState(false);
  const planHint = `План: ${formatTarget(kind, plan.target)}`;
  const setValue = (value: number) => setDraft((d) => ({ ...d, value }));
  const setWeight = (weight: number) => setDraft((d) => ({ ...d, weight }));

  return (
    <>
      {kind === 'time' && (
        <Stepper label="Время, мм:сс" mode="duration" value={draft.value} onChange={setValue} hint={planHint} />
      )}

      {kind === 'reps' && (
        <>
          <Stepper label="Повторения" value={draft.value} onChange={setValue} hint={planHint} decreaseLabel="Меньше повторений" increaseLabel="Больше повторений" />
          {draft.weight === undefined ? (
            <Button
              variant="ghost"
              compact
              icon="plus"
              className={styles.addWeight}
              onClick={() => setWeight(WEIGHT_STEP_REPS)}
            >
              Добавить вес
            </Button>
          ) : (
            <Stepper
              label="Доп. вес, кг"
              value={draft.weight}
              step={WEIGHT_STEP_REPS}
              onChange={setWeight}
              hint="Шаг 2,5 кг"
              decreaseLabel="Меньше вес"
              increaseLabel="Больше вес"
            />
          )}
        </>
      )}

      {kind === 'weight' && (
        <div className={styles.pair}>
          <Stepper
            label="Вес, кг"
            value={draft.weight ?? 0}
            step={WEIGHT_STEP_WEIGHT}
            onChange={setWeight}
            hint={`План: ${plan.weight ?? 0} · шаг 1 кг`}
            decreaseLabel="Меньше вес"
            increaseLabel="Больше вес"
          />
          <Stepper label="Повторения" value={draft.value} onChange={setValue} hint={planHint} decreaseLabel="Меньше повторений" increaseLabel="Больше повторений" />
        </div>
      )}

      {applyHint && (
        <Checkbox
          label={applyLabel}
          hint={applyHint}
          checked={apply}
          onChange={(e) => setApply(e.target.checked)}
        />
      )}

      <Button fullWidth onClick={() => onSave(planFromDraft(plan, draft), apply)}>
        Сохранить
      </Button>
    </>
  );
}
