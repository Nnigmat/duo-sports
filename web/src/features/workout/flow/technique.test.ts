import { describe, expect, it } from 'vitest';
import { hasTechnique } from './technique';

describe('hasTechnique', () => {
  it('пусто без шагов и видео', () => {
    expect(hasTechnique({ instructions: [] })).toBe(false);
    expect(hasTechnique({ instructions: [], mistake: 'Спина' })).toBe(false);
  });
  it('есть шаги или видео', () => {
    expect(hasTechnique({ instructions: ['Встать'] })).toBe(true);
    expect(hasTechnique({ instructions: [], videoUrl: '/v.mp4' })).toBe(true);
  });
});
