import { describe, expect, it } from 'vitest';
import { AGENT_WORKOUT_SCHEMA, isAgentWorkout, type AgentWorkout } from './aiDraft';

type Node = Record<string, unknown>;

/** Обходит все подсхемы: properties, items, anyOf, $defs */
function walk(node: unknown, visit: (n: Node) => void) {
  if (!node || typeof node !== 'object') return;
  const n = node as Node;
  visit(n);
  for (const key of ['properties', '$defs'] as const) {
    const group = n[key] as Record<string, unknown> | undefined;
    if (group) for (const child of Object.values(group)) walk(child, visit);
  }
  if (n.items) walk(n.items, visit);
  if (Array.isArray(n.anyOf)) for (const child of n.anyOf) walk(child, visit);
}

const objects = () => {
  const out: Node[] = [];
  walk(AGENT_WORKOUT_SCHEMA, (n) => {
    if (n.type === 'object') out.push(n);
  });
  return out;
};

const minimal: AgentWorkout = { title: 'Верх', warmup: null, cooldown: null, blocks: [], new_exercises: [], advice: [] };

describe('схема ответа агента', () => {
  it('every object closes additionalProperties and requires only its own keys', () => {
    const list = objects();
    expect(list.length).toBeGreaterThan(5);
    for (const o of list) {
      expect(o.additionalProperties).toBe(false);
      const keys = Object.keys(o.properties as Node);
      for (const r of o.required as string[]) expect(keys).toContain(r);
    }
  });

  it('top level requires every structural key', () => {
    expect(new Set(AGENT_WORKOUT_SCHEMA.required as string[])).toEqual(new Set(['title', 'warmup', 'cooldown', 'blocks', 'new_exercises', 'advice']));
  });

  // Лимиты строгого режима: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
  it('stays within strict-mode limits: ≤ 24 optional and ≤ 16 union-typed params', () => {
    let optional = 0;
    let unions = 0;
    walk(AGENT_WORKOUT_SCHEMA, (n) => {
      if (n.type === 'object') optional += Object.keys(n.properties as Node).length - (n.required as string[]).length;
      if (Array.isArray(n.anyOf) || Array.isArray(n.type)) unions++;
    });
    expect(optional).toBeLessThanOrEqual(24);
    expect(unions).toBeLessThanOrEqual(16);
  });

  it('uses no keywords outside the supported subset', () => {
    const banned = ['minimum', 'maximum', 'minLength', 'maxLength', 'multipleOf', 'pattern', 'oneOf'];
    walk(AGENT_WORKOUT_SCHEMA, (n) => {
      for (const b of banned) expect(n).not.toHaveProperty(b);
      if ('minItems' in n) expect([0, 1]).toContain(n.minItems);
    });
  });
});

describe('isAgentWorkout', () => {
  it('accepts minimal workout', () => {
    expect(isAgentWorkout(minimal)).toBe(true);
  });

  it('accepts library and new routines', () => {
    const w: AgentWorkout = {
      ...minimal,
      warmup: { routine: 'neck-shoulders' },
      cooldown: { new_routine: { id: 'my-cool', title: 'Растяжка', exercises: [{ exercise_id: 'forward-bend', time: '30s', per_side: true, sides: ['вправо', 'влево'] }] } },
      blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', do: '4x8 @ 60' }] }],
      new_exercises: [{ id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: ['грудь'], measure: 'reps', equipment: [], aliases: [] }],
      advice: [{ text: 'Есть похожее', exercise: 'Отжимания с хлопком', suggest: 'pushup' }],
    };
    expect(isAgentWorkout(w)).toBe(true);
  });

  it('rejects missing blocks', () => {
    const { blocks: _blocks, ...rest } = minimal;
    expect(isAgentWorkout(rest)).toBe(false);
  });

  it('rejects wrong shapes', () => {
    expect(isAgentWorkout(null)).toBe(false);
    expect(isAgentWorkout({ ...minimal, title: 5 })).toBe(false);
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'yoga', exercises: [] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, warmup: { routine: 5 } })).toBe(false);
    expect(isAgentWorkout({ ...minimal, new_exercises: [{ id: 'x', name: 'X', muscles: [], measure: 'kg', equipment: [], aliases: [] }] })).toBe(false);
  });

  it('rejects exercise without exercise_id and name', () => {
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ do: '3x12' }] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ name: 'Жим лёжа', do: '3x12' }] }] })).toBe(true);
  });

  it('rejects empty exercise lists, as schema minItems: 1', () => {
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, warmup: { new_routine: { id: 'empty', title: 'Пусто', exercises: [] } } })).toBe(false);
  });
});
