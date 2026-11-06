import { useState } from 'react';
import type { ExerciseKind, SetActual, SetPlan } from '../../../../../../shared/types';
import { Button } from '../../../../ui/Button/Button';
import { Checkbox } from '../../../../ui/Checkbox/Checkbox';
import { Sheet } from '../../../../ui/Sheet/Sheet';
import { Stepper } from '../../../../ui/Stepper/Stepper';
import { Text } from '../../../../ui/Text/Text';
import { factDraft, factFromDraft, factLabel, formatTarget, type FactDraft } from '../../flow';
import styles from './ResultSheet.module.css';

type Props = {
  open: boolean;
  /** Крестик, Esc и тап на фон закрывают шторку, ничего не сохраняя */
  onOpenChange: (open: boolean) => void;
  /** Надстрочник: «Подход 1 из 9» */
  eyebrow: string;
  kind: ExerciseKind;
  plan: SetPlan;
  /** Уже введённый факт этого подхода (после «Назад»): шторка открывается с ним */
  actual?: SetActual | null;
  /** «Записать»: шторка закрывается сама */
  onSave: (actual: SetActual) => void;
};

const TITLES: Record<ExerciseKind, string> = {
  reps: 'Сколько повторений сделали?',
  weight: 'Сколько сделали?',
  time: 'Сколько продержались?',
};

const WEIGHT_STEP = 1;
const LABEL_STATE = { 'Меньше плана': 'below', 'В плане': 'within', 'Больше плана': 'above' } as const;

/** Шторка после «Готово»: сколько спортсмен реально сделал. План подхода она не меняет. */
export function ResultSheet({ open, onOpenChange, eyebrow, kind, plan, actual, onSave }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} eyebrow={eyebrow} title={TITLES[kind]}>
      {/* Форма монтируется заново при каждом открытии: черновик начинается с факта или плана */}
      <ResultForm
        kind={kind}
        plan={plan}
        actual={actual}
        onSave={(next) => {
          onSave(next);
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}

function ResultForm({ kind, plan, actual, onSave }: Pick<Props, 'kind' | 'plan' | 'actual' | 'onSave'>) {
  const [draft, setDraft] = useState<FactDraft>(() => factDraft(kind, plan, actual));
  const label = factLabel(plan, draft.value);
  const planHint = `План: ${formatTarget(kind, plan.target)}`;
  const setValue = (value: number) => setDraft((d) => ({ ...d, value }));

  return (
    <>
      {kind === 'time' ? (
        <Stepper label="Время, мм:сс" mode="duration" value={draft.value} onChange={setValue} hint={planHint} />
      ) : (
        <Stepper
          label="Повторения"
          value={draft.value}
          onChange={setValue}
          hint={planHint}
          decreaseLabel="Меньше повторений"
          increaseLabel="Больше повторений"
        />
      )}

      {kind === 'weight' && (
        <Stepper
          label="Вес, кг"
          value={draft.weight ?? 0}
          step={WEIGHT_STEP}
          onChange={(weight) => setDraft((d) => ({ ...d, weight }))}
          hint={`План: ${plan.weight ?? 0} кг · шаг ${WEIGHT_STEP} кг`}
          decreaseLabel="Меньше вес"
          increaseLabel="Больше вес"
        />
      )}

      {/* Статус только текстом: цвет лишь усиливает, он не единственный признак */}
      <Text variant="body-sm" tag="p" className={styles.label} data-state={LABEL_STATE[label]} role="status">
        {label}
      </Text>

      <Checkbox
        label="Был доп. вес"
        checked={draft.extraWeight}
        onChange={(e) => setDraft((d) => ({ ...d, extraWeight: e.target.checked }))}
      />

      <Button fullWidth onClick={() => onSave(factFromDraft(draft))}>
        Записать
      </Button>
    </>
  );
}
