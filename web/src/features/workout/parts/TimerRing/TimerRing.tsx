import { cx } from '../../../../ui/cx';
import { ProgressRing } from '../../../../ui/ProgressRing/ProgressRing';
import { Text } from '../../../../ui/Text/Text';
import { formatTime } from '../../flow';
import styles from './TimerRing.module.css';

type Props = {
  /** Осталось, секунд */
  seconds: number;
  /** Всего на этот отсчёт, секунд */
  total: number;
  paused?: boolean;
  /** Оранжевое кольцо: отсчёт перед стартом и последние секунды */
  alert?: boolean;
  /** Подпись под временем вместо «осталось» («старт через», «финиш через») */
  caption?: string;
  /** Время вышло: кольцо превращается в залитую кнопку «Готово» */
  onDone?: () => void;
  /** Если задано, кольцо становится кнопкой: нажатие ставит на паузу и возобновляет */
  onToggle?: () => void;
};

/** Кольцо таймера 168 px: время мм:сс и подпись в центре. */
export function TimerRing({ seconds, total, paused, alert, caption, onDone, onToggle }: Props) {
  const time = formatTime(Math.max(0, seconds));
  const label = paused ? 'пауза' : (caption ?? 'осталось');

  if (onDone && seconds <= 0) {
    return (
      <div className={styles.root}>
        <button type="button" className={styles.done} onClick={onDone}>
          <span className={styles.doneCaption}>время вышло</span>
          <span className={styles.doneLabel}>
            Готово
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
        </button>
      </div>
    );
  }

  const ring = (
    <ProgressRing
      value={total > 0 ? seconds / total : 0}
      color={paused ? 'muted' : alert ? 'accent' : 'primary'}
      smoothing={paused ? 0 : 1000}
    >
      <span className={cx(styles.time, paused && styles.timePaused)}>{time}</span>
      <Text variant="caption">{label}</Text>
    </ProgressRing>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        className={cx(styles.root, styles.button)}
        onClick={onToggle}
      >
        {/* Имя кнопки: действие + видимый текст кольца, как требует WCAG 2.5.3 */}
        <span className={styles.srOnly}>{paused ? 'Продолжить, ' : 'Пауза, '}</span>
        {ring}
      </button>
    );
  }

  return (
    <div role="timer" aria-label={`${label} ${time}`} className={styles.root}>
      {ring}
    </div>
  );
}
