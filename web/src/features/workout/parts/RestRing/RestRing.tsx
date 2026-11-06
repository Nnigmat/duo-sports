import { ProgressRing } from '../../../../ui/ProgressRing/ProgressRing';
import { Text } from '../../../../ui/Text/Text';
import { formatTime } from '../../flow';
import styles from './RestRing.module.css';

type Props = {
  /** Сколько отдыхаете, секунд: растёт и после цели */
  elapsed: number;
  /** Цель отдыха, секунд */
  goalSec: number;
  /** Цель достигнута: кольцо становится кнопкой «Начать» */
  reached: boolean;
  /** Доля кольца 0–1 */
  progress: number;
  onStart: () => void;
};

/** Кольцо отдыха 168 px: считает вверх до цели, затем заливается и зовёт начать подход. */
export function RestRing({ elapsed, goalSec, reached, progress, onStart }: Props) {
  const time = formatTime(Math.max(0, elapsed));

  if (reached) {
    return (
      <div className={styles.slot}>
        <button type="button" className={styles.over} onClick={onStart}>
          {/* Имя кнопки собирается из видимого текста: «отдыхаете 01:12 Начать» (WCAG 2.5.3) */}
          <span className={styles.overCaption}>отдыхаете</span>
          <span className={styles.time}>{time}</span>
          <span className={styles.start}>
            Начать
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5l11 6.5-11 6.5z" /></svg>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div role="timer" aria-label={`Отдых ${time} из ${formatTime(goalSec)}`} className={styles.slot}>
      <ProgressRing value={progress} color="accent" smoothing={250}>
        <Text variant="caption">отдых</Text>
        <span className={styles.time}>{time}</span>
        <Text variant="caption" className={styles.goal}>из {formatTime(goalSec)}</Text>
      </ProgressRing>
    </div>
  );
}
