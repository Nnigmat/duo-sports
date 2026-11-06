import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit } from './fixtures';
import { draftKey, serializeDraft, type Draft } from './draft';
import { pendingFeedbackPath } from './pending';
import { initSession } from './session';

const NOW = 2_000_000_000_000;
const base = initSession(buildSteps([circuit]));
const draft = (phase: Draft['session']['phase'], updatedAt = NOW - 1000): Draft => ({ session: { ...base, phase, index: 0 }, startedAt: NOW - 5000, updatedAt });
const entry = (userId: number, wid: string, date: string, d: Draft): [string, string] => [draftKey(userId, wid, date), serializeDraft(d)];

describe('pendingFeedbackPath', () => {
  it('черновик на обратной связи ведёт на свою тренировку и день', () => {
    expect(pendingFeedbackPath([entry(1, '5', '2026-11-03', draft('feedback'))], 1, NOW)).toBe('/workout/5?date=2026-11-03');
  });

  it('срок хранения не мешает: прошли сутки и больше', () => {
    expect(pendingFeedbackPath([entry(1, '5', '2026-11-03', draft('feedback', NOW - 3 * 86_400_000))], 1, NOW)).toBe('/workout/5?date=2026-11-03');
  });

  it('другие фазы, чужие пользователи, чужие ключи и мусор не считаются', () => {
    expect(pendingFeedbackPath([entry(1, '5', '2026-11-03', draft('finish'))], 1, NOW)).toBeNull();
    expect(pendingFeedbackPath([entry(1, '5', '2026-11-03', draft('work'))], 1, NOW)).toBeNull();
    expect(pendingFeedbackPath([entry(2, '5', '2026-11-03', draft('feedback'))], 1, NOW)).toBeNull();
    expect(pendingFeedbackPath([['other', serializeDraft(draft('feedback'))], [draftKey(1, '5', '2026-11-03'), '{oops']], 1, NOW)).toBeNull();
    expect(pendingFeedbackPath([], 1, NOW)).toBeNull();
  });

  it('несколько черновиков: берём самый свежий', () => {
    const old = entry(1, '5', '2026-11-01', draft('feedback', NOW - 5000));
    const fresh = entry(1, '6', '2026-11-02', draft('feedback', NOW - 100));
    expect(pendingFeedbackPath([old, fresh], 1, NOW)).toBe('/workout/6?date=2026-11-02');
  });
});
