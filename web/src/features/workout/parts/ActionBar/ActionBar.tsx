import { IconButton } from '../../../../ui/IconButton/IconButton';
import { RestRing } from '../RestRing/RestRing';
import { TimerRing } from '../TimerRing/TimerRing';
import styles from './ActionBar.module.css';

type Common = {
  onSkip: () => void;
};

type Props =
  | (Common & { mode: 'set'; onDone: () => void; onBack?: () => void })
  | (Common & { mode: 'start'; onStart: () => void; onBack?: () => void })
  | (Common & {
      mode: 'timer';
      seconds: number;
      total: number;
      paused?: boolean;
      /** Оранжевое кольцо и своя подпись: отсчёт перед стартом и последние секунды */
      alert?: boolean;
      caption?: string;
      /** Есть — по окончании кольцо становится кнопкой «Готово» */
      onDone?: () => void;
      onPauseToggle: () => void;
    })
  | (Common & {
      /** Время на максимум: секундомер вверх, кольцо ставит на паузу, «Стоп» открывает результат */
      mode: 'stopwatch';
      label: string;
      paused?: boolean;
      onPauseToggle: () => void;
      onStop: () => void;
    })
  | (Common & {
      mode: 'rest';
      /** Сколько отдыхаете, секунд */
      elapsed: number;
      goalSec: number;
      /** Цель достигнута: в центре кнопка «Начать» */
      reached: boolean;
      progress: number;
      onAddTime: () => void;
      onStart: () => void;
    });

/**
 * Нижний ряд экрана тренировки: слева дополнительное действие, в центре ключевое, справа «Пропустить».
 * У подхода слева «Назад»; без onBack (первый шаг) кнопки нет, место остаётся.
 */
export function ActionBar(props: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.side}>{left(props)}</div>
      <div className={styles.center}>{center(props)}</div>
      <div className={styles.side}>
        <IconButton size="md" icon="skip" aria-label="Пропустить" caption="Пропустить" onClick={props.onSkip} />
      </div>
    </div>
  );
}

function left(p: Props) {
  switch (p.mode) {
    case 'set':
    case 'start':
      return p.onBack && <IconButton size="md" icon="back" aria-label="Назад" caption="Назад" onClick={p.onBack} />;
    case 'timer': {
      // Время вышло: ставить на паузу нечего
      const over = Boolean(p.onDone) && p.seconds <= 0;
      return p.paused ? (
        <IconButton size="md" icon="play" aria-label="Продолжить" caption="Продолжить" disabled={over} onClick={p.onPauseToggle} />
      ) : (
        <IconButton size="md" icon="pause" aria-label="Пауза" caption="Пауза" disabled={over} onClick={p.onPauseToggle} />
      );
    }
    case 'stopwatch':
      return (
        <IconButton size="md" aria-label="Стоп" caption="Стоп" onClick={p.onStop}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        </IconButton>
      );
    case 'rest':
      return (
        <IconButton size="md" aria-label="Добавить 15 секунд" caption="+15 с" onClick={p.onAddTime}>
          +15
        </IconButton>
      );
  }
}

function center(p: Props) {
  switch (p.mode) {
    case 'set':
      return <IconButton size="lg" icon="check" aria-label="Готово" caption="Готово" onClick={p.onDone} />;
    case 'start':
      return <IconButton size="lg" icon="play" aria-label="Старт" caption="Старт" onClick={p.onStart} />;
    case 'timer':
      return <TimerRing seconds={p.seconds} total={p.total} paused={p.paused} alert={p.alert} caption={p.caption} onDone={p.onDone} onToggle={p.onPauseToggle} />;
    case 'stopwatch':
      // total равен времени: кольцо полное, пока идёт; на паузе серое. Подпись говорит, что время растёт
      return <TimerRing seconds={1} total={1} timeLabel={p.label} paused={p.paused} caption="прошло" onToggle={p.onPauseToggle} />;
    case 'rest':
      return <RestRing elapsed={p.elapsed} goalSec={p.goalSec} reached={p.reached} progress={p.progress} onStart={p.onStart} />;
  }
}
