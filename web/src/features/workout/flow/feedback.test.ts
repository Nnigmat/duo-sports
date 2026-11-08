import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit } from './fixtures';
import { COMMENT_MAX, canSend, faceFor, feedbackOf, newSubmitKey, RATINGS } from './feedback';
import { initSession, reduce, type Session } from './session';

const finished = (): Session => ({ ...initSession(buildSteps([circuit])), phase: 'finish' });

describe('RATINGS', () => {
  it('пять оценок от «Плохо» до «Отлично»', () => {
    expect(RATINGS.map((r) => r.value)).toEqual([1, 2, 3, 4, 5]);
    expect(RATINGS[0].label).toBe('Плохо');
    expect(RATINGS[4].label).toBe('Отлично');
  });
});

describe('faceFor', () => {
  it('без оценки и на каждой оценке свой чибик', () => {
    expect(faceFor(null)).toEqual({ face: 'happy', pose: 'stand' });
    expect(faceFor(1)).toEqual({ face: 'tired', pose: 'rest' });
    expect(faceFor(3)).toEqual({ face: 'neutral', pose: 'stand' });
    expect(faceFor(5)).toEqual({ face: 'cheer', pose: 'cheer' });
  });
});

describe('фаза feedback', () => {
  it('«Дальше» с финиша ведёт на обратную связь, стрелка возвращает к итогам', () => {
    const f = reduce(finished(), { type: 'toFeedback' });
    expect(f.phase).toBe('feedback');
    expect(reduce(f, { type: 'toSummary' }).phase).toBe('finish');
  });

  it('из других фаз перейти на обратную связь нельзя', () => {
    const s = { ...finished(), phase: 'work' as const };
    expect(reduce(s, { type: 'toFeedback' })).toBe(s);
    expect(reduce(s, { type: 'toSummary' })).toBe(s);
  });

  it('оценка и комментарий копятся в прохождении и переживают переходы', () => {
    let s = reduce(finished(), { type: 'toFeedback' });
    s = reduce(s, { type: 'rate', value: 4 });
    s = reduce(s, { type: 'comment', text: 'колено' });
    s = reduce(reduce(s, { type: 'toSummary' }), { type: 'toFeedback' });
    expect(s).toMatchObject({ feeling: 4, comment: 'колено' });
  });

  it('оценки вне 1–5 игнорируются', () => {
    const s = reduce(finished(), { type: 'toFeedback' });
    expect(reduce(s, { type: 'rate', value: 0 })).toBe(s);
    expect(reduce(s, { type: 'rate', value: 6 })).toBe(s);
    expect(reduce(s, { type: 'rate', value: 2.5 })).toBe(s);
  });

  it('«Закончить» уже на обратной связи ничего не меняет', () => {
    const s = reduce(finished(), { type: 'toFeedback' });
    expect(reduce(s, { type: 'finishNow' })).toBe(s);
  });
});

describe('canSend / feedbackOf', () => {
  it('без оценки отправить нельзя', () => {
    expect(canSend(null)).toBe(false);
    expect(canSend(0)).toBe(false);
    expect(canSend(3)).toBe(true);
  });

  it('в итог уходит оценка, а комментарий — обрезанный и только непустой', () => {
    expect(feedbackOf({ feeling: null, comment: 'x' })).toBeNull();
    expect(feedbackOf({ feeling: 5, comment: '  ' })).toEqual({ feeling: 5 });
    expect(feedbackOf({ feeling: 2, comment: '  тяжело ' })).toEqual({ feeling: 2, comment: 'тяжело' });
    expect(feedbackOf({ feeling: 2, comment: 'я'.repeat(COMMENT_MAX + 50) })!.comment).toHaveLength(COMMENT_MAX);
  });
});

describe('newSubmitKey', () => {
  it('каждый вызов даёт новый ключ формата uuid', () => {
    const a = newSubmitKey();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(newSubmitKey()).not.toBe(a);
  });
});
