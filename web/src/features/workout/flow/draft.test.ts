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

  it('время подхода переживает перезагрузку; в старом черновике его нет — это допустимо', () => {
    const time = { startedAt: 1000, endedAt: 42000 };
    const withTimes = { ...draft, session: { ...draft.session, times: draft.session.steps.map((_, i) => (i === 2 ? time : null)) } };
    expect(parseDraft(serializeDraft(withTimes), NOW)?.session.times[2]).toEqual(time);
    const { times: _omit, ...old } = draft.session;
    expect(parseDraft(serializeDraft({ ...draft, session: old as typeof draft.session }), NOW)?.session.times).toEqual(draft.session.steps.map(() => null));
  });

  it('время отдыха переживает перезагрузку', () => {
    const withRest = { ...draft, session: { ...draft.session, restSec: draft.session.steps.map((_, i) => (i === 2 ? 72 : null)) } };
    expect(parseDraft(serializeDraft(withRest), NOW)?.session.restSec[2]).toBe(72);
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

  it('замена упражнения переживает перезагрузку', () => {
    const replaced = { ...draft, session: { ...draft.session, steps: draft.session.steps.map((st, i) => (i === 2 ? { ...st, exerciseId: 'push-up', exerciseName: 'Отжимания', replaced: { id: st.exerciseId, name: st.exerciseName } } : st)) } };
    expect(parseDraft(serializeDraft(replaced), NOW)).toEqual(replaced);
  });

  it('пометка замены неверной формы — null', () => {
    const withReplaced = (replaced: unknown) => parseDraft(JSON.stringify({ ...draft, session: { ...draft.session, steps: draft.session.steps.map((st, i) => (i === 2 ? { ...st, replaced } : st)) } }), NOW);
    expect(withReplaced({ id: 'a' })).toBeNull();
    expect(withReplaced('Приседания')).toBeNull();
    expect(withReplaced({ id: 1, name: 'A' })).toBeNull();
  });

  it('не подходящая по форме сессия — null', () => {
    const bad = (patch: object) => parseDraft(JSON.stringify({ ...draft, session: { ...draft.session, ...patch } }), NOW);
    expect(bad({ index: 999 })).toBeNull();
    expect(bad({ phase: 'start' })).toBeNull();
    expect(bad({ phase: 'unknown' })).toBeNull();
    expect(bad({ completed: [true] })).toBeNull();
    expect(bad({ videoIds: [] })).toBeNull();
    expect(bad({ restSec: [] })).toBeNull();
    expect(bad({ restSec: draft.session.steps.map(() => '60') })).toBeNull();
    expect(bad({ restSec: undefined })).toBeNull();
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

  it('момент финиша переживает сохранение', () => {
    const done: Draft = { ...draft, finishedAt: NOW - 500 };
    expect(parseDraft(serializeDraft(done), NOW)?.finishedAt).toBe(NOW - 500);
  });

  it('без финиша поля нет, нечисловой финиш — null', () => {
    expect('finishedAt' in parseDraft(serializeDraft(draft), NOW)!).toBe(false);
    expect(parseDraft(JSON.stringify({ ...draft, finishedAt: 'вчера' }), NOW)).toBeNull();
  });

  it('без времени начала — null', () => {
    expect(parseDraft(JSON.stringify({ session: draft.session, updatedAt: NOW }), NOW)).toBeNull();
  });
});

describe('черновик на обратной связи', () => {
  const feedback: Draft = {
    session: { ...draft.session, phase: 'feedback', feeling: 4, comment: 'колено' },
    startedAt: NOW - 90_000_000,
    finishedAt: NOW - 86_400_000,
    submitKey: 'a0b1c2d3-0000-4000-8000-000000000001',
    updatedAt: NOW - 86_400_000,
  };

  it('срок 12 часов к нему не применяется: через сутки и через месяц он жив', () => {
    expect(parseDraft(serializeDraft(feedback), NOW)).toEqual(feedback);
    expect(parseDraft(serializeDraft({ ...feedback, updatedAt: NOW - 30 * 86_400_000 }), NOW)).not.toBeNull();
  });

  it('на итогах срок по-прежнему 12 часов', () => {
    const summary = { ...feedback, session: { ...feedback.session, phase: 'finish' as const }, updatedAt: NOW - DRAFT_TTL_MS - 1 };
    expect(parseDraft(serializeDraft(summary), NOW)).toBeNull();
  });

  it('оценка, комментарий и ключ отправки переживают перезагрузку', () => {
    const parsed = parseDraft(serializeDraft(feedback), NOW)!;
    expect(parsed.session).toMatchObject({ feeling: 4, comment: 'колено' });
    expect(parsed.submitKey).toBe(feedback.submitKey);
  });

  it('старый черновик без самочувствия и ключа читается: оценки нет, комментарий пуст', () => {
    const { feeling: _f, comment: _c, ...old } = draft.session;
    const parsed = parseDraft(JSON.stringify({ ...draft, session: old }), NOW)!;
    expect(parsed.session).toMatchObject({ feeling: null, comment: '' });
    expect('submitKey' in parsed).toBe(false);
  });

  it('кривые оценка, комментарий и ключ — null', () => {
    const bad = (patch: object, top: object = {}) => parseDraft(JSON.stringify({ ...feedback, ...top, session: { ...feedback.session, ...patch } }), NOW);
    expect(bad({ feeling: 6 })).toBeNull();
    expect(bad({ feeling: 2.5 })).toBeNull();
    expect(bad({ feeling: 'хорошо' })).toBeNull();
    expect(bad({ comment: 5 })).toBeNull();
    expect(bad({}, { submitKey: 7 })).toBeNull();
  });
});
