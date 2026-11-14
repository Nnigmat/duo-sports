import { MAX_SOUND_VOLUME } from '../../../../../shared/types';

export type Speaker = {
  /** Разрешить речь; вызывать из нажатия, как beeper.unlock */
  unlock: () => void;
  /** Сказать фразу, оборвав незаконченную; без голоса или при громкости 0 молчит */
  say: (text: string) => void;
  /** Оборвать незаконченную фразу: пауза, пропуск шага, выход */
  cancel: () => void;
};

/** Громкость сигналов, % (0 — тишина), берётся из настроек звука */
export function createSpeaker(volume: number): Speaker {
  const synth = (): SpeechSynthesis | undefined => (typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis);
  const russian = (s: SpeechSynthesis) => s.getVoices().find((v) => v.lang.toLowerCase().startsWith('ru'));

  const cancel = () => {
    try {
      synth()?.cancel();
    } catch {
      /* речь недоступна: идём без неё */
    }
  };

  const unlock = () => {
    try {
      // Пустая фраза в нажатии снимает запрет автозапуска в iOS Safari
      const s = synth();
      if (s && typeof SpeechSynthesisUtterance !== 'undefined') s.speak(new SpeechSynthesisUtterance(''));
    } catch {
      /* без речи */
    }
  };

  const say = (text: string) => {
    try {
      const s = synth();
      if (!s || volume <= 0) return;
      const voice = russian(s);
      if (!voice) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.voice = voice;
      u.volume = Math.min(1, volume / MAX_SOUND_VOLUME);
      s.speak(u);
    } catch {
      /* без речи */
    }
  };

  return { unlock, say, cancel };
}
