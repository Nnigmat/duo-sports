import { describe, expect, it } from 'vitest';
import { AGENT_WORKOUT_SCHEMA } from '../shared/aiDraft';
import { AGENT_FORMAT, AGENT_INSTRUCTIONS } from './aiInstructions';

/** Имена всех полей схемы, на любой глубине */
function fieldNames(schema: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(schema)) for (const s of schema) fieldNames(s, out);
  else if (typeof schema === 'object' && schema !== null) {
    const o = schema as Record<string, unknown>;
    if (typeof o.properties === 'object' && o.properties !== null) for (const k of Object.keys(o.properties)) out.add(k);
    for (const v of Object.values(o)) fieldNames(v, out);
  }
  return out;
}
const word = (name: string) => new RegExp(`(^|[^\\w])${name}([^\\w]|$)`);

describe('agent instructions', () => {
  it('mention every schema field', () => {
    const names = [...fieldNames(AGENT_WORKOUT_SCHEMA)];
    expect(names).toContain('time_sec');
    for (const name of names) expect(AGENT_FORMAT, name).toMatch(word(name));
  });

  it('have sides examples', () => {
    for (const text of [AGENT_FORMAT, AGENT_INSTRUCTIONS]) {
      expect(text).toContain('[влево, вправо]');
      expect(text).toContain('[левая нога, правая нога]');
    }
  });

  it('have no v1 fields', () => {
    const all = `${AGENT_INSTRUCTIONS}\n${AGENT_FORMAT}`;
    expect(all).not.toMatch(word('do'));
    expect(all).not.toContain('per_side');
    expect(all).not.toContain('"4x8 @ 60"');
    expect(all).not.toMatch(word('superset'));
  });

  it('state placement and empty-value rules', () => {
    for (const rule of ['только в блоке sets', 'только в circuit', 'только у блоков timed и note', '0 для чисел, "" для строк, [] для списков', 'после круга', '180']) {
      expect(AGENT_INSTRUCTIONS).toContain(rule);
    }
    for (const text of ['≈', 'В разминке упражнения только на время:', 'Взял за основу']) expect(AGENT_INSTRUCTIONS.replace('примерно', '≈')).toContain(text);
  });
});
