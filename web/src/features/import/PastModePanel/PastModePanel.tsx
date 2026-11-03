import { Chip, Text } from '../../../ui';
import { plural } from '../../workout/flow/ru';
import { PAST_MODES, type PastMode } from '../importPlan';
import styles from './PastModePanel.module.css';

type Props = {
  past: PastMode;
  onPastChange: (past: PastMode) => void;
  /** «27 октября» — день первой тренировки файла */
  startLabel: string;
  /** Сколько тренировок файла уже в прошлом */
  pastCount: number;
};

/** Что делать с тренировками файла, дата которых уже прошла. Если таких нет, не показывается. */
export function PastModePanel({ past, onPastChange, startLabel, pastCount }: Props) {
  if (pastCount === 0) return null;
  return (
    <section className={styles.root} aria-label="Прошлые дни">
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
    </section>
  );
}
