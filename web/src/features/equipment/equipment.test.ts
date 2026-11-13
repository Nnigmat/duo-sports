import { describe, expect, it } from 'vitest';
import { sameName, totalText, usageText } from './equipment';

describe('equipment', () => {
  it('склоняет', () => {
    expect(usageText(0)).toBe('Нет упражнений');
    expect(usageText(1)).toBe('1 упражнение');
    expect(usageText(3)).toBe('3 упражнения');
    expect(usageText(11)).toBe('11 упражнений');
    expect(totalText(21)).toBe('21 позиция');
  });
  it('сравнивает без регистра, ё и лишних пробелов', () => {
    expect(sameName(' Ёлка  большая', 'елка большая')).toBe(true);
    expect(sameName('Гриф', 'Штанга')).toBe(false);
  });
});
