import { describe, expect, it } from 'vitest';
import { feelingLabel } from './feeling';

describe('feelingLabel', () => {
  it('подписывает оценки 1–5', () => {
    expect([1, 2, 3, 4, 5].map(feelingLabel)).toEqual(['Плохо', 'Устал', 'Нормально', 'Хорошо', 'Отлично']);
  });
  it('без оценки или вне шкалы — null', () => {
    for (const v of [null, undefined, 0, 6, 2.5]) expect(feelingLabel(v)).toBeNull();
  });
});
