import { describe, expect, it } from 'vitest';
import { DRAFT_TEXT_MAX, type AgentWorkout, type DraftRequest, type DraftResponse } from '../../../../shared/aiDraft';
import { buildWorkout } from './build';
import { agent, ctx } from './testkit';
import { canBuild, EMPTY_INPUT, toRequest, type BuilderInput } from './types';

const req: DraftRequest = { athleteId: 3, date: '2026-11-18', title: '', warmup: null, main: { text: 'жим', exercises: [] }, cooldown: null };
const usage = { input: 1, cacheCreation: 0, cacheRead: 0, output: 1 };
const bad = agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-pres', sets: 4, reps: '8', weight_kg: 60 }] }] });

/** Подделка send: отдаёт ответы по очереди и запоминает запросы */
function fakeSend(...answers: AgentWorkout[]) {
  const calls: DraftRequest[] = [];
  const send = async (r: DraftRequest): Promise<DraftResponse> => {
    calls.push(r);
    return { workout: answers[Math.min(calls.length - 1, answers.length - 1)]!, usage };
  };
  return { send, calls };
}

describe('buildWorkout', () => {
  it('returns draft on first good answer', async () => {
    const f = fakeSend(agent());
    const r = await buildWorkout(req, ctx, [], f.send);
    expect(r.ok).toBe(true);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toEqual(req);
  });

  it('retries once with parse errors', async () => {
    const f = fakeSend(bad, agent());
    const r = await buildWorkout(req, ctx, [], f.send);
    expect(r.ok).toBe(true);
    expect(f.calls).toHaveLength(2);
    expect(f.calls[1]!.errors!.join('\n')).toContain('bench-pres');
  });

  it('gives up after second failure', async () => {
    const f = fakeSend(bad, bad);
    const r = await buildWorkout(req, ctx, [], f.send);
    expect(f.calls).toHaveLength(2);
    if (r.ok) throw new Error('ожидали ошибку');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('sends at most 50 errors of at most 2000 chars on retry', async () => {
    const blocks = Array.from({ length: 60 }, (_, i) => ({ type: 'sets' as const, exercises: [{ exercise_id: `unknown-${i}`, sets: 3, reps: '10' }] }));
    blocks.unshift({ type: 'sets', exercises: [{ exercise_id: 'x'.repeat(2500), sets: 3, reps: '10' }] });
    const many = agent({ blocks });
    const f = fakeSend(many, many);
    const r = await buildWorkout(req, ctx, [], f.send);
    if (r.ok) throw new Error('ожидали ошибку');
    // Разбор действительно дал больше 50 ошибок, и одна из них длиннее предела
    expect(r.errors.length).toBeGreaterThan(50);
    expect(r.errors.some((e) => e.message.length > DRAFT_TEXT_MAX)).toBe(true);
    const sent = f.calls[1]!.errors!;
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.length).toBeLessThanOrEqual(50);
    for (const e of sent) expect(e.length).toBeLessThanOrEqual(DRAFT_TEXT_MAX);
  });

  it('passes send errors through', async () => {
    const send = async (): Promise<DraftResponse> => {
      throw new Error('Сборка недоступна');
    };
    await expect(buildWorkout(req, ctx, [], send)).rejects.toThrow('Сборка недоступна');
  });
});

describe('разминка и заминка: выбор тренера важнее ответа агента', () => {
  const neck = { id: 'neck-roll', name: 'Наклоны головы', muscles: [], measure: 'time' as const, equipment: [], aliases: [] };
  const fresh = (id: string) => ({ new_routine: { id, title: 'Своя', exercises: [{ exercise_id: 'neck-roll', time_sec: 30 }] } });
  const draftOf = async (ask: Partial<DraftRequest>, answer: AgentWorkout) => {
    const r = await buildWorkout({ ...req, ...ask }, ctx, [], fakeSend(answer).send);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    return r.draft;
  };

  it('library choice wins over new routine and null', async () => {
    const d = await draftOf(
      { warmup: { routine: 'neck-shoulders' }, cooldown: { routine: 'back-stretch' } },
      agent({ new_exercises: [neck], warmup: fresh('my-warm'), cooldown: null }),
    );
    expect(d.warmup).toEqual({ kind: 'library', slug: 'neck-shoulders' });
    expect(d.cooldown).toEqual({ kind: 'library', slug: 'back-stretch' });
    // Упражнение только из выброшенной разминки не остаётся невидимым новым
    expect(d.newExercises).toEqual([]);
  });

  it('«Без разминки» wins over any answer', async () => {
    const d = await draftOf({ warmup: null, cooldown: null }, agent({ new_exercises: [neck], warmup: { routine: 'neck-shoulders' }, cooldown: fresh('my-cool') }));
    expect(d.warmup).toEqual({ kind: 'none' });
    expect(d.cooldown).toEqual({ kind: 'none' });
    expect(d.newExercises).toEqual([]);
  });

  it('own text takes the answer', async () => {
    const d = await draftOf({ warmup: { text: 'шея' }, cooldown: { text: 'спина' } }, agent({ new_exercises: [neck], warmup: fresh('my-warm'), cooldown: { routine: 'back-stretch' } }));
    expect(d.warmup).toMatchObject({ kind: 'new', items: [{ name: 'Наклоны головы', sec: 30 }] });
    expect(d.cooldown).toEqual({ kind: 'library', slug: 'back-stretch' });
    expect(d.newExercises.map((e) => e.name)).toEqual(['Наклоны головы']);
  });
});

describe('ввод', () => {
  const input = (over: Partial<BuilderInput>): BuilderInput => ({ ...EMPTY_INPUT, ...over });

  it('canBuild is false for empty input', () => {
    expect(canBuild(EMPTY_INPUT)).toBe(false);
    expect(canBuild(input({ main: { text: '   ', picked: [] } }))).toBe(false);
    // Разминка без основной части — не тренировка
    expect(canBuild(input({ warmup: { kind: 'text', text: 'суставная' } }))).toBe(false);
  });

  it('canBuild is true with only picked exercises', () => {
    expect(canBuild(input({ main: { text: '', picked: ['bench-press'] } }))).toBe(true);
  });

  it('canBuild is false with blank own warmup or text over the limit', () => {
    expect(canBuild(input({ main: { text: 'жим', picked: [] }, warmup: { kind: 'text', text: ' ' } }))).toBe(false);
    expect(canBuild(input({ main: { text: 'а'.repeat(2001), picked: [] } }))).toBe(false);
  });

  it('toRequest maps choices', () => {
    const r = toRequest(
      { title: ' Верх ', warmup: { kind: 'library', slug: 'neck-shoulders' }, main: { text: 'жим', picked: ['dips'] }, cooldown: { kind: 'text', text: 'растяжка' } },
      '2026-11-18',
      null,
    );
    expect(r).toEqual({ athleteId: null, date: '2026-11-18', title: 'Верх', warmup: { routine: 'neck-shoulders' }, main: { text: 'жим', exercises: ['dips'] }, cooldown: { text: 'растяжка' } });
    expect(toRequest(EMPTY_INPUT, '2026-11-18', 4).warmup).toBeNull();
  });
});
