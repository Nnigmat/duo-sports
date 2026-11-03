import { describe, expect, it } from 'vitest';
import { hasTechnique } from './technique';

describe('hasTechnique', () => {
  it('пусто без шагов, ролик панель не наполняет', () => {
    expect(hasTechnique({ instructions: [] })).toBe(false);
    expect(hasTechnique({ instructions: [], mistake: 'Спина' })).toBe(false);
    expect(hasTechnique({ instructions: [], demoUrl: '/api/demo/x.mp4' })).toBe(false);
  });
  it('есть шаги', () => {
    expect(hasTechnique({ instructions: ['Встать'] })).toBe(true);
  });
});
