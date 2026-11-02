import { useId } from 'react';
import { Chip, Text } from '../../../ui';
import { plural } from '../../workout/flow/ru';
import { PAST_MODES, type PastMode } from '../importPlan';
import styles from './PlanOptionsPanel.module.css';

type Props = {
  planOn: boolean;
  onPlanOnChange: (on: boolean) => void;
  past: PastMode;
  onPastChange: (past: PastMode) => void;
  /** «24 тренировки в календаре · 3 нояб — 21 янв» */
  summary: string;
  /** «27 октября» — день первой тренировки файла */
  startLabel: string;
  /** Сколько тренировок файла уже в прошлом */
  pastCount: number;
};

/** Переключатель «добавить в календарь» и, пока он включён, что делать с прошлыми днями. */
export function PlanOptionsPanel({ planOn, onPlanOnChange, past, onPastChange, summary, startLabel, pastCount }: Props) {
  const labelId = useId();
  return (
    <section className={styles.root} aria-label="Настройки плана">
      <div className={styles.switchRow}>
        <button
          type="button"
          role="switch"
          aria-checked={planOn}
          aria-labelledby={labelId}
          className={styles.switch}
          onClick={() => onPlanOnChange(!planOn)}
        >
          <span className={styles.track} aria-hidden="true">
            <span className={styles.knob} />
          </span>
        </button>
        <div className={styles.texts}>
          <Text variant="h5" tag="p" id={labelId}>
            Добавить тренировки в календарь по датам
          </Text>
          <Text variant="body-sm" color="slate" role="status">
            {summary}
          </Text>
        </div>
      </div>

      {planOn && pastCount > 0 && (
        <div className={styles.past}>
          <Text variant="body-sm">
            <b>План начинается {startLabel}</b> — {pastCount} {plural(pastCount, ['тренировка', 'тренировки', 'тренировок'])} уже в прошлом.
          </Text>
          <div className={styles.options} role="group" aria-label="Что делать с прошлыми днями">
            {PAST_MODES.map((m) => (
              <Chip key={m.id} pressed={past === m.id} onClick={() => onPastChange(m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
