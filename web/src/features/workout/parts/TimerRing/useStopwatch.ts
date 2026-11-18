import { useCallback, useEffect, useState } from 'react';
import { isStopwatchPaused, pauseStopwatch, resumeStopwatch, startStopwatch, stopwatchElapsedSec } from '../../flow';

const TICK_MS = 250;

/**
 * Секундомер для контейнера: идёт вверх сразу после монтирования, считает по меткам времени.
 * Для нового отсчёта пересоздайте компонент через key.
 */
export function useStopwatch() {
  const [watch, setWatch] = useState(() => startStopwatch(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const paused = isStopwatchPaused(watch);

  useEffect(() => {
    if (paused) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, TICK_MS);
    // Вкладка вернулась из фона: сразу показать верное время
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [paused]);

  const toggle = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setWatch((w) => (isStopwatchPaused(w) ? resumeStopwatch(w, t) : pauseStopwatch(w, t)));
  }, []);

  /** Ставит на паузу и возвращает, сколько секунд набежало: для окна результата */
  const stop = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setWatch((w) => pauseStopwatch(w, t));
    return stopwatchElapsedSec(watch, t);
  }, [watch]);

  return { elapsed: stopwatchElapsedSec(watch, now), paused, toggle, stop };
}
