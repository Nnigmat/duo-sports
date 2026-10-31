import { IconButton } from '../../../../ui/IconButton/IconButton';
import { TimerRing } from '../TimerRing/TimerRing';
import styles from './ActionBar.module.css';

type Common = {
  onSkip: () => void;
};

type Props =
  | (Common & { mode: 'set'; onDone: () => void; onEdit: () => void })
  | (Common & { mode: 'start'; onStart: () => void; onEdit: () => void })
  | (Common & {
      mode: 'timer';
      seconds: number;
      total: number;
      paused?: boolean;
      onPauseToggle: () => void;
    })
  | (Common & { mode: 'rest'; seconds: number; total: number; onAddTime: () => void });

/** Нижний ряд экрана тренировки: слева дополнительное действие, в центре ключевое, справа «Пропустить». */
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
      return <IconButton size="md" icon="pencil" aria-label="Изменить" caption="Изменить" onClick={p.onEdit} />;
    case 'timer':
      return p.paused ? (
        <IconButton size="md" icon="play" aria-label="Продолжить" caption="Продолжить" onClick={p.onPauseToggle} />
      ) : (
        <IconButton size="md" icon="pause" aria-label="Пауза" caption="Пауза" onClick={p.onPauseToggle} />
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
      return <TimerRing seconds={p.seconds} total={p.total} paused={p.paused} onToggle={p.onPauseToggle} />;
    case 'rest':
      return <TimerRing kind="rest" seconds={p.seconds} total={p.total} />;
  }
}
