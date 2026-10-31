import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { applyLabel, draftFromPlan, followingNumbers, formatFollowing, planFromDraft } from './editPlan';
import { circuit, setsBlock, warmup } from './fixtures';

describe('draftFromPlan', () => {
  it('значение берётся с нижней границы диапазона', () => {
    expect(draftFromPlan({ target: { min: 18, max: 20 } })).toEqual({ value: 18, weight: undefined });
  });

  it('вес переносится', () => {
    expect(draftFromPlan({ target: { min: 12, max: 12 }, weight: 12 })).toEqual({ value: 12, weight: 12 });
  });
});

describe('planFromDraft', () => {
  const range = { target: { min: 18, max: 20 } };

  it('значение не менялось: диапазон цели сохраняется', () => {
    expect(planFromDraft(range, { value: 18 })).toEqual(range);
  });

  it('значение изменено: цель становится одним числом', () => {
    expect(planFromDraft(range, { value: 16 })).toEqual({ target: { min: 16, max: 16 } });
  });

  it('вес добавляется и убирается', () => {
    expect(planFromDraft(range, { value: 18, weight: 2.5 })).toEqual({ target: { min: 18, max: 20 }, weight: 2.5 });
    expect(planFromDraft({ ...range, weight: 5 }, { value: 18 })).toEqual(range);
  });

  it('не делит ссылку на исходную цель', () => {
    const out = planFromDraft(range, { value: 18 });
    expect(out.target).not.toBe(range.target);
  });
});

describe('followingNumbers', () => {
  it('circuit: номера подходов следующих кругов', () => {
    expect(followingNumbers(buildSteps([circuit]), 0)).toEqual([4, 7]);
    expect(followingNumbers(buildSteps([circuit]), 4)).toEqual([8]);
  });

  it('sets: следующие подходы того же упражнения', () => {
    expect(followingNumbers(buildSteps([setsBlock]), 0)).toEqual([2, 3]);
  });

  it('последний подход упражнения: пусто', () => {
    expect(followingNumbers(buildSteps([setsBlock]), 2)).toEqual([]);
    expect(followingNumbers(buildSteps([warmup]), 0)).toEqual([]);
  });
});

describe('formatFollowing', () => {
  it('пусто — undefined', () => {
    expect(formatFollowing([])).toBeUndefined();
  });
  it('один подход', () => {
    expect(formatFollowing([4])).toBe('Подход 4');
  });
  it('два подхода через «и»', () => {
    expect(formatFollowing([4, 7])).toBe('Подходы 4 и 7');
  });
  it('три и больше: запятые и «и» перед последним', () => {
    expect(formatFollowing([2, 3, 5])).toBe('Подходы 2, 3 и 5');
  });
});

describe('applyLabel', () => {
  it('circuit: круги; остальное: подходы', () => {
    expect(applyLabel(buildSteps([circuit])[0])).toBe('Применить к следующим кругам');
    expect(applyLabel(buildSteps([setsBlock])[0])).toBe('Применить к следующим подходам');
  });
});
