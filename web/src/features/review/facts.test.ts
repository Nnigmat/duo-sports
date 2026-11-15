import { describe, expect, it } from 'vitest';
import { videoCaptions } from './facts';

const NB = ' ';

describe('videoCaptions', () => {
  it('без факта показывает план', () => {
    expect(videoCaptions('Подход 2', `14–20${NB}повт`)).toEqual({ subtitle: `Подход 2 · 14–20${NB}повт` });
  });

  it('с фактом — сделано, план мелкой строкой с меткой', () => {
    expect(videoCaptions('Подход 2', `14–20${NB}повт`, `12${NB}повт`, 'Меньше плана')).toEqual({ subtitle: `Подход 2 · сделано 12${NB}повт`, note: `план 14–20${NB}повт · Меньше` });
  });

  it('факт без метки и без плана', () => {
    expect(videoCaptions('Подход 2', `14–20${NB}повт`, `20${NB}повт`)).toEqual({ subtitle: `Подход 2 · сделано 20${NB}повт`, note: `план 14–20${NB}повт` });
    expect(videoCaptions('Подход 2', undefined, `20${NB}повт`)).toEqual({ subtitle: `Подход 2 · сделано 20${NB}повт`, note: undefined });
  });
});
