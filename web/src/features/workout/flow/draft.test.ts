import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit, warmup } from './fixtures';
import { DRAFT_TTL_MS, draftKey, parseDraft, serializeDraft, type Draft } from './draft';
import { initSession, reduce } from './session';

const NOW = 1_000_000_000;
const started = reduce(initSession(buildSteps([warmup, circuit])), { type: 'begin' });
const draft: Draft = { session: reduce(started, { type: 'done' }), startedAt: NOW - 60_000, updatedAt: NOW - 1000 };

describe('draft', () => {
  it('ключ различает пользователя, тренировку и день', () => {
    expect(draftKey(1, '5', '2026-11-03')).not.toBe(draftKey(2, '5', '2026-11-03'));
    expect(draftKey(1, '5', '2026-11-03')).not.toBe(draftKey(1, '6', '2026-11-03'));
    expect(draftKey(1, '5', '2026-11-03')).not.toBe(draftKey(1, '5', '2026-11-04'));
  });

  it('возвращает то, что сохранили', () => {
    expect(parseDraft(serializeDraft(draft), NOW)).toEqual(draft);
  });

  it('пусто, повреждено или не JSON — null', () => {
    expect(parseDraft(null, NOW)).toBeNull();
    expect(parseDraft('', NOW)).toBeNull();
    expect(parseDraft('{oops', NOW)).toBeNull();
    expect(parseDraft('null', NOW)).toBeNull();
  });

  it('устаревший черновик — null, на границе ещё жив', () => {
    expect(parseDraft(serializeDraft({ ...draft, updatedAt: NOW - DRAFT_TTL_MS }), NOW)).not.toBeNull();
    expect(parseDraft(serializeDraft({ ...draft, updatedAt: NOW - DRAFT_TTL_MS - 1 }), NOW)).toBeNull();
  });

  it('не подходящая по форме сессия — null', () => {
    const bad = (patch: object) => parseDraft(JSON.stringify({ ...draft, session: { ...draft.session, ...patch } }), NOW);
    expect(bad({ index: 999 })).toBeNull();
    expect(bad({ phase: 'start' })).toBeNull();
    expect(bad({ phase: 'unknown' })).toBeNull();
    expect(bad({ completed: [true] })).toBeNull();
    expect(bad({ videoIds: [] })).toBeNull();
    expect(bad({ steps: [] })).toBeNull();
    expect(bad({ steps: [{ exerciseId: 'x' }] })).toBeNull();
    expect(bad({ timerStarted: 'yes' })).toBeNull();
  });

  it('факты переживают сохранение', () => {
    const withFact: Draft = {
      ...draft,
      session: reduce(started, { type: 'done', actual: { value: 30, extraWeight: true } }),
    };
    expect(parseDraft(serializeDraft(withFact), NOW)?.session.actuals[0]).toEqual({ value: 30, extraWeight: true });
  });

  it('старый черновик без фактов читается, факты пустые', () => {
    const { actuals: _omit, ...old } = draft.session;
    const parsed = parseDraft(JSON.stringify({ ...draft, session: old }), NOW);
    expect(parsed?.session.actuals).toEqual(draft.session.steps.map(() => null));
    expect(parsed?.session.completed).toEqual(draft.session.completed);
  });

  it('кривые факты — null', () => {
    const bad = (actuals: unknown) => parseDraft(JSON.stringify({ ...draft, session: { ...draft.session, actuals } }), NOW);
    expect(bad([])).toBeNull();
    expect(bad(draft.session.steps.map(() => 5))).toBeNull();
    expect(bad(draft.session.steps.map(() => ({ value: 'много' })))).toBeNull();
    expect(bad(draft.session.steps.map(() => ({ value: -1 })))).toBeNull();
  });

  it('без времени начала — null', () => {
    expect(parseDraft(JSON.stringify({ session: draft.session, updatedAt: NOW }), NOW)).toBeNull();
  });
});
