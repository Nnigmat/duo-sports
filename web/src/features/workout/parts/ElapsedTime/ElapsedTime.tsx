import { useEffect, useState } from 'react';
import { Icon } from '../../../../ui/Icon/Icon';
import { elapsedSec, formatElapsed } from '../../flow';
import styles from './ElapsedTime.module.css';

type Props = {
  /** Секунд с начала тренировки */
  seconds: number;
};

/** Общее время тренировки с иконкой часов. Только показывает, считает useElapsedSec. */
export function ElapsedTime({ seconds }: Props) {
  return (
    <span role="timer" aria-label="Время тренировки" className={styles.root}>
      <Icon name="timer" size={20} className={styles.icon} />
      {formatElapsed(seconds)}
    </span>
  );
}

/** Секунды с метки старта (мс), обновляются раз в секунду; пауза упражнения на них не влияет. */
export function useElapsedSec(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return elapsedSec(startedAt, now);
}

/** Для экрана: время идёт от startedAt, без метки (старт ещё не нажат) ничего не показываем. */
export function ElapsedSince({ startedAt }: { startedAt?: number | null }) {
  return startedAt == null ? null : <Ticking startedAt={startedAt} />;
}

function Ticking({ startedAt }: { startedAt: number }) {
  return <ElapsedTime seconds={useElapsedSec(startedAt)} />;
}
