import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addTime,
  isFinished,
  isPaused,
  pause,
  remainingSec,
  resume,
  startCountdown,
} from '../../flow';

type Options = {
  /** Сколько секунд отсчитывать. Для нового отсчёта пересоздайте компонент через key. */
  seconds: number;
  /** false — стоит на паузе до первого нажатия */
  autoStart?: boolean;
  /** Вызывается один раз, когда время вышло */
  onFinish?: () => void;
};

const TICK_MS = 250;

/** Состояние таймера для контейнера: значения для TimerRing и ActionBar плюс управление. */
export function useCountdown({ seconds, autoStart = true, onFinish }: Options) {
  const [countdown, setCountdown] = useState(() => startCountdown(seconds, Date.now(), autoStart));
  const [now, setNow] = useState(() => Date.now());
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const firedRef = useRef(false);

  const paused = isPaused(countdown);
  const finished = isFinished(countdown, now);

  useEffect(() => {
    if (paused || finished) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, TICK_MS);
    // Вкладка вернулась из фона: сразу показать верное время
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [paused, finished]);

  useEffect(() => {
    if (finished && !firedRef.current) {
      firedRef.current = true;
      finishRef.current?.();
    }
  }, [finished]);

  const toggle = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setCountdown((c) => (isPaused(c) ? resume(c, t) : pause(c, t)));
  }, []);

  const add = useCallback((sec: number) => {
    const t = Date.now();
    firedRef.current = false;
    setNow(t);
    setCountdown((c) => addTime(c, sec, t));
  }, []);

  return {
    seconds: remainingSec(countdown, now),
    total: countdown.totalSec,
    paused,
    finished,
    toggle,
    add,
  };
}
