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
  /** work — таймер упражнения, rest — отдых */
  kind?: 'work' | 'rest';
  paused?: boolean;
  /** Если задано, кольцо становится кнопкой: нажатие ставит на паузу и возобновляет */
  onToggle?: () => void;
};

const caption = { work: 'осталось', rest: 'отдых' } as const;

/** Кольцо таймера 168 px: время мм:сс и подпись в центре. */
export function TimerRing({ seconds, total, kind = 'work', paused, onToggle }: Props) {
  const time = formatTime(Math.max(0, seconds));
  const label = paused ? 'пауза' : caption[kind];
  const ring = (
    <ProgressRing
      value={total > 0 ? seconds / total : 0}
      color={paused ? 'muted' : kind === 'rest' ? 'accent' : 'primary'}
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
