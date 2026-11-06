import { useCallback, useEffect, useState } from 'react';
import { addRestGoal, isGoalReached, restElapsedSec, restProgress, startRest } from '../../flow';

const TICK_MS = 250;

/**
 * Отдых для контейнера: сколько прошло, цель, достигнута ли она. Считает вверх и после цели.
 * Для нового отдыха пересоздайте компонент через key.
 */
export function useRest(goalSec: number) {
  const [rest, setRest] = useState(() => startRest(goalSec, Date.now()));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, TICK_MS);
    // Вкладка вернулась из фона: сразу показать верное время
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  /** «+15 с»: цель этого отдыха растёт, время не сбрасывается */
  const add = useCallback((sec: number) => {
    setNow(Date.now());
    setRest((r) => addRestGoal(r, sec));
  }, []);

  /** Секунды на момент вызова: для записи в факт при «Пропустить» и «Начать» */
  const elapsedNow = useCallback(() => restElapsedSec(rest, Date.now()), [rest]);

  return {
    elapsed: restElapsedSec(rest, now),
    goalSec: rest.goalSec,
    reached: isGoalReached(rest, now),
    progress: restProgress(rest, now),
    add,
    elapsedNow,
  };
}
