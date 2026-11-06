import type { Signal } from '../flow';

/** Сигнал: частота и длительность, секунд. Длинный заканчивается за ~0,5 с, до старта записи видео. */
const TONES: Record<Signal, { hz: number; sec: number }> = {
  short: { hz: 660, sec: 0.15 },
  long: { hz: 990, sec: 0.5 },
};

export type Beeper = {
  /** Создать и разбудить AudioContext; вызывать из нажатия, иначе браузер его не разрешит */
  unlock: () => void;
  play: (signal: Signal) => void;
  close: () => void;
};

type Ctor = typeof AudioContext;

/**
 * Один AudioContext на Прохождение. Любая ошибка звука (нет Web Audio, беззвучный режим, отказ браузера)
 * глотается: тренировка идёт без звука и без предупреждений.
 */
export function createBeeper(): Beeper {
  let ctx: AudioContext | null = null;

  const unlock = () => {
    try {
      if (!ctx) {
        const Context: Ctor | undefined = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: Ctor }).webkitAudioContext;
        if (!Context) return;
        ctx = new Context();
      }
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    } catch {
      ctx = null;
    }
  };

  const play = (signal: Signal) => {
    try {
      if (ctx?.state !== 'running') return;
      const { hz, sec } = TONES[signal];
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = hz;
      // Короткий вход и спад, чтобы в начале и конце не щёлкало
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
      gain.gain.setValueAtTime(0.4, t + sec - 0.03);
      gain.gain.linearRampToValueAtTime(0, t + sec);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + sec);
    } catch {
      /* звук не заработал: идём без него */
    }
  };

  const close = () => {
    try {
      void ctx?.close().catch(() => {});
    } catch {
      /* уже закрыт */
    }
    ctx = null;
  };

  return { unlock, play, close };
}
