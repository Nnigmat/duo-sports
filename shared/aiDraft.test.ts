import { describe, expect, it } from 'vitest';
import { AGENT_WORKOUT_SCHEMA, compactAgentWorkout, isAgentWorkout, type AgentWorkout } from './aiDraft';

type Node = Record<string, unknown>;

/** Обходит все подсхемы: properties, items, anyOf, $defs; path — ключи до подсхемы */
function walk(node: unknown, visit: (n: Node, path: string) => void, path = '') {
  if (!node || typeof node !== 'object') return;
  const n = node as Node;
  visit(n, path);
  for (const key of ['properties', '$defs'] as const) {
    const group = n[key] as Record<string, unknown> | undefined;
    if (group) for (const [name, child] of Object.entries(group)) walk(child, visit, path ? `${path}.${name}` : name);
  }
  if (n.items) walk(n.items, visit, `${path}[]`);
  if (Array.isArray(n.anyOf)) n.anyOf.forEach((child, i) => walk(child, visit, `${path}|${i}`));
}

const prop = (n: Node, key: string) => (n.properties as Node)[key] as Node;
const requiresAll = (n: Node) => expect(new Set(n.required as string[])).toEqual(new Set(Object.keys(n.properties as Node)));
const blockSchema = () => prop(AGENT_WORKOUT_SCHEMA, 'blocks').items as Node;
const routineItemSchema = () => {
  const own = (prop(AGENT_WORKOUT_SCHEMA, 'warmup').anyOf as Node[]).find((o) => (o.properties as Node | undefined)?.new_routine) as Node;
  return prop(prop(own, 'new_routine'), 'exercises').items as Node;
};

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
    expect(new Set(AGENT_WORKOUT_SCHEMA.required as string[])).toEqual(new Set(['title', 'notes', 'warmup', 'cooldown', 'blocks', 'new_exercises', 'advice']));
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

  // Сверх опубликованных лимитов: каждое необязательное поле объекта удваивает его грамматику.
  // Упражнение с 10 необязательными полями — 400 «Schema is too complex» через 2,5 минуты (проверено 2026-11-17).
  it('keeps at most 3 optional properties per object', () => {
    for (const o of objects()) expect(Object.keys(o.properties as Node).length - (o.required as string[]).length).toBeLessThanOrEqual(3);
  });

  it('time_sec of block exercise is the only union besides warmup and cooldown', () => {
    const paths: string[] = [];
    walk(AGENT_WORKOUT_SCHEMA, (n, path) => {
      if (Array.isArray(n.anyOf) || Array.isArray(n.type)) paths.push(path);
    });
    expect(new Set(paths)).toEqual(new Set(['warmup', 'cooldown', 'blocks[].exercises[].time_sec']));
  });

  it('block exercise follows v2 and requires every field: empty is "", 0 or []', () => {
    const item = prop(blockSchema(), 'exercises').items as Node;
    expect(new Set(Object.keys(item.properties as Node))).toEqual(new Set(['exercise_id', 'sets', 'reps', 'time_sec', 'weight_kg', 'rest_sec', 'sides', 'notes']));
    requiresAll(item);
    expect(prop(item, 'time_sec').anyOf).toEqual([{ type: 'integer' }, { type: 'string', enum: ['max'] }]);
  });

  it('block requires every field and allows empty exercises for note', () => {
    const block = blockSchema();
    expect(new Set(Object.keys(block.properties as Node))).toEqual(new Set(['type', 'title', 'rounds', 'rest_sec', 'rest_after', 'text', 'exercises']));
    requiresAll(block);
    expect(prop(block, 'type').enum).toEqual(['sets', 'circuit', 'timed', 'note']);
    expect(prop(block, 'rest_after').enum).toEqual(['round', 'exercise']);
    expect(prop(block, 'exercises')).not.toHaveProperty('minItems');
  });

  it('routine item requires exercise_id, integer time_sec and sides', () => {
    const item = routineItemSchema();
    expect(new Set(Object.keys(item.properties as Node))).toEqual(new Set(['exercise_id', 'time_sec', 'sides']));
    requiresAll(item);
    expect(prop(item, 'time_sec').type).toBe('integer');
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
      cooldown: { new_routine: { id: 'my-cool', title: 'Растяжка', exercises: [{ exercise_id: 'forward-bend', time_sec: 30, sides: ['вправо', 'влево'] }] } },
      blocks: [
        { type: 'sets', exercises: [{ exercise_id: 'bench-press', sets: 4, reps: '8', weight_kg: 60, rest_sec: 180, notes: 'Пауза внизу' }] },
        { type: 'circuit', rounds: 2, rest_sec: 90, exercises: [{ exercise_id: 'dead-hang', time_sec: 'max' }, { exercise_id: 'lunge', reps: '10', sides: ['левая нога', 'правая нога'] }] },
      ],
      new_exercises: [{ id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: ['грудь'], measure: 'reps', equipment: [], aliases: [] }],
      advice: [{ text: 'Есть похожее', exercise: 'Отжимания с хлопком', suggest: 'pushup' }],
    };
    expect(isAgentWorkout(w)).toBe(true);
  });

  it('accepts note block with empty exercises', () => {
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'note', title: 'Тест большого пальца', text: 'Есть ли боль', exercises: [] }] })).toBe(true);
  });

  it('rejects missing blocks', () => {
    const { blocks: _blocks, ...rest } = minimal;
    expect(isAgentWorkout(rest)).toBe(false);
  });

  it('rejects wrong shapes', () => {
    expect(isAgentWorkout(null)).toBe(false);
    expect(isAgentWorkout({ ...minimal, title: 5 })).toBe(false);
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'yoga', exercises: [] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'superset', exercises: [] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ exercise_id: 'plank', time_sec: 'long' }] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ exercise_id: 'plank', sides: 'обе' }] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, warmup: { routine: 5 } })).toBe(false);
    expect(isAgentWorkout({ ...minimal, warmup: { new_routine: { id: 'w', title: 'W', exercises: [{ exercise_id: 'x', time: '30s' }] } } })).toBe(false);
    expect(isAgentWorkout({ ...minimal, new_exercises: [{ id: 'x', name: 'X', muscles: [], measure: 'kg', equipment: [], aliases: [] }] })).toBe(false);
  });

  it('rejects exercise without exercise_id: v2 has no search by name', () => {
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ reps: '12' }] }] })).toBe(false);
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ name: 'Жим лёжа', reps: '12' }] }] })).toBe(false);
  });

  it('rejects empty new routine, as schema minItems: 1', () => {
    expect(isAgentWorkout({ ...minimal, warmup: { new_routine: { id: 'empty', title: 'Пусто', exercises: [] } } })).toBe(false);
  });
});

describe('compactAgentWorkout', () => {
  const full = { exercise_id: 'bench-press', sets: 0, reps: '', time_sec: 0, weight_kg: 0, rest_sec: 0, sides: [], notes: '  ' };

  it('drops rest_after round and keeps rest_after exercise', () => {
    const ex = { exercise_id: 'lunge', reps: '10' };
    const w = compactAgentWorkout({
      ...minimal,
      blocks: [
        { type: 'circuit', rounds: 3, rest_sec: 60, rest_after: 'round', exercises: [ex] },
        { type: 'circuit', rounds: 3, rest_sec: 60, rest_after: 'exercise', exercises: [ex] },
      ],
    });
    expect(w).toMatchObject({ blocks: [{ type: 'circuit', rounds: 3, rest_sec: 60, exercises: [ex] }, { rest_after: 'exercise' }] });
    expect((w as { blocks: object[] }).blocks[0]).not.toHaveProperty('rest_after');
    expect(isAgentWorkout(w)).toBe(true);
  });

  it('rejects unknown rest_after', () => {
    expect(isAgentWorkout({ ...minimal, blocks: [{ type: 'circuit', rest_after: 'set', exercises: [] }] })).toBe(false);
  });

  it('drops empty fields of block exercises: "", blank, 0, []', () => {
    const w = compactAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ ...full, reps: '8' }] }] });
    expect(w).toEqual({ ...minimal, blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', reps: '8' }] }] });
    expect(isAgentWorkout(w)).toBe(true);
  });

  it('compact drops empty time_sec, weight_kg, rest_sec, sides, notes, text', () => {
    const w = compactAgentWorkout({
      ...minimal,
      notes: '',
      blocks: [
        { type: 'sets', title: '', rounds: 0, rest_sec: 0, text: '', exercises: [full] },
        { type: 'note', title: 'Замер', rounds: 0, rest_sec: 0, text: ' ', exercises: [] },
      ],
      warmup: { new_routine: { id: 'my-warm', title: 'Своя', exercises: [{ exercise_id: 'arm-circles', time_sec: 30, sides: [] }] } },
    });
    expect(w).toEqual({
      ...minimal,
      blocks: [
        { type: 'sets', exercises: [{ exercise_id: 'bench-press' }] },
        { type: 'note', title: 'Замер', exercises: [] },
      ],
      warmup: { new_routine: { id: 'my-warm', title: 'Своя', exercises: [{ exercise_id: 'arm-circles', time_sec: 30 }] } },
    });
  });

  it('keeps filled values', () => {
    const e = { exercise_id: 'plank', sets: 3, time_sec: 'max', rest_sec: 60, sides: ['влево', 'вправо'], notes: 'Корпус прямой' };
    const b = { type: 'circuit', title: 'Кор', rounds: 2, rest_sec: 90, exercises: [e] };
    expect(compactAgentWorkout({ ...minimal, notes: 'Легко', blocks: [b] })).toEqual({ ...minimal, notes: 'Легко', blocks: [b] });
  });

  it('keeps required routine item time_sec even when 0: parse names the error', () => {
    const warmup = { new_routine: { id: 'w', title: 'W', exercises: [{ exercise_id: 'arm-circles', time_sec: 0, sides: [] }] } };
    expect(compactAgentWorkout({ ...minimal, warmup })).toEqual({ ...minimal, warmup: { new_routine: { id: 'w', title: 'W', exercises: [{ exercise_id: 'arm-circles', time_sec: 0 }] } } });
  });

  it('drops empty optional fields of advice', () => {
    const w = compactAgentWorkout({ ...minimal, advice: [{ text: 'Есть похожее', exercise: '', suggest: '' }] });
    expect(w).toEqual({ ...minimal, advice: [{ text: 'Есть похожее' }] });
  });

  it('keeps required fields even when empty: title, new exercise lists', () => {
    const ne = { id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: [], measure: 'reps', equipment: [], aliases: [] };
    expect(compactAgentWorkout({ ...minimal, title: '', new_exercises: [{ ...ne, notes: '' }] })).toEqual({ ...minimal, title: '', new_exercises: [ne] });
  });

  it('exercise without id stays invalid', () => {
    const w = compactAgentWorkout({ ...minimal, blocks: [{ type: 'sets', exercises: [{ ...full, exercise_id: '' }] }] });
    expect(isAgentWorkout(w)).toBe(false);
  });

  it('leaves other shapes for isAgentWorkout to reject', () => {
    for (const v of [null, 5, 'x', { title: 'Без блоков' }, { ...minimal, blocks: 'нет' }, { ...minimal, blocks: [null, { type: 'sets' }] }, { ...minimal, warmup: { new_routine: 'нет' } }]) {
      expect(compactAgentWorkout(v)).toEqual(v);
    }
  });
});
