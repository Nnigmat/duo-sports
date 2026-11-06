import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBeeper } from './beeper';

function fakeContext(state: 'running' | 'suspended' = 'running') {
  const freqs: number[] = [];
  const created = { n: 0 };
  class Ctx {
    state = state;
    currentTime = 0;
    destination = {};
    constructor() {
      created.n++;
    }
    resume() {
      // Как беззвучный режим iOS: промис выполнен, но контекст так и не пошёл
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
    createGain() {
      const node = { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect: () => ({ connect() {} }) };
      return node;
    }
    createOscillator() {
      const o = {
        frequency: {
          set value(v: number) {
            freqs.push(v);
          },
        },
        connect: () => ({ connect() {} }),
        start() {},
        stop() {},
      };
      return o;
    }
  }
  vi.stubGlobal('AudioContext', Ctx);
  return { freqs, created };
}

afterEach(() => vi.unstubAllGlobals());

describe('createBeeper', () => {
  it('короткий 660 Гц, длинный 990 Гц', () => {
    const { freqs } = fakeContext();
    const b = createBeeper();
    b.unlock();
    b.play('short');
    b.play('long');
    expect(freqs).toEqual([660, 990]);
  });

  it('контекст один, сколько ни вызывай unlock', () => {
    const { created } = fakeContext();
    const b = createBeeper();
    b.unlock();
    b.unlock();
    expect(created.n).toBe(1);
  });

  it('до unlock и без Web Audio молчит без ошибок', () => {
    vi.stubGlobal('AudioContext', undefined);
    const b = createBeeper();
    expect(() => {
      b.play('short');
      b.unlock();
      b.play('long');
      b.close();
    }).not.toThrow();
  });

  it('контекст, который не стал running (беззвучный режим), не играет и не падает', () => {
    const { freqs } = fakeContext('suspended');
    const b = createBeeper();
    b.unlock();
    expect(() => b.play('short')).not.toThrow();
    expect(freqs).toEqual([]);
  });

  it('конструктор бросил: тихо, без ошибок', () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('нет'); } });
    const b = createBeeper();
    expect(() => { b.unlock(); b.play('short'); }).not.toThrow();
  });
});
