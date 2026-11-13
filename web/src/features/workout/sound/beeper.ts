import type { Signal } from '../flow';
import { DEFAULT_SOUND, partialGains, peakGain, toneFor, type SoundSettings } from './styles';

export type Beeper = {
  /** Создать и разбудить AudioContext; вызывать из нажатия, иначе браузер его не разрешит */
  unlock: () => void;
  play: (signal: Signal) => void;
  /** Сменить стиль и громкость; действует со следующего сигнала */
  configure: (settings: SoundSettings) => void;
  close: () => void;
};

type Ctor = typeof AudioContext;

/**
 * Один AudioContext на Прохождение. Любая ошибка звука (нет Web Audio, беззвучный режим, отказ браузера)
 * глотается: тренировка идёт без звука и без предупреждений.
 */
export function createBeeper(initial: SoundSettings = DEFAULT_SOUND): Beeper {
  let ctx: AudioContext | null = null;
  let settings = initial;

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
      const peak = peakGain(settings.volume);
      if (peak === 0) return;
      const tone = toneFor(settings.style, signal);
      const { sec, attack } = tone;
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      // Короткий вход и спад, чтобы в начале и конце не щёлкало
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak, t + attack);
      if (tone.shape === 'flat') {
        gain.gain.setValueAtTime(peak, t + sec - 0.03);
      } else {
        // Затухание в два звена приближает экспоненту: удар и длинный хвост
        gain.gain.linearRampToValueAtTime(peak * 0.25, t + sec * 0.3);
      }
      gain.gain.linearRampToValueAtTime(0, t + sec);
      gain.connect(ctx.destination);
      const shares = partialGains(tone);
      tone.partials.forEach((p, i) => {
        const osc = ctx!.createOscillator();
        const mix = ctx!.createGain();
        osc.frequency.value = tone.hz * p.ratio;
        mix.gain.value = shares[i];
        osc.connect(mix).connect(gain);
        osc.start(t);
        osc.stop(t + sec);
      });
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

  const configure = (next: SoundSettings) => {
    settings = next;
  };

  return { unlock, play, configure, close };
}
