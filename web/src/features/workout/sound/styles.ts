import { DEFAULT_SOUND_STYLE, DEFAULT_SOUND_VOLUME, MAX_SOUND_VOLUME, type SoundStyle } from '../../../../../shared/types';
import type { Signal } from '../flow';

/** Что слышит и выбирает пользователь */
export type SoundSettings = { style: SoundStyle; volume: number };
export const DEFAULT_SOUND: SoundSettings = { style: DEFAULT_SOUND_STYLE, volume: DEFAULT_SOUND_VOLUME };

/** Обертон: во сколько раз выше основной частоты и какая доля громкости */
type Partial = { ratio: number; amp: number };

/**
 * Один сигнал: основная частота, длительность и форма огибающей, секунд.
 * flat: ровный тон с коротким входом и спадом (как сигнал таймера); decay: удар с затуханием (колокол).
 * Длинный сигнал заканчивается за ~0,5 с, до старта записи видео, поэтому sec у long не больше 0,5.
 */
export type Tone = { hz: number; sec: number; attack: number; shape: 'flat' | 'decay'; partials: Partial[] };

export const STYLE_LABELS: Record<SoundStyle, string> = {
  classic: 'Классика',
  bell: 'Колокол',
  soft: 'Мягкий',
};

const TONES: Record<SoundStyle, Record<Signal, Tone>> = {
  classic: {
    short: { hz: 660, sec: 0.15, attack: 0.01, shape: 'flat', partials: [{ ratio: 1, amp: 1 }] },
    long: { hz: 990, sec: 0.5, attack: 0.01, shape: 'flat', partials: [{ ratio: 1, amp: 1 }] },
  },
  // Неточные кратные частоты дают металлический звон
  bell: {
    short: { hz: 1047, sec: 0.35, attack: 0.004, shape: 'decay', partials: [{ ratio: 1, amp: 1 }, { ratio: 2.76, amp: 0.45 }, { ratio: 5.4, amp: 0.2 }] },
    long: { hz: 1319, sec: 0.5, attack: 0.004, shape: 'decay', partials: [{ ratio: 1, amp: 1 }, { ratio: 2.76, amp: 0.45 }, { ratio: 5.4, amp: 0.2 }] },
  },
  // Ниже по тону, плавный вход и спад, без резкой атаки
  soft: {
    short: { hz: 523, sec: 0.22, attack: 0.05, shape: 'decay', partials: [{ ratio: 1, amp: 1 }, { ratio: 2, amp: 0.25 }] },
    long: { hz: 784, sec: 0.5, attack: 0.06, shape: 'decay', partials: [{ ratio: 1, amp: 1 }, { ratio: 2, amp: 0.25 }] },
  },
};

export const toneFor = (style: SoundStyle, signal: Signal): Tone => TONES[style][signal];

/** Пик усиления: 80 % даёт прежние 0,4, 100 % — 0,5, 0 % — тишина */
export const peakGain = (volume: number): number => 0.5 * (Math.min(Math.max(volume, 0), MAX_SOUND_VOLUME) / MAX_SOUND_VOLUME);

/** Доля пика на каждый обертон: сумма долей равна 1, чтобы стили звучали одинаково громко */
export const partialGains = (tone: Tone): number[] => {
  const total = tone.partials.reduce((sum, p) => sum + p.amp, 0);
  return tone.partials.map((p) => p.amp / total);
};
