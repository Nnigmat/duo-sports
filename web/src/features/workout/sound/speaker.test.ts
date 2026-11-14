import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSpeaker } from './speaker';

function fakeSynth(voices: { lang: string }[]) {
  const spoken: { text: string; volume: number; lang: string }[] = [];
  const synth = { getVoices: () => voices, speak: vi.fn((u) => spoken.push(u)), cancel: vi.fn() };
  class Utterance {
    volume = 1;
    lang = '';
    voice: unknown;
    constructor(public text: string) {}
  }
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  return { synth, spoken };
}

afterEach(() => vi.unstubAllGlobals());

describe('createSpeaker', () => {
  it('говорит по-русски с громкостью настроек', () => {
    const { spoken } = fakeSynth([{ lang: 'en-US' }, { lang: 'ru_RU' }]);
    createSpeaker(40).say('Привет');
    expect(spoken).toMatchObject([{ text: 'Привет', lang: 'ru-RU', volume: 0.4 }]);
  });
  it('при громкости 0 молчит', () => {
    const { synth } = fakeSynth([{ lang: 'ru-RU' }]);
    createSpeaker(0).say('Привет');
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('без русского голоса молчит и не бросает', () => {
    const { synth } = fakeSynth([{ lang: 'en-US' }]);
    expect(() => createSpeaker(80).say('Привет')).not.toThrow();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('без speechSynthesis молчит и не бросает', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    const s = createSpeaker(80);
    expect(() => {
      s.unlock();
      s.say('Привет');
      s.cancel();
    }).not.toThrow();
  });
  it('cancel обрывает речь', () => {
    const { synth } = fakeSynth([{ lang: 'ru-RU' }]);
    createSpeaker(80).cancel();
    expect(synth.cancel).toHaveBeenCalled();
  });
});
