import { describe, expect, it } from 'vitest';
import { factDraft, factFromDraft, factLabel } from './fact';

describe('factLabel', () => {
  const range = { target: { min: 18, max: 20 } };

  it('ниже min — «Меньше плана»', () => {
    expect(factLabel(range, 17)).toBe('Меньше плана');
  });

  it('на границах и внутри диапазона — «В плане»', () => {
    expect(factLabel(range, 18)).toBe('В плане');
    expect(factLabel(range, 19)).toBe('В плане');
    expect(factLabel(range, 20)).toBe('В плане');
  });

  it('выше max — «Больше плана»', () => {
    expect(factLabel(range, 21)).toBe('Больше плана');
  });

  it('цель одним числом: меньше, ровно, больше', () => {
    const exact = { target: { min: 12, max: 12 } };
    expect(factLabel(exact, 11)).toBe('Меньше плана');
    expect(factLabel(exact, 12)).toBe('В плане');
    expect(factLabel(exact, 13)).toBe('Больше плана');
  });

  it('«макс.» (0–0) — любое число в плане', () => {
    expect(factLabel({ target: { min: 0, max: 0 } }, 25)).toBe('В плане');
  });
});

describe('factDraft', () => {
  it('для диапазона берёт верхнюю границу', () => {
    expect(factDraft('reps', { target: { min: 18, max: 20 } })).toEqual({ value: 20, extraWeight: false });
  });

  it('время: тоже верхняя граница', () => {
    expect(factDraft('time', { target: { min: 45, max: 60 } })).toEqual({ value: 60, extraWeight: false });
  });

  it('вес × повторы: вес из плана', () => {
    expect(factDraft('weight', { target: { min: 12, max: 12 }, weight: 60 })).toEqual({ value: 12, weight: 60, extraWeight: false });
  });

  it('вес × повторы без веса в плане: 0', () => {
    expect(factDraft('weight', { target: { min: 10, max: 10 } })).toEqual({ value: 10, weight: 0, extraWeight: false });
  });

  it('уже введённый факт важнее плана', () => {
    const plan = { target: { min: 18, max: 20 } };
    expect(factDraft('reps', plan, { value: 17, extraWeight: true })).toEqual({ value: 17, extraWeight: true });
    expect(factDraft('weight', { target: { min: 12, max: 12 }, weight: 60 }, { value: 10, weight: 62.5 })).toEqual({
      value: 10,
      weight: 62.5,
      extraWeight: false,
    });
  });

  it('факт без веса у упражнения «вес × повторы»: вес из плана', () => {
    expect(factDraft('weight', { target: { min: 12, max: 12 }, weight: 60 }, { value: 10 })).toEqual({
      value: 10,
      weight: 60,
      extraWeight: false,
    });
  });
});

describe('factFromDraft', () => {
  it('повторы: только число; «доп. вес» попадает, только если отмечен', () => {
    expect(factFromDraft({ value: 20, extraWeight: false })).toEqual({ value: 20 });
    expect(factFromDraft({ value: 20, extraWeight: true })).toEqual({ value: 20, extraWeight: true });
  });

  it('вес и повторы сохраняются вместе', () => {
    expect(factFromDraft({ value: 10, weight: 62.5, extraWeight: false })).toEqual({ value: 10, weight: 62.5 });
  });
});
