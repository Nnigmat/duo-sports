import { describe, expect, it } from 'vitest';
import type { AgentWorkout, DraftRequest, DraftResponse } from '../../../../shared/aiDraft';
import { buildWorkout } from './build';
import { agent, ctx } from './testkit';
import { canBuild, EMPTY_INPUT, toRequest, type BuilderInput } from './types';

const req: DraftRequest = { athleteId: 3, date: '2026-11-18', title: '', warmup: null, main: { text: 'жим', exercises: [] }, cooldown: null };
const usage = { input: 1, cacheCreation: 0, cacheRead: 0, output: 1 };
const bad = agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-pres', do: '4x8 @ 60' }] }] });

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

  it('passes send errors through', async () => {
    const send = async (): Promise<DraftResponse> => {
      throw new Error('Сборка недоступна');
    };
    await expect(buildWorkout(req, ctx, [], send)).rejects.toThrow('Сборка недоступна');
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
